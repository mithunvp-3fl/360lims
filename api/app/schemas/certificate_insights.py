"""Certificate & Dispatch — insight payload.

Hero KPI is Release Confidence (0-100). Combines customer spec compliance,
upstream product batch compliance, and upstream chain coverage.
"""
from __future__ import annotations
from typing import List
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel


class CertificateRecommendation(str, Enum):
    APPROVE = "APPROVE DISPATCH"
    HOLD = "HOLD DISPATCH"
    REJECT = "REJECT DISPATCH"
    REVIEW = "REQUEST REVIEW"
    AWAITING = "AWAITING DATA"


class CertificateInsight(BaseModel):
    certificateId: str
    releaseConfidence: int             # 0-100 hero
    releaseConfidenceTrend: List[int] = []
    recommendedAction: CertificateRecommendation
    rationale: str
    riskLevel: RiskLevel
    customerComplianceCount: int
    customerComplianceTotal: int
    observations: List[str]


__all__ = [
    "CertificateRecommendation",
    "CertificateInsight",
]
