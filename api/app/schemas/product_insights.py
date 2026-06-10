"""Product Quality Testing — insight payload.

Hero KPI is Product Compliance (0-100). Secondary signal is Release Readiness
(READY / REVIEW / HOLD / NOT READY).
"""
from __future__ import annotations
from typing import List
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .insights import ParameterTrend
from .product_batch import ProductType


class ProductRecommendation(str, Enum):
    APPROVE = "APPROVE PRODUCT"
    HOLD = "HOLD PRODUCT"
    REJECT = "REJECT PRODUCT"
    RETEST = "RETEST PRODUCT"
    AWAITING_DATA = "AWAITING DATA"


class ReleaseReadiness(str, Enum):
    READY = "READY"
    REVIEW = "REVIEW"
    HOLD = "HOLD"
    NOT_READY = "NOT READY"


class HistoricalProductBatch(BaseModel):
    productBatchNumber: str
    productType: ProductType
    createdAt: str
    outcome: str
    complianceScore: int
    riskLevel: RiskLevel


class ProductInsight(BaseModel):
    productBatchId: str
    recommendedAction: ProductRecommendation
    rationale: str
    riskLevel: RiskLevel
    productCompliance: int                   # 0-100 hero score
    productComplianceTrend: List[int] = []   # sparkline
    releaseReadiness: ReleaseReadiness
    testsCompleted: int
    testsTotal: int
    observations: List[str]
    historicalBatches: List[HistoricalProductBatch] = []
    parameterTrends: List[ParameterTrend] = []
    deviationCount: int


__all__ = [
    "ProductRecommendation",
    "ReleaseReadiness",
    "HistoricalProductBatch",
    "ProductInsight",
]
