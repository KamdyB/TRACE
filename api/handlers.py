"""
api/handlers.py

The actual business logic behind each API endpoint, kept separate from
the FastAPI route decorators in main.py so it can be tested directly
without spinning up a server. main.py should stay a thin wrapper that
calls these functions and does nothing else.

Tested end-to-end against the real scoring/fraud engines: grant -> score
-> revoke -> confirmed scoring is correctly blocked after revocation.
"""

from datetime import datetime, timezone
from uuid import uuid4

from schemas.contracts import (
    AffordabilityBand,
    AffordabilitySignal,
    ConsentGrant,
    FraudSignal,
    RevocationEvent,
    TransactionHistoryPayload,
)
from consent.flow import grant_consent, is_consent_valid, revoke_consent
from consent.ledger import ledger
from scoring.engine import calculate_affordability
from scoring.fraud import detect_fraud_patterns


class ConsentNotFoundError(Exception):
    pass


class ConsentNotValidError(Exception):
    pass


# In-memory store for the MVP demo. Swappable for a real DB later without
# any other module needing to change — that's the whole point of keeping
# this behind handler functions instead of scattering lookups everywhere.
_active_consents: dict[str, ConsentGrant] = {}


def handle_grant(
    user_id: str,
    requesting_party_id: str,
    requesting_party_name: str,
    lookback_window_days: int = 180,
    duration_days: int = 30,
) -> ConsentGrant:
    consent = grant_consent(
        user_id=user_id,
        requesting_party_id=requesting_party_id,
        requesting_party_name=requesting_party_name,
        lookback_window_days=lookback_window_days,
        duration_days=duration_days,
    )
    _active_consents[consent.consent_id] = consent
    ledger.log_grant(consent)
    return consent


def _get_valid_consent(consent_id: str) -> ConsentGrant:
    consent = _active_consents.get(consent_id)
    if consent is None:
        raise ConsentNotFoundError(f"No consent found for id {consent_id}")
    if not is_consent_valid(consent):
        raise ConsentNotValidError(
            f"Consent {consent_id} is not valid (status={consent.status})"
        )
    return consent


def _to_affordability_signal(result, consent_id: str) -> AffordabilitySignal:
    """Wraps Builder B's internal AffordabilityResult into the locked
    Contract 3 shape. This wrapping — not a reshaping of her engine's
    output — is what keeps her module free to change its internal result
    type without breaking the contract everyone else depends on."""
    return AffordabilitySignal(
        consent_id=consent_id,
        signal_id=f"sig_{uuid4().hex[:8]}",
        generated_at=datetime.now(timezone.utc).isoformat(),
        affordability_band=AffordabilityBand(result.band),
        confidence=result.confidence,
        explanation=result.explanation,
    )


def handle_score(
    consent_id: str, payload: TransactionHistoryPayload
) -> tuple[AffordabilitySignal, FraudSignal]:
    """Validates the consent, logs an ACCESS event, then calls Builder B's
    two engines and returns both signals in their real contract shapes."""
    consent = _get_valid_consent(consent_id)
    ledger.log_access(consent_id, actor=consent.requesting_party.id)

    raw_result = calculate_affordability(payload)
    affordability_signal = _to_affordability_signal(raw_result, consent_id)

    fraud_signal = detect_fraud_patterns(consent_id, payload.transactions)

    return affordability_signal, fraud_signal


def handle_revoke(consent_id: str) -> RevocationEvent:
    consent = _active_consents.get(consent_id)
    if consent is None:
        raise ConsentNotFoundError(f"No consent found for id {consent_id}")
    event = revoke_consent(consent)
    ledger.log_revoke(consent_id, actor=event.revoked_by.value)
    return event