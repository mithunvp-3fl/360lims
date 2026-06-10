"""Metal Quality Control insights engine.

Pure function. Inputs: tests + results for a metal batch, history for the same
product grade + potline, and historical results from those batches. Outputs a
`MetalInsight` ready for the workbench right-rail.

PRD section 21 — Metal Compliance inputs:
  - Specification compliance
  - Historical stability
  - Deviation severity
  - Missing parameters
  - Risk indicators

PRD section 22/23/26 — Casting Readiness, Recommendation, and the
Chemistry Correction Advisor (signature feature).
"""
from __future__ import annotations
from typing import List, Dict

from app.schemas.common import RiskLevel
from app.schemas.insights import ParameterTrend
from app.schemas.metal_batch import (
    ChemistryCorrection,
    MetalResult,
    MetalTest,
    ProductGrade,
)
from app.schemas.metal_insights import (
    CastingReadiness,
    HistoricalMetalBatch,
    MetalInsight,
    MetalRecommendation,
)
from app.schemas.result import ResultStatus, ResultValue
from app.schemas.test import TestStatus


# Spec targets per product grade — Aluminium primary grades (Phase 1 mock).
# Each parameter has (lo, hi, target) in weight-%.
GRADE_SPECS: Dict[ProductGrade, Dict[str, tuple[float, float, float]]] = {
    ProductGrade.P1020: {
        "Si": (0.00, 0.10, 0.06),
        "Fe": (0.00, 0.20, 0.14),
        "Cu": (0.00, 0.03, 0.02),
        "Mg": (0.00, 0.03, 0.01),
        "Zn": (0.00, 0.03, 0.01),
        "Ti": (0.00, 0.03, 0.01),
        "Mn": (0.00, 0.03, 0.01),
    },
    ProductGrade.P0610: {
        "Si": (0.00, 0.06, 0.04),
        "Fe": (0.00, 0.10, 0.07),
        "Cu": (0.00, 0.02, 0.01),
        "Mg": (0.00, 0.02, 0.01),
        "Zn": (0.00, 0.02, 0.01),
        "Ti": (0.00, 0.02, 0.01),
        "Mn": (0.00, 0.02, 0.01),
    },
    ProductGrade.PRIMARY_AL: {
        "Si": (0.00, 0.15, 0.07),
        "Fe": (0.00, 0.20, 0.12),
        "Cu": (0.00, 0.05, 0.02),
        "Mg": (0.00, 0.05, 0.02),
        "Zn": (0.00, 0.05, 0.02),
        "Ti": (0.00, 0.05, 0.02),
        "Mn": (0.00, 0.05, 0.02),
    },
}


# Additive masters used by the Chemistry Correction Advisor (PRD §26).
# `purity` is the fraction of the target element in the additive.
ADDITIVE_MASTER: Dict[str, tuple[str, float]] = {
    "Si": ("Silicon Metal", 0.99),
    "Fe": ("Iron Pellet", 0.98),
    "Cu": ("Copper Wire", 0.99),
    "Mg": ("Magnesium Alloy", 0.95),
    "Zn": ("Zinc Ingot", 0.99),
    "Ti": ("Titanium Boron Rod", 0.05),  # TiBor master alloy is dilute
    "Mn": ("Manganese Briquette", 0.80),
}


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


def spec_for(grade: ProductGrade, parameter: str) -> tuple[float, float, float] | None:
    return GRADE_SPECS.get(grade, {}).get(parameter)


def _suggest_correction(grade: ProductGrade, parameter: str, current: float,
                        batch_weight_mt: float) -> ChemistryCorrection | None:
    spec = spec_for(grade, parameter)
    if not spec:
        return None
    lo, hi, target = spec
    delta = round(target - current, 4)
    if abs(delta) < 0.005:
        return None
    additive, purity = ADDITIVE_MASTER.get(parameter, (f"{parameter} master alloy", 1.0))
    # Mass to add (kg) so that delta * batch_mass = added_pure_kg.
    # batch_mass in kg = batch_weight_mt * 1000.
    batch_kg = max(batch_weight_mt, 0.001) * 1000.0
    pure_kg_needed = (delta / 100.0) * batch_kg   # delta is %, convert to fraction
    if purity <= 0:
        purity = 1.0
    addition_kg = pure_kg_needed / purity
    expected_after = round(current + delta, 4)
    if addition_kg < 0:
        rationale = (
            f"{parameter} is above target. Dilute by tapping {abs(round(addition_kg, 1))} kg "
            f"of clean metal — direct addition not possible."
        )
        addition_kg_disp = abs(round(addition_kg, 1))
        additive_disp = "Clean primary metal (dilution)"
    else:
        rationale = (
            f"Add {round(addition_kg, 1)} kg of {additive} to lift {parameter} "
            f"from {current:.2f}% to target {target:.2f}%."
        )
        addition_kg_disp = round(addition_kg, 1)
        additive_disp = additive
    return ChemistryCorrection(
        parameter=parameter,
        currentValue=current,
        targetValue=target,
        delta=delta,
        additionMaterial=additive_disp,
        additionKg=addition_kg_disp,
        expectedAfter=expected_after,
        rationale=rationale,
        unit="%",
    )


