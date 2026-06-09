from __future__ import annotations
from typing import List
from enum import Enum
from pydantic import BaseModel
from .common import RiskLevel


class RecommendedAction(str, Enum):
    APPROVE = "APPROVE"
    HOLD = "HOLD"
    REJECT = "REJECT"
    AWAITING_DATA = "AWAITING DATA"


class HistoricalDelivery(BaseModel):
    lotNumber: str
    receiptDate: str
    outcome: str  # Approved / Held / Rejected
    riskLevel: RiskLevel


class ParameterTrend(BaseModel):
    parameter: str
    unit: str
    current: float | None = None
    previousAverage: float | None = None
    delta: float | None = None
    deltaPct: float | None = None
    samples: int = 0  # how many past lots contributed to the average


class QualityInsight(BaseModel):
    receiptId: str
    recommendedAction: RecommendedAction
    rationale: str
    riskLevel: RiskLevel
    supplierHealth: int
    supplierHealthTrend: List[int] = []
    testsCompleted: int
    testsTotal: int
    observations: List[str]
    historicalDeliveries: List[HistoricalDelivery] = []
    parameterTrends: List[ParameterTrend] = []
    complianceScore: int  # 0-100


__all__ = ["RecommendedAction", "HistoricalDelivery", "ParameterTrend", "QualityInsight"]
