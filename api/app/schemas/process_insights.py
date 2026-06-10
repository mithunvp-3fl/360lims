"""Process Material Qualification — insight payload.

Mirrors `QualityInsight` but swaps Supplier Health for Process Readiness, as the
hero KPI of the qualification workbench (PRD section 20).
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .insights import ParameterTrend


class ProcessRecommendation(str, Enum):
    RELEASE = "RELEASE"
    REVIEW = "REVIEW"
    HOLD = "HOLD"
    REJECT = "REJECT"
    AWAITING_DATA = "AWAITING DATA"


class HistoricalBatch(BaseModel):
    qualificationNumber: str
    batchNumber: str
    requestedAt: str
    outcome: str               # Released / Held / Rejected / Open
    readinessScore: int
    riskLevel: RiskLevel


class ProcessInsight(BaseModel):
    qualificationId: str
    recommendedAction: ProcessRecommendation
    recommendedTarget: str     # e.g. "RELEASE TO CARBON PLANT"
    rationale: str
    riskLevel: RiskLevel
    processReadiness: int                  # 0-100 hero score
    processReadinessTrend: List[int] = []  # last 12 batches for sparkline
    testsCompleted: int
    testsTotal: int
    observations: List[str]
    historicalBatches: List[HistoricalBatch] = []
    parameterTrends: List[ParameterTrend] = []
    complianceScore: int       # 0-100
    deviationCount: int


__all__ = [
    "ProcessRecommendation",
    "HistoricalBatch",
    "ProcessInsight",
]
