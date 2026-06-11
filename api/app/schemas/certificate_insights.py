"""Certificate & Dispatch — insight payload.

Two KPIs:
- **Release Confidence** (0-100) — composite of customer spec, product compliance,
  upstream chain coverage. The hero. Used to drive recommendation.
- **Certificate Health** (0-100) — independent quality-of-the-certificate score
  computed from data completeness, spec coverage, signature presence, and
  freshness. Sits next to Release Confidence on the workbench.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel


class CertificateRecommendation(str, Enum):
    APPROVE = "APPROVE DISPATCH"
    HOLD = "HOLD DISPATCH"
    REJECT = "REJECT DISPATCH"
    REVIEW = "REQUEST REVIEW"
    AWAITING = "AWAITING DATA"


class CertificateHealth(BaseModel):
    score: int                          # 0-100
    dataCompleteness: int               # 0-25
    specCoverage: int                   # 0-25
    signaturePresence: int              # 0-25
    freshness: int                      # 0-25
    notes: List[str] = []


class CertificateInsight(BaseModel):
    certificateId: str
    releaseConfidence: int              # 0-100 hero
    releaseConfidenceTrend: List[int] = []
    recommendedAction: CertificateRecommendation
    rationale: str
    riskLevel: RiskLevel
    customerComplianceCount: int
    customerComplianceTotal: int
    observations: List[str]

    # Phase 5 enhancement — health alongside confidence
    certificateHealth: Optional[CertificateHealth] = None


__all__ = [
    "CertificateRecommendation",
    "CertificateHealth",
    "CertificateInsight",
]
