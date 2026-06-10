"""Metal Quality Control — insight payload.

The hero KPI is Metal Compliance (0-100), the secondary signal is Casting
Readiness (READY / REVIEW / HOLD / NOT READY). Replaces Process Readiness
from Step 2 while preserving the rest of the right-rail shape.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .insights import ParameterTrend
from .metal_batch import ChemistryCorrection, ProductGrade


class MetalRecommendation(str, Enum):
    RELEASE = "RELEASE FOR CASTING"
    CORRECT = "CORRECT CHEMISTRY"
    HOLD = "HOLD METAL BATCH"
    DOWNGRADE = "DOWNGRADE GRADE"
    REJECT = "REJECT"
    AWAITING_DATA = "AWAITING DATA"


class CastingReadiness(str, Enum):
    READY = "READY"
    REVIEW = "REVIEW"
    HOLD = "HOLD"
    NOT_READY = "NOT READY"


class HistoricalMetalBatch(BaseModel):
    metalBatchNumber: str
    productGrade: ProductGrade
    potline: str
    createdAt: str
    outcome: str               # Released / Held / Rejected / Downgraded / Open
    complianceScore: int
    riskLevel: RiskLevel


class MetalInsight(BaseModel):
    metalBatchId: str
    recommendedAction: MetalRecommendation
    rationale: str
    riskLevel: RiskLevel
    metalCompliance: int                       # 0-100 hero score
    metalComplianceTrend: List[int] = []       # last 12 batches for sparkline
    castingReadiness: CastingReadiness
    testsCompleted: int
    testsTotal: int
    observations: List[str]
    historicalBatches: List[HistoricalMetalBatch] = []
    parameterTrends: List[ParameterTrend] = []
    chemistryCorrections: List[ChemistryCorrection] = []
    deviationCount: int


__all__ = [
    "MetalRecommendation",
    "CastingReadiness",
    "HistoricalMetalBatch",
    "MetalInsight",
]
