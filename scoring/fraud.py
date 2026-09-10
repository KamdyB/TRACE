from collections import Counter
from datetime import datetime, timezone
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
    """
    Detect transaction patterns that may indicate manufactured income.

    Consistency alone is not treated as fraud evidence because legitimate
    salaries and other recurring income streams are naturally consistent.

    Risk increases when independent suspicious characteristics co-occur.
    """

    explanations: list[str] = []
    risk_points = 0

    inflows = [
        txn
        for txn in transactions
        if txn.type == TransactionType.INFLOW
    ]

    if not inflows:
        return FraudSignal(
            consent_id=consent_id,
            fraud_signal_id=str(uuid4()),
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            risk_band=FraudRiskBand.LOW,
            confidence=0.0,
            explanation=[
                "No income transactions were available for manufactured-pattern analysis."
            ],
        )

    # ------------------------------------------------------------------
    # 1. Repeated identical income amounts
    # ------------------------------------------------------------------
    amounts = [txn.amount for txn in inflows]

    repeated_amounts = [
        amount
        for amount, count in Counter(amounts).items()
        if count >= 3
    ]

    repeated_amount_pattern = bool(repeated_amounts)

    # ------------------------------------------------------------------
    # 2. Highly recurring income transactions
    # ------------------------------------------------------------------
    highly_recurring = [
        txn
        for txn in inflows
        if txn.recurring_pattern_score >= 0.9
    ]

    recurring_pattern = len(highly_recurring) >= 3

    # ------------------------------------------------------------------
    # 3. Concentrated income activity
    # ------------------------------------------------------------------
    dates = [
        datetime.fromisoformat(txn.date).date()
        for txn in inflows
    ]

    unique_dates = len(set(dates))

    concentrated_pattern = (
        len(inflows) >= 6
        and unique_dates <= 2
    )

    # ------------------------------------------------------------------
    # Evidence composition
    #
    # Repetition and recurrence are intentionally weak on their own.
    # A normal salary can legitimately trigger both.
    #
    # Manufactured activity becomes more concerning when those consistency
    # signals occur together with unusually concentrated activity.
    # ------------------------------------------------------------------

    consistency_count = sum(
        [
            repeated_amount_pattern,
            recurring_pattern,
        ]
    )

    if repeated_amount_pattern:
        explanations.append(
            "Income transactions contain repeated identical amounts."
        )

    if recurring_pattern:
        explanations.append(
            "Several income transactions have highly recurring patterns."
        )

    if concentrated_pattern:
        explanations.append(
            "Income activity is unusually concentrated across a small "
            "number of dates."
        )

    # ------------------------------------------------------------------
    # Weak consistency evidence
    #
    # One consistency characteristic is not suspicious enough to affect
    # the risk band.
    # ------------------------------------------------------------------

    if consistency_count == 2 and not concentrated_pattern:
        risk_points += 10

    # ------------------------------------------------------------------
    # Independent concentration evidence
    # ------------------------------------------------------------------

    if concentrated_pattern:
        risk_points += 25

    # ------------------------------------------------------------------
    # Stronger co-occurrence rule
    #
    # Repeated identical amounts + highly recurring behaviour +
    # concentrated activity is materially more suspicious than any
    # characteristic in isolation.
    # ------------------------------------------------------------------

    if (
        repeated_amount_pattern
        and recurring_pattern
        and concentrated_pattern
    ):
        risk_points += 45
        explanations.append(
            "Multiple consistency signals occur together with unusually "
            "concentrated income activity."
        )

    # ------------------------------------------------------------------
    # Bound score
    # ------------------------------------------------------------------

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

    # Confidence reflects available transaction evidence, not fraud certainty.
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