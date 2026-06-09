from __future__ import annotations
from fastapi import APIRouter, HTTPException

from app.schemas.insights import HistoricalDelivery, QualityInsight
from app.schemas.common import ReceiptStatus, RiskLevel
from app.store import db
from app.frameworks import insights as insights_fw


router = APIRouter()


def _outcome_from_status(status: ReceiptStatus) -> str:
    return {
        ReceiptStatus.APPROVED: "Approved",
        ReceiptStatus.ON_HOLD: "Held",
        ReceiptStatus.REJECTED: "Rejected",
    }.get(status, "Open")


@router.get("/receipts/{lot_number}/insights", response_model=QualityInsight)
def insights_for_receipt(lot_number: str) -> QualityInsight:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    supplier = db.supplier_by_id(r.supplierId)
    tests = db.tests_for_receipt(r.id)
    results = db.results_for_receipt(r.id)

    history = []
    for other in db.receipts.values():
        if other.id == r.id:
            continue
        if other.supplierId != r.supplierId or other.materialId != r.materialId:
            continue
        history.append(HistoricalDelivery(
            lotNumber=other.lotNumber,
            receiptDate=other.receiptDate,
            outcome=_outcome_from_status(other.status),
            riskLevel=other.riskLevel,
        ))
    history.sort(key=lambda h: h.receiptDate, reverse=True)

    supplier_health = supplier.healthScore if supplier else 75
    # fake but plausible 12-week sparkline
    trend_base = max(50, min(supplier_health, 100))
    trend = [max(40, min(100, trend_base + ((-1) ** i) * (i % 5))) for i in range(12)]

    return insights_fw.compute(
        receipt_id=r.id,
        tests=tests,
        results=results,
        supplier_health=supplier_health,
        supplier_health_trend=trend,
        supplier_history=history,
    )
