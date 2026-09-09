from dataclasses import dataclass
from typing import List


@dataclass
class IncomeProfile:
    total_inflow: float
    monthly_average: float
    monthly_median: float
    stability: float
    transaction_count: int


@dataclass
class AffordabilityResult:
    score: float
    band: str
    confidence: float
    reliable_income: float
    explanation: List[str]