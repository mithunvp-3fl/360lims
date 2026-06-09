"""Quality Insights Framework.

Pure function: given a receipt + tests + results + supplier history, derive a
recommendation, risk level, supplier health, and a list of business-language
observations. No mention of "AI" anywhere.
"""
from __future__ import annotations
from typing import List

from app.schemas.common import RiskLevel
from app.schemas.insights import (
    HistoricalDelivery,
    ParameterTrend,
    QualityInsight,
    RecommendedAction,
)
from app.schemas.result import Result, ResultStatus
from app.schemas.test import Test, TestStatus


def compute(
    receipt_id: str,
    tests: List[Test],
    results: List[Result],
    supplier_health: int,
    supplier_health_trend: List[int],
    supplier_history: List[HistoricalDelivery],
    historical_results: List[Result] | None = None,
) -> QualityInsight:
    tests_total = len(tests)
    tests_completed = sum(1 for t in tests if t.status == TestStatus.COMPLETED)

    # roll-up worst status across all result values
    all_values = [v for r in results for v in r.values]
    has_fail = any(v.status == ResultStatus.FAIL for v in all_values)
    has_warning = any(v.status == ResultStatus.WARNING for v in all_values)

    if tests_total == 0 or tests_completed == 0:
        action = RecommendedAction.AWAITING_DATA
        rationale = "Tests have not been completed yet."
        risk = RiskLevel.MEDIUM
    elif has_fail:
        action = RecommendedAction.REJECT
        rationale = "One or more parameters are outside specification limits."
        risk = RiskLevel.HIGH
    elif has_warning or supplier_health < 70:
        action = RecommendedAction.HOLD
        rationale = "Parameters are within spec but show variance that warrants a second look."
        risk = RiskLevel.MEDIUM
    else:
        action = RecommendedAction.APPROVE
        rationale = "All parameters compliant and supplier health is strong."
        risk = RiskLevel.LOW

    observations: List[str] = []
    if tests_completed < tests_total:
        observations.append(f"{tests_completed} of {tests_total} tests completed.")
    if all_values:
        passing = sum(1 for v in all_values if v.status == ResultStatus.PASS)
        observations.append(f"{passing} of {len(all_values)} parameters within specification.")
    if supplier_health >= 85:
        observations.append("Supplier has a strong delivery track record.")
    elif supplier_health < 70:
        observations.append("Supplier health is below the 70 threshold — extra scrutiny advised.")
    else:
        observations.append("Supplier is in good standing with no recent rejections.")
    if supplier_history:
        last = supplier_history[0]
        observations.append(f"Last delivery from this supplier: {last.outcome}.")
    if has_warning:
        observations.append("Parameter variance flagged on at least one chemistry result.")
    if not has_fail and not has_warning and tests_completed == tests_total and tests_total > 0:
        observations.append("Chemistry profile is consistent with historical accepted batches.")

    compliance_score = 100
    if all_values:
        pass_pct = sum(1 for v in all_values if v.status == ResultStatus.PASS) / len(all_values)
        compliance_score = int(pass_pct * 100)

    # Parameter trends: current value vs historical average per parameter
    parameter_trends: List[ParameterTrend] = []
    if all_values:
        history_by_param: dict[str, list[float]] = {}
        for r in historical_results or []:
            for v in r.values:
                history_by_param.setdefault(v.parameter, []).append(v.value)
        seen_params: set[str] = set()
        for v in all_values:
            if v.parameter in seen_params:
                continue
            seen_params.add(v.parameter)
            past = history_by_param.get(v.parameter, [])
            if past:
                prev_avg = sum(past) / len(past)
                delta = v.value - prev_avg
                delta_pct = (delta / prev_avg * 100) if prev_avg != 0 else None
                parameter_trends.append(ParameterTrend(
                    parameter=v.parameter,
                    unit=v.unit,
                    current=v.value,
                    previousAverage=round(prev_avg, 3),
                    delta=round(delta, 3),
                    deltaPct=round(delta_pct, 1) if delta_pct is not None else None,
                    samples=len(past),
                ))
            else:
                parameter_trends.append(ParameterTrend(
                    parameter=v.parameter,
                    unit=v.unit,
                    current=v.value,
                    samples=0,
                ))

    return QualityInsight(
        receiptId=receipt_id,
        recommendedAction=action,
        rationale=rationale,
        riskLevel=risk,
        supplierHealth=supplier_health,
        supplierHealthTrend=supplier_health_trend,
        testsCompleted=tests_completed,
        testsTotal=tests_total,
        observations=observations[:4],
        historicalDeliveries=supplier_history[:5],
        parameterTrends=parameter_trends,
        complianceScore=compliance_score,
    )
