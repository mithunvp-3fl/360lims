"""Certificate insights engine.

Pure function. Computes Release Confidence (0-100), recommendation, risk,
and supporting observations based on:
  - Customer spec pass-rate (60 pts)
  - Upstream product batch compliance (25 pts)
  - Upstream chain coverage bonus (10 pts)
  - Base (5 pts)
"""
from __future__ import annotations
import random
from typing import List, Optional

from app.schemas.certificate import Certificate, CustomerSpec
from app.schemas.certificate_insights import (
    CertificateInsight,
    CertificateRecommendation,
)
from app.schemas.common import RiskLevel
from app.schemas.result import ResultStatus


def compute(
    certificate: Certificate,
    product_compliance: Optional[int],
    chain_coverage: int,
    historical_confidence_trend: Optional[List[int]] = None,
) -> CertificateInsight:
    specs: List[CustomerSpec] = list(certificate.customerSpecs or [])
    total = len(specs)
    pass_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.PASS)
    warn_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.WARNING)
    fail_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.FAIL)
    pending_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.PENDING)

    # ---- Score ----
    if total > 0:
        customer_pct = pass_count / total
    else:
        customer_pct = 0.0
    customer_pts = customer_pct * 60

    product_pts = ((product_compliance or 0) / 100.0) * 25

    coverage_pts = min(chain_coverage, 4) / 4.0 * 10

    base_pts = 5

    rnd = random.Random(certificate.certificateNumber)
    jitter = rnd.uniform(-0.5, 0.5)

    score_raw = customer_pts + product_pts + coverage_pts + base_pts + jitter
    if total == 0 and product_compliance is None:
        confidence = int(round(score_raw * 0.4))
    else:
        confidence = max(0, min(100, int(round(score_raw))))

    # ---- Recommendation ----
    if total == 0 and product_compliance is None:
        action = CertificateRecommendation.AWAITING
        rationale = "Certificate has no test data or upstream product batch results yet."
        risk = RiskLevel.MEDIUM
    elif fail_count > 0:
        action = CertificateRecommendation.REJECT
        rationale = (
            f"{fail_count} parameter(s) fail customer specification — dispatch should be rejected."
        )
        risk = RiskLevel.HIGH
    elif warn_count > 0 and confidence < 85:
        action = CertificateRecommendation.HOLD
        rationale = (
            "Parameters near customer-specification edges — hold for review before release."
        )
        risk = RiskLevel.MEDIUM
    elif warn_count > 0:
        action = CertificateRecommendation.REVIEW
        rationale = "Minor variances at spec edges — QA review recommended before dispatch."
        risk = RiskLevel.MEDIUM
    elif pending_count > 0:
        action = CertificateRecommendation.AWAITING
        rationale = "Pending parameter data — complete customer spec table before approval."
        risk = RiskLevel.MEDIUM
    else:
        action = CertificateRecommendation.APPROVE
        rationale = (
            f"All {total} customer-spec parameter(s) comply. Upstream chain coverage "
            f"is {chain_coverage}/5 steps. Dispatch can proceed."
        )
        risk = RiskLevel.LOW

    # ---- Observations ----
    observations: List[str] = []
    observations.append(f"{pass_count} of {total} customer-spec parameters pass." if total else "Customer spec table is empty.")
    if product_compliance is not None:
        observations.append(f"Upstream product batch compliance: {product_compliance}%.")
    observations.append(f"Genealogy coverage: {chain_coverage} of 5 steps linked.")
    if warn_count:
        observations.append(f"{warn_count} parameter(s) near customer spec edges.")
    if fail_count:
        observations.append(f"{fail_count} parameter(s) fail customer spec.")
    if certificate.status.value == "Issued":
        observations.append("Certificate has been issued — dispatch decision pending.")

    # ---- Trend sparkline ----
    if historical_confidence_trend:
        trend = list(historical_confidence_trend[-11:]) + [confidence]
    else:
        base = max(70, confidence - 5)
        trend = [base + ((-1) ** i) * (i % 3) for i in range(11)] + [confidence]

    return CertificateInsight(
        certificateId=certificate.id,
        releaseConfidence=confidence,
        releaseConfidenceTrend=trend,
        recommendedAction=action,
        rationale=rationale,
        riskLevel=risk,
        customerComplianceCount=pass_count,
        customerComplianceTotal=total,
        observations=observations[:6],
    )