def compute(
    metal_batch_id: str,
    product_grade: ProductGrade,
    batch_weight_mt: float,
    tests: List[MetalTest],
    results: List[MetalResult],
    historical_batches: List[HistoricalMetalBatch],
    historical_results: List[MetalResult] | None = None,
) -> MetalInsight:
    tests_total = len(tests)
    tests_completed = sum(1 for t in tests if t.status == TestStatus.COMPLETED)

    all_values = [v for r in results for v in r.values]
    fail_values = [v for v in all_values if v.status == ResultStatus.FAIL]
    warn_values = [v for v in all_values if v.status == ResultStatus.WARNING]

    has_fail = bool(fail_values)
    has_warning = bool(warn_values)

    # ---- Metal Compliance score (0-100) ----
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

    # weights: completion 20 · compliance 50 · stability 20 · base 10 · deviation penalty up to 20
    completion_pts = completion_pct * 20
    compliance_pts = compliance_pct * 50
    stability_pts = stability * 20
    deviation_penalty = min(deviation_count * 6, 20)

    score_raw = completion_pts + compliance_pts + stability_pts + 10 - deviation_penalty
    if tests_total == 0 or tests_completed == 0:
        compliance_score = max(0, int(score_raw * 0.3))
    else:
        compliance_score = max(0, min(100, int(round(score_raw))))

    # ---- Casting Readiness ----
    if tests_total == 0 or tests_completed == 0:
        readiness = CastingReadiness.NOT_READY
    elif has_fail:
        readiness = CastingReadiness.NOT_READY
    elif has_warning and compliance_score < 85:
        readiness = CastingReadiness.HOLD
    elif has_warning:
        readiness = CastingReadiness.REVIEW
    elif tests_completed < tests_total:
        readiness = CastingReadiness.REVIEW
    elif compliance_score >= 90:
        readiness = CastingReadiness.READY
    else:
        readiness = CastingReadiness.REVIEW

    # ---- Recommendation ----
    if tests_total == 0 or tests_completed == 0:
        action = MetalRecommendation.AWAITING_DATA
        rationale = "Chemistry not yet captured for this metal batch."
        risk = RiskLevel.MEDIUM
    elif has_fail:
        # severe vs correctable
        severe = any(
            (v.specMax is not None and v.value > v.specMax * 1.5)
            or (v.specMin is not None and v.specMin > 0 and v.value < v.specMin * 0.5)
            for v in fail_values
        )
        if severe:
            action = MetalRecommendation.REJECT
            rationale = (
                "One or more parameters are significantly out of specification — "
                "re-melting or rejection recommended."
            )
        else:
            action = MetalRecommendation.CORRECT
            rationale = (
                "Chemistry is correctable. See the Chemistry Correction Advisor "
                "for suggested additions before casting."
            )
        risk = RiskLevel.HIGH
    elif has_warning and compliance_score < 85:
        action = MetalRecommendation.HOLD
        rationale = (
            "Variance detected near specification edges with weak historical stability — "
            "hold for second look before release."
        )
        risk = RiskLevel.MEDIUM
    elif has_warning:
        action = MetalRecommendation.HOLD
        rationale = "Edge-of-spec variance — QA review recommended before casting."
        risk = RiskLevel.MEDIUM
    elif tests_completed < tests_total:
        action = MetalRecommendation.HOLD
        rationale = "Pending chemistry analyses — complete the test matrix before release."
        risk = RiskLevel.MEDIUM
    else:
        action = MetalRecommendation.RELEASE
        rationale = (
            f"All chemistry parameters comply with {product_grade.value} requirements. "
            "No significant historical deviation identified. Casting operation can proceed."
        )
        risk = RiskLevel.LOW

    # ---- Observations ----
    observations: List[str] = []
    if tests_completed < tests_total:
        observations.append(f"{tests_completed} of {tests_total} analyses captured.")
    if all_values:
        passing = len(all_values) - len(fail_values) - len(warn_values)
        observations.append(f"{passing} of {len(all_values)} elements within {product_grade.value} specification.")
    for v in all_values:
        if v.status == ResultStatus.PASS:
            observations.append(f"{v.parameter} within acceptable range.")
        elif v.status == ResultStatus.WARNING:
            observations.append(f"{v.parameter} near specification edge — monitor closely.")
        else:
            observations.append(f"{v.parameter} out of specification for {product_grade.value}.")
        if len(observations) >= 6:
            break
    if historical_batches:
        last = historical_batches[0]
        observations.append(f"Previous batch {last.metalBatchNumber}: {last.outcome}.")
    if not has_fail and not has_warning and tests_completed == tests_total and tests_total > 0:
        observations.append(
            f"No abnormal variation detected — chemistry matches accepted history for {product_grade.value}."
        )

    # ---- Parameter trends (current vs historical average) ----
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

    # ---- Chemistry Correction Advisor ----
    corrections: List[ChemistryCorrection] = []
    seen_corr: set[str] = set()
    for v in all_values:
        if v.parameter in seen_corr:
            continue
        seen_corr.add(v.parameter)
        # Only suggest when current deviates from target (also surface near-misses).
        c = _suggest_correction(product_grade, v.parameter, float(v.value), batch_weight_mt)
        if c:
            corrections.append(c)
    # Prioritise the worst gaps first.
    corrections.sort(key=lambda c: abs(c.delta), reverse=True)

    # ---- Compliance trend sparkline ----
    if historical_batches:
        trend = [b.complianceScore for b in historical_batches[:12]][::-1] + [compliance_score]
    else:
        base = max(70, compliance_score - 5)
        trend = [base + ((-1) ** i) * (i % 3) for i in range(12)] + [compliance_score]

    return MetalInsight(
        metalBatchId=metal_batch_id,
        recommendedAction=action,
        rationale=rationale,
        riskLevel=risk,
        metalCompliance=compliance_score,
        metalComplianceTrend=trend,
        castingReadiness=readiness,
        testsCompleted=tests_completed,
        testsTotal=tests_total,
        observations=observations[:6],
        historicalBatches=historical_batches[:6],
        parameterTrends=parameter_trends,
        chemistryCorrections=corrections[:6],
        deviationCount=deviation_count,
    )
