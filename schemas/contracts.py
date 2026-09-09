"""
schemas/contracts.py

The single source of truth for every data shape that crosses a module
boundary in TRACE. No other module invents or renames a field — if a shape
needs to change, it changes here first, reviewed by both builders, per
Francis's Rule.

Confirmed against the real Contracts doc (ProveIt_Full_Package):
  - Contract 1: Consent Grant
  - Contract 2: Transaction History Payload
  - Contract 3: Affordability Signal
  - Contract 4: Revocation Event
  - Contract 5: Fraud Signal (PROPOSED — not yet signed off by the full team;
    included here so both builders develop against the same shape while
    it's under review, not because it's finalized)
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List


# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------

class ConsentStatus(str, Enum):
    """The only three valid values. Never inferred from a missing record —
    always an explicit field. (Earlier drafts disagreed between ACTIVE and
    GRANTED; ACTIVE is confirmed correct against the real Contracts doc.)"""
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class RequestingPartyType(str, Enum):
    LENDER = "LENDER"


class TransactionType(str, Enum):
    INFLOW = "INFLOW"
    OUTFLOW = "OUTFLOW"


class IncomeSeasonalityFlag(str, Enum):
    SALARIED = "SALARIED"
    SEASONAL_TRADER = "SEASONAL_TRADER"
    GIG_IRREGULAR = "GIG_IRREGULAR"
    UNCLASSIFIED = "UNCLASSIFIED"


class AffordabilityBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FraudRiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RevokedBy(str, Enum):
    USER = "USER"


class AccessCutoff(str, Enum):
    IMMEDIATE = "IMMEDIATE"


class LedgerEventType(str, Enum):
    """Every ledger entry is one of exactly these three. No exceptions."""
    GRANT = "GRANT"
    ACCESS = "ACCESS"
    REVOKE = "REVOKE"


# ---------------------------------------------------------------------------
# Contract 1 — Consent Grant
# ---------------------------------------------------------------------------

@dataclass
class RequestingParty:
    type: RequestingPartyType
    id: str
    name: str


@dataclass
class ConsentGrant:
    consent_id: str
    user_id: str
    granted_at: str          # ISO 8601 timestamp
    expires_at: str          # ISO 8601 timestamp
    scope: List[str]         # MVP: always ["TRANSACTION_HISTORY"]
    requesting_party: RequestingParty
    status: ConsentStatus
    lookback_window_days: int

    def is_valid_now(self) -> bool:
        """The core invariant, per the roles doc: status == ACTIVE AND
        now < expires_at. Enforced here, and only here — no other module
        re-implements this check."""
        if self.status != ConsentStatus.ACTIVE:
            return False
        expires = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
        now = datetime.now(expires.tzinfo)
        return now < expires


# ---------------------------------------------------------------------------
# Contract 2 — Transaction History Payload
# ---------------------------------------------------------------------------

@dataclass
class Transaction:
    txn_id: str
    date: str                # YYYY-MM-DD
    type: TransactionType
    amount: float
    category: str
    recurring_pattern_score: float  # 0.0-1.0


@dataclass
class TransactionHistoryPayload:
    consent_id: str
    account_ref: str
    period_start: str        # YYYY-MM-DD
    period_end: str          # YYYY-MM-DD
    transactions: List[Transaction]
    income_seasonality_flag: IncomeSeasonalityFlag


# ---------------------------------------------------------------------------
# Contract 3 — Affordability Signal
# ---------------------------------------------------------------------------

@dataclass
class AffordabilitySignal:
    consent_id: str
    signal_id: str
    generated_at: str        # ISO 8601 timestamp
    affordability_band: AffordabilityBand
    confidence: float        # 0.0-1.0
    explanation: List[str]   # 2-4 plain-language strings, traceable to real logic
    is_lending_decision: bool = False  # MUST always be False — not optional


# ---------------------------------------------------------------------------
# Contract 4 — Revocation Event
# ---------------------------------------------------------------------------

@dataclass
class RevocationEvent:
    consent_id: str
    revoked_at: str           # ISO 8601 timestamp
    revoked_by: RevokedBy
    access_cutoff: AccessCutoff
    existing_data_note: str = (
        "Previously shared data may still be held by the requesting party "
        "per their own retention policy; this platform cannot retroactively "
        "delete data already transferred."
    )
    # This wording is fixed. Display it exactly as written — never soften it.


# ---------------------------------------------------------------------------
# Contract 5 — Fraud Signal (PROPOSED, pending team sign-off)
# ---------------------------------------------------------------------------

@dataclass
class FraudSignal:
    consent_id: str
    fraud_signal_id: str
    generated_at: str         # ISO 8601 timestamp
    risk_band: FraudRiskBand
    confidence: float         # 0.0-1.0
    explanation: List[str]
    is_fraud_decision: bool = False  # MUST always be False — not optional


# ---------------------------------------------------------------------------
# Ledger entry shape (used by consent/ledger.py)
# ---------------------------------------------------------------------------

@dataclass
class LedgerEntry:
    """Every ledger entry has these three fields, no exceptions. The ledger
    logs that an event happened — it never interprets what a score means,
    and it never stores a copy of the transaction payload itself."""
    event_type: LedgerEventType
    consent_id: str
    timestamp: str            # ISO 8601 timestamp
    actor: str                # e.g. "USER", "SYSTEM", or a requesting_party.id