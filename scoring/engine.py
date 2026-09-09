from statistics import median
from typing import List

from schemas.contracts import (
    AffordabilityBand,
    Transaction,
    TransactionHistoryPayload,
)

from scoring.models import AffordabilityResult, IncomeProfile


def _inflows(transactions: List[Transaction]) -> List[Transaction]:
    return [txn for txn in transactions if txn.type.value == "INFLOW"]


def build_income_profile(
    transactions: List[Transaction],
) -> IncomeProfile:
    inflows = _inflows(transactions)

    if not inflows:
        return IncomeProfile(
            total_inflow=0.0,
            monthly_average=0.0,
            monthly_median=0.0,
            stability=0.0,
            transaction_count=0,
        )

    amounts = [txn.amount for txn in inflows]

    average = sum(amounts) / len(amounts)
    med = median(amounts)

    deviation = (
        sum(abs(amount - average) for amount in amounts)
        / len(amounts)
        if amounts
        else 0.0
    )

    stability = max(
        0.0,
        min(1.0, 1.0 - (deviation / average if average else 1.0)),
    )

    return IncomeProfile(
        total_inflow=sum(amounts),
        monthly_average=average,
        monthly_median=med,
        stability=stability,
        transaction_count=len(inflows),
    )


def calculate_affordability(
    payload: TransactionHistoryPayload,
) -> AffordabilityResult:
    profile = build_income_profile(payload.transactions)

    if profile.transaction_count == 0:
        return AffordabilityResult(
            score=0.0,
            band=AffordabilityBand.LOW.value,
            confidence=0.0,
            reliable_income=0.0,
            explanation=[
                "No income transactions were found.",
                "There is insufficient transaction history to establish affordability.",
            ],
        )

    reliable_income = (
        profile.monthly_median * (0.7 + (0.3 * profile.stability))
    )

    score = min(
        100.0,
        max(
            0.0,
            (reliable_income / max(profile.monthly_average, 1.0)) * 100,
        ),
    )

    if score >= 75:
        band = AffordabilityBand.HIGH.value
    elif score >= 50:
        band = AffordabilityBand.MEDIUM.value
    else:
        band = AffordabilityBand.LOW.value

    confidence = min(
        1.0,
        (profile.transaction_count / 20) * 0.6
        + profile.stability * 0.4,
    )

    explanation = [
        f"Observed {profile.transaction_count} income transactions.",
        f"Income stability is {profile.stability:.0%}.",
        f"Reliable income baseline is approximately {reliable_income:.2f}.",
    ]

    if payload.income_seasonality_flag.value != "UNCLASSIFIED":
        explanation.append(
            f"Income pattern classified as "
            f"{payload.income_seasonality_flag.value.lower().replace('_', ' ')}."
        )

    return AffordabilityResult(
        score=round(score, 2),
        band=band,
        confidence=round(confidence, 2),
        reliable_income=round(reliable_income, 2),
        explanation=explanation[:4],
    )