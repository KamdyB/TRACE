from collections import Counter
from datetime import datetime
from uuid import uuid4

from schemas.contracts import (
    FraudRiskBand,
    FraudSignal,
    Transaction,
    TransactionType,
)


def detect_fraud_patterns(
    consent_id: str,
    transactions: list[Transaction],
) -> FraudSignal:
    """Detect transaction patterns that may indicate score manipulation."""

    explanations: list[str] = []
    risk_points = 0

    inflows = [
        txn for txn in transactions
        if txn.type == TransactionType.INFLOW
    ]

    # 1. Detect repeated identical inflows.
    amounts = [txn.amount for txn in inflows]
    repeated_amounts = [
        amount
        for amount, count in Counter(amounts).items()
        if count >= 3
    ]

    if repeated_amounts:
        risk_points += 30
        explanations.append(
            "Multiple income transactions use identical amounts, "
            "which may indicate a manufactured pattern."
        )

    # 2. Detect highly recurring transactions.
    highly_recurring = [
        txn for txn in inflows
        if txn.recurring_pattern_score >= 0.9
    ]

    if len(highly_recurring) >= 3:
        risk_points += 25
        explanations.append(
            "Several income transactions have unusually high "
            "recurring-pattern scores."
        )

    # 3. Detect unusually concentrated income activity.
    dates = [
        datetime.fromisoformat(txn.date).date()
        for txn in inflows
    ]

    if dates:
        unique_dates = len(set(dates))

        if len(inflows) >= 6 and unique_dates <= 2:
            risk_points += 35
            explanations.append(
                "Income activity is unusually concentrated across "
                "a small number of dates."
            )

    risk_points = min(risk_points, 100)

    if risk_points >= 60:
        risk_band = FraudRiskBand.HIGH
    elif risk_points >= 30:
        risk_band = FraudRiskBand.MEDIUM
    else:
        risk_band = FraudRiskBand.LOW

    if not explanations:
        explanations.append(
            "No strong manufactured transaction patterns were detected."
        )

    confidence = min(
        1.0,
        len(transactions) / 20,
    )

    return FraudSignal(
        consent_id=consent_id,
        fraud_signal_id=str(uuid4()),
        generated_at=datetime.utcnow().isoformat() + "Z",
        risk_band=risk_band,
        confidence=round(confidence, 2),
        explanation=explanations[:4],
    )