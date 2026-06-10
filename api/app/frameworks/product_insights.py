"""Product Quality Testing insights engine.

Pure function. Inputs: tests + results for a product batch, history for the same
product type, and historical results from those batches. Outputs a
`ProductInsight` ready for the workbench right-rail.
"""
from __future__ import annotations
from typing import Dict, List

from app.schemas.common import RiskLevel
from app.schemas.insights import ParameterTrend
from app.schemas.product_batch import (
    ProductResult,
    ProductTest,
    ProductType,
)
from app.schemas.product_insights import (
    HistoricalProductBatch,
    ProductInsight,
    ProductRecommendation,
    ReleaseReadiness,
)
from app.schemas.result import ResultStatus
from app.schemas.test import TestStatus


# Specifications per product type. Each parameter has (lo, hi, target) in unit.
PRODUCT_SPECS: Dict[ProductType, Dict[str, tuple[float, float, float]]] = {
    ProductType.PRIMARY_ALUMINUM_INGOT: {
        "UTS":           (140.0, 200.0, 165.0),
        "YieldStrength": (50.0, 90.0, 70.0),
        "Elongation":    (8.0, 20.0, 14.0),
        "Hardness":      (40.0, 65.0, 52.0),
        "Conductivity":  (58.0, 64.0, 61.0),
        "Length":        (700.0, 720.0, 710.0),
        "Diameter":      (95.0, 105.0, 100.0),
        "Weight":        (20.0, 25.0, 22.5),
        "GrainSize":     (50.0, 120.0, 80.0),
        "Phase":         (90.0, 99.5, 96.0),
        "SurfaceDefects": (0.0, 5.0, 1.0),
    },
    ProductType.PRIMARY_ALUMINUM_BILLET: {
        "UTS":           (150.0, 210.0, 175.0),
        "YieldStrength": (55.0, 95.0, 75.0),
        "Elongation":    (8.0, 18.0, 12.0),
        "Hardness":      (45.0, 70.0, 56.0),
        "Conductivity":  (56.0, 62.0, 59.0),
        "Length":        (1490.0, 1510.0, 1500.0),
        "Diameter":      (175.0, 185.0, 180.0),
        "Weight":        (90.0, 110.0, 100.0),
        "GrainSize":     (45.0, 110.0, 75.0),
        "Phase":         (90.0, 99.5, 96.0),
        "SurfaceDefects": (0.0, 5.0, 1.0),
    },
}


# Units per parameter
PARAM_UNITS: Dict[str, str] = {
    "UTS": "MPa",
    "YieldStrength": "MPa",
    "Elongation": "%",
    "Hardness": "HB",
    "Conductivity": "%IACS",
    "Length": "mm",
    "Diameter": "mm",
    "Weight": "kg",
    "GrainSize": "µm",
    "Phase": "%",
    "SurfaceDefects": "count",
}


def unit_for(parameter: str) -> str:
    return PARAM_UNITS.get(parameter, "")


def _status_for(value: float, lo: float, hi: float) -> ResultStatus:
    if value < lo or value > hi:
        return ResultStatus.FAIL
    span = hi - lo
    if span <= 0:
        return ResultStatus.PASS
    margin = span * 0.1
    if value < lo + margin or value > hi - margin:
        return ResultStatus.WARNING
    return ResultStatus.PASS


def spec_for(product_type: ProductType, parameter: str) -> tuple[float, float, float] | None:
    return PRODUCT_SPECS.get(product_type, {}).get(parameter)


