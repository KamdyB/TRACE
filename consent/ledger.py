"""
consent/ledger.py

The immutable audit trail. Every grant, access, and revocation gets one
append-only entry — timestamp, consent_id, actor. Nothing else.

This module never interprets what a score means, never stores a copy of
the transaction payload, and never lets an entry be edited or deleted
once written. If you find yourself wanting to "update" a ledger entry,
that's a sign the logic belongs somewhere else — write a new entry
instead.
"""

from datetime import datetime, timezone
from typing import List

from schemas.contracts import ConsentGrant, LedgerEntry, LedgerEventType


class ConsentLedger:
    """An append-only log. No update, no delete — by design."""

    def __init__(self):
        self._entries: List[LedgerEntry] = []

    def _append(self, event_type: LedgerEventType, consent_id: str, actor: str) -> LedgerEntry:
        entry = LedgerEntry(
            event_type=event_type,
            consent_id=consent_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=actor,
        )
        self._entries.append(entry)
        return entry

    def log_grant(self, consent: ConsentGrant) -> LedgerEntry:
        """Log that a consent was granted. Actor is the requesting party,
        since they're who the grant was made to."""
        return self._append(
            LedgerEventType.GRANT,
            consent_id=consent.consent_id,
            actor=consent.requesting_party.id,
        )

    def log_access(self, consent_id: str, actor: str) -> LedgerEntry:
        """Log that a requesting party actually pulled data under an
        existing grant. Call this from the API layer at the moment of
        access — not from the consent flow itself, which only knows about
        grant/revoke, not access events."""
        return self._append(LedgerEventType.ACCESS, consent_id=consent_id, actor=actor)

    def log_revoke(self, consent_id: str, actor: str = "USER") -> LedgerEntry:
        """Log that access was revoked."""
        return self._append(LedgerEventType.REVOKE, consent_id=consent_id, actor=actor)

    def entries_for(self, consent_id: str) -> List[LedgerEntry]:
        """All entries for one consent, in the order they happened —
        useful if you build the live audit-trail UI idea later (grant →
        access → revoke, stamped with timestamps)."""
        return [e for e in self._entries if e.consent_id == consent_id]

    def all_entries(self) -> List[LedgerEntry]:
        """A read-only copy of the full log. Returns a new list so callers
        can't accidentally mutate the ledger's internal state."""
        return list(self._entries)


# Module-level default instance — simple for the API layer to import and
# use directly, since there's only ever one ledger for the whole app.
ledger = ConsentLedger()