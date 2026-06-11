"""Certificate insights engine.

Pure functions. Two scores:
  - **Release Confidence** (compute) — 0-100, customer-spec + product compliance + chain.
  - **Certificate Health** (compute_health) — 0-100, completeness + coverage + signature + freshness.
"""
from __future__ import annotations
import random
from datetime import datetime, timezone
from typing import List, Optional

from app.schemas.certificate import (
    Certificate,
    CertificateStatus,
    CustomerSpec,
)
from app.schemas.certificate_insights import (
    CertificateHealth,
    CertificateInsight,
    CertificateRecommendation,
)
from app.schemas.common import RiskLevel
from app.schemas.result import ResultStatus


# ---------------------------------------------------------------------------
# Health (Phase 4 enhancement)
# ---------------------------------------------------------------------------
def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts)
    except ValueError:
        return None


def compute_health(certificate: Certificate, has_product_batch: bool) -> CertificateHealth:
    """4 components, 25 pts each. Decision D7 in the gap analysis."""
    notes: List[str] = []

    # (a) data completeness — customer + ≥1 spec + product-batch link
    dc = 0
    if certificate.customer:
        dc += 8
    if certificate.customerSpecs:
        dc += 10
    if has_product_batch:
        dc += 7
    if dc < 25:
        notes.append(f"Data completeness {dc}/25")

    # (b) spec coverage — % parameters with non-null actual value
    total_specs = len(certificate.customerSpecs)
    if total_specs > 0:
        with_value = sum(1 for s in certificate.customerSpecs if s.actualValue is not None)
        sc = int(round((with_value / total_specs) * 25))
    else:
        sc = 0
    if sc < 25 and total_specs > 0:
        missing = total_specs - sum(1 for s in certificate.customerSpecs if s.actualValue is not None)
        notes.append(f"Spec coverage {sc}/25 — {missing} parameter(s) missing actuals")
    elif total_specs == 0:
        notes.append("No customer specs captured")

    # (c) signature presence — issued + signature != placeholder
    sp = 0
    if certificate.status == CertificateStatus.ISSUED:
        sp += 15
        if (
            certificate.digitalSignaturePlaceholder
            and certificate.digitalSignaturePlaceholder.strip() not in ("", "—", "-")
        ):
            sp += 10
    if sp < 25:
        notes.append(f"Signature {sp}/25")

    # (d) freshness — recency of issuance
    fr = 0
    issued = _parse_iso(certificate.issuedAt)
    if issued is not None:
        age_days = (datetime.now(tz=timezone.utc) - issued).total_seconds() / 86400.0
        if age_days <= 7:
            fr = 25
        elif age_days <= 30:
            fr = 20
        elif age_days <= 90:
            fr = 12
        else:
            fr = 6
    if fr < 25 and issued is not None:
        notes.append(f"Freshness {fr}/25 — certificate aging")
    elif issued is None:
        notes.append("Not yet issued — freshness 0/25")

    score = max(0, min(100, dc + sc + sp + fr))
    return CertificateHealth(
        score=score,
        dataCompleteness=dc,
        specCoverage=sc,
        signaturePresence=sp,
        freshness=fr,
        notes=notes[:4],
    )


# ---------------------------------------------------------------------------
# Release Confidence (existing, preserved)
# ---------------------------------------------------------------------------
def compute(
    certificate: Certificate,
    product_compliance: Optional[int],
    chain_coverage: int,
    historical_confidence_trend: Optional[List[int]] = None,
    has_product_batch: bool = True,
) -> CertificateInsight:
    specs: List[CustomerSpec] = list(certificate.customerSpecs or [])
    total = len(specs)
    pass_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.PASS)
    warn_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.WARNING)
    fail_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.FAIL)
    pending_count = sum(1 for s in specs if s.complianceStatus == ResultStatus.PENDING)

    # ---- Score ----
    customer_pct = (pass_count / total) if total > 0 else 0.0
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
    observations.append(
        f"{pass_count} of {total} customer-spec parameters pass." if total else "Customer spec table is empty."
    )
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

    # ---- Health (attached) ----
    health = compute_health(certificate, has_product_batch=has_product_batch)

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
        certificateHealth=health,
    )
