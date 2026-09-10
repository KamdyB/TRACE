"""
api/main.py

The FastAPI layer. Thin on purpose — every real decision happens in
handlers.py, which is tested independently of this file. This module's
only job is translating HTTP requests into calls to those functions and
HTTP-appropriate error responses.

NOTE: The API has been smoke-tested locally with Uvicorn against the
consent, scoring, and revocation handlers. The FastAPI layer remains
intentionally thin; scoring decisions are delegated to the handlers and
scoring engine.
"""

from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from schemas.contracts import Transaction, TransactionHistoryPayload, TransactionType, IncomeSeasonalityFlag
from api.handlers import (
    ConsentNotFoundError,
    ConsentNotValidError,
    handle_grant,
    handle_revoke,
    handle_score,
)

app = FastAPI(title="TRACE API")


# ---------------------------------------------------------------------------
# Request bodies (thin — just enough to build the real dataclasses)
# ---------------------------------------------------------------------------

class GrantRequest(BaseModel):
    user_id: str
    requesting_party_id: str
    requesting_party_name: str
    lookback_window_days: int = 180
    duration_days: int = 30


class TransactionIn(BaseModel):
    txn_id: str
    date: str
    type: str  # "INFLOW" | "OUTFLOW"
    amount: float
    category: str
    recurring_pattern_score: float


class ScoreRequest(BaseModel):
    consent_id: str
    account_ref: str
    period_start: str
    period_end: str
    transactions: list[TransactionIn]
    income_seasonality_flag: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/consent/grant")
def grant(req: GrantRequest):
    consent = handle_grant(
        user_id=req.user_id,
        requesting_party_id=req.requesting_party_id,
        requesting_party_name=req.requesting_party_name,
        lookback_window_days=req.lookback_window_days,
        duration_days=req.duration_days,
    )
    return asdict(consent)


@app.post("/score")
def score(req: ScoreRequest):
    payload = TransactionHistoryPayload(
        consent_id=req.consent_id,
        account_ref=req.account_ref,
        period_start=req.period_start,
        period_end=req.period_end,
        transactions=[
            Transaction(
                txn_id=t.txn_id,
                date=t.date,
                type=TransactionType(t.type),
                amount=t.amount,
                category=t.category,
                recurring_pattern_score=t.recurring_pattern_score,
            )
            for t in req.transactions
        ],
        income_seasonality_flag=IncomeSeasonalityFlag(req.income_seasonality_flag),
    )

    try:
        affordability_signal, fraud_signal = handle_score(req.consent_id, payload)
    except ConsentNotFoundError:
        raise HTTPException(status_code=404, detail="Consent not found")
    except ConsentNotValidError as e:
        raise HTTPException(status_code=403, detail=str(e))

    return {
        "affordability_signal": asdict(affordability_signal),
        "fraud_signal": asdict(fraud_signal),
    }


@app.post("/consent/{consent_id}/revoke")
def revoke(consent_id: str):
    try:
        event = handle_revoke(consent_id)
    except ConsentNotFoundError:
        raise HTTPException(status_code=404, detail="Consent not found")

    return asdict(event)