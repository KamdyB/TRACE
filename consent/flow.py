"""
consent/flow.py

The consent state machine. Owns exactly one job: turning a grant request
into a Contract 1 object, checking validity, and turning a revoke request
into a Contract 4 object.

Does NOT do: scoring, fraud detection, ledger writing, or API routing.
Those are separate modules by design — see the roles doc. This module can
be swapped for a different implementation without breaking scoring, the
ledger, or the frontend, as long as it keeps producing the same contract
shapes. That's the test.
"""

import random
import string
from datetime import datetime, timedelta, timezone

from schemas.contracts import (
    AccessCutoff,
    ConsentGrant,
    ConsentStatus,
    RequestingParty,
    RequestingPartyType,
    RevocationEvent,
    RevokedBy,
)


def _generate_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}_{suffix}"


def grant_consent(
    user_id: str,
    requesting_party_id: str,
    requesting_party_name: str,
    lookback_window_days: int = 180,
    duration_days: int = 30,
) -> ConsentGrant:
    """Creates a new Consent Grant (Contract 1) with status ACTIVE.

    This is the only function that produces a valid grant. No other module
    should construct a ConsentGrant directly.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=duration_days)

    return ConsentGrant(
        consent_id=_generate_id("consent"),
        user_id=user_id,
        granted_at=now.isoformat(),
        expires_at=expires.isoformat(),
        scope=["TRANSACTION_HISTORY"],
        requesting_party=RequestingParty(
            type=RequestingPartyType.LENDER,
            id=requesting_party_id,
            name=requesting_party_name,
        ),
        status=ConsentStatus.ACTIVE,
        lookback_window_days=lookback_window_days,
    )


def is_consent_valid(consent: ConsentGrant) -> bool:
    """The core invariant check: status == ACTIVE AND now < expires_at.

    This is a thin wrapper around ConsentGrant.is_valid_now() so callers
    (the API layer, tests) have one obvious place to call this from,
    without needing to know it's a method on the dataclass.
    """
    return consent.is_valid_now()


def expire_if_needed(consent: ConsentGrant) -> ConsentGrant:
    """Explicit state transition: if a still-ACTIVE consent's window has
    passed, flip it to EXPIRED. Never leave it silently ACTIVE-but-stale —
    per the 'no silent failure' rule, every state change must be explicit.

    Returns the same object, mutated. Does not touch REVOKED consents.
    """
    if consent.status == ConsentStatus.ACTIVE and not consent.is_valid_now():
        consent.status = ConsentStatus.EXPIRED
    return consent


def revoke_consent(consent: ConsentGrant) -> RevocationEvent:
    """Revokes an active consent and returns the Revocation Event (Contract 4).

    Mutates the passed-in consent's status to REVOKED. Raises if the
    consent isn't currently ACTIVE — you can't revoke what was never
    granted, or what's already revoked/expired. Fail loudly, not silently.
    """
    if consent.status != ConsentStatus.ACTIVE:
        raise ValueError(
            f"Cannot revoke a consent with status {consent.status} — "
            "only ACTIVE consents can be revoked."
        )

    consent.status = ConsentStatus.REVOKED
    now = datetime.now(timezone.utc)

    return RevocationEvent(
        consent_id=consent.consent_id,
        revoked_at=now.isoformat(),
        revoked_by=RevokedBy.USER,
        access_cutoff=AccessCutoff.IMMEDIATE,
        # existing_data_note uses the dataclass default — fixed wording,
        # never overridden or softened here.
    )


if __name__ == "__main__":
    # Quick manual smoke test — not a substitute for real tests in tests/,
    # just confirms the happy path produces valid contract shapes.
    grant = grant_consent(
        user_id="user_demo01",
        requesting_party_id="lender_sim_mfb01",
        requesting_party_name="Simulated MFB Partner",
    )
    print("Granted:", grant)
    print("Valid now:", is_consent_valid(grant))

    revocation = revoke_consent(grant)
    print("Revoked:", revocation)
    print("Grant status after revoke:", grant.status)
    print("Valid after revoke:", is_consent_valid(grant))