def compute(
    product_batch_id: str,
    product_type: ProductType,
    tests: List[ProductTest],
    results: List[ProductResult],
    historical_batches: List[HistoricalProductBatch],
    historical_results: List[ProductResult] | None = None,
) -> ProductInsight:
    tests_total = len(tests)
    tests_completed = sum(1 for t in tests if t.status == TestStatus.COMPLETED)

    all_values = [v for r in results for v in r.values]
    fail_values = [v for v in all_values if v.status == ResultStatus.FAIL]
    warn_values = [v for v in all_values if v.status == ResultStatus.WARNING]

    has_fail = bool(fail_values)
    has_warning = bool(warn_values)

    # ---- Product Compliance score (0-100) ----
    if all_values:
        compliance_pct = sum(1 for v in all_values if v.status == ResultStatus.PASS) / len(all_values)
    else:
        compliance_pct = 0.0
    deviation_count = len(fail_values) + len(warn_values)

    completion_pct = (tests_completed / tests_total) if tests_total else 0
    if historical_batches:
        stability = sum(b.complianceScore for b in historical_batches) / len(historical_batches) / 100
    else:
        stability = 0.9

    # weights: completion 20 · compliance 50 · stability 20 · base 10 · deviation penalty
    completion_pts = completion_pct * 20
    compliance_pts = compliance_pct * 50
    stability_pts = stability * 20
    deviation_penalty = min(deviation_count * 6, 20)

    score_raw = completion_pts + compliance_pts + stability_pts + 10 - deviation_penalty
    if tests_total == 0 or tests_completed == 0:
        compliance_score = max(0, int(score_raw * 0.3))
    else:
        compliance_score = max(0, min(100, int(round(score_raw))))

    # ---- Release Readiness ----
    if tests_total == 0 or tests_completed == 0:
        readiness = ReleaseReadiness.NOT_READY
    elif has_fail:
        readiness = ReleaseReadiness.NOT_READY
    elif has_warning and compliance_score < 85:
        readiness = ReleaseReadiness.HOLD
    elif has_warning:
        readiness = ReleaseReadiness.REVIEW
    elif tests_completed < tests_total:
        readiness = ReleaseReadiness.REVIEW
    elif compliance_score >= 90:
        readiness = ReleaseReadiness.READY
    else:
        readiness = ReleaseReadiness.REVIEW

    # ---- Recommendation ----
    if tests_total == 0 or tests_completed == 0:
        action = ProductRecommendation.AWAITING_DATA
        rationale = "Test data not yet captured for this product batch."
        risk = RiskLevel.MEDIUM
    elif has_fail:
        severe = any(
            (v.specMax is not None and v.specMax > 0 and v.value > v.specMax * 1.3)
            or (v.specMin is not None and v.specMin > 0 and v.value < v.specMin * 0.6)
            for v in fail_values
        )
        if severe:
            action = ProductRecommendation.REJECT
            rationale = (
                "One or more parameters are significantly out of specification — "
                "product rejection recommended."
            )
        else:
            action = ProductRecommendation.RETEST
            rationale = (
                "Marginal failures detected — retest recommended before final decision."
            )
        risk = RiskLevel.HIGH
    elif has_warning and compliance_score < 85:
        action = ProductRecommendation.HOLD
        rationale = (
            "Variance detected near specification edges with weak historical stability — "
            "hold for QA review before approval."
        )
        risk = RiskLevel.MEDIUM
    elif has_warning:
        action = ProductRecommendation.HOLD
        rationale = "Edge-of-spec variance — QA review recommended before approval."
        risk = RiskLevel.MEDIUM
    elif tests_completed < tests_total:
        action = ProductRecommendation.HOLD
        rationale = "Pending test analyses — complete the test matrix before approval."
        risk = RiskLevel.MEDIUM
    else:
        action = ProductRecommendation.APPROVE
        rationale = (
            f"All test parameters comply with {product_type.value} specifications. "
            "Product is ready for certificate generation."
        )
        risk = RiskLevel.LOW

    # ---- Observations ----
    observations: List[str] = []
    if tests_completed < tests_total:
        observations.append(f"{tests_completed} of {tests_total} tests captured.")
    if all_values:
        passing = len(all_values) - len(fail_values) - len(warn_values)
        observations.append(f"{passing} of {len(all_values)} parameters within {product_type.value} specification.")
    for v in all_values:
        if v.status == ResultStatus.PASS:
            observations.append(f"{v.parameter} within acceptable range.")
        elif v.status == ResultStatus.WARNING:
            observations.append(f"{v.parameter} near specification edge — monitor closely.")
        else:
            observations.append(f"{v.parameter} out of specification for {product_type.value}.")
        if len(observations) >= 6:
            break
    if historical_batches:
        last = historical_batches[0]
        observations.append(f"Previous batch {last.productBatchNumber}: {last.outcome}.")
    if not has_fail and not has_warning and tests_completed == tests_total and tests_total > 0:
        observations.append(
            f"No abnormal variation detected — quality matches accepted history for {product_type.value}."
        )

    # ---- Parameter trends ----
    parameter_trends: List[ParameterTrend] = []
    if all_values:
        history_by_param: dict[str, list[float]] = {}
        for r in historical_results or []:
            for v in r.values:
                history_by_param.setdefault(v.parameter, []).append(v.value)
        seen: set[str] = set()
        for v in all_values:
            if v.parameter in seen:
                continue
            seen.add(v.parameter)
            past = history_by_param.get(v.parameter, [])
            if past:
                prev_avg = sum(past) / len(past)
                delta = v.value - prev_avg
                delta_pct = (delta / prev_avg * 100) if prev_avg != 0 else None
                parameter_trends.append(ParameterTrend(
                    parameter=v.parameter, unit=v.unit, current=v.value,
                    previousAverage=round(prev_avg, 3),
                    delta=round(delta, 3),
                    deltaPct=round(delta_pct, 1) if delta_pct is not None else None,
                    samples=len(past),
                ))
            else:
                parameter_trends.append(ParameterTrend(
                    parameter=v.parameter, unit=v.unit, current=v.value, samples=0,
                ))

    # ---- Compliance trend sparkline ----
    if historical_batches:
        trend = [b.complianceScore for b in historical_batches[:12]][::-1] + [compliance_score]
    else:
        base = max(70, compliance_score - 5)
        trend = [base + ((-1) ** i) * (i % 3) for i in range(12)] + [compliance_score]

    return ProductInsight(
        productBatchId=product_batch_id,
        recommendedAction=action,
        rationale=rationale,
        riskLevel=risk,
        productCompliance=compliance_score,
        productComplianceTrend=trend,
        releaseReadiness=readiness,
        testsCompleted=tests_completed,
        testsTotal=tests_total,
        observations=observations[:6],
        historicalBatches=historical_batches[:6],
        parameterTrends=parameter_trends,
        deviationCount=deviation_count,
    )
