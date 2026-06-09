from __future__ import annotations
from collections import Counter
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.common import ReceiptStatus
from app.store import db


router = APIRouter()


class DashboardKPI(BaseModel):
    label: str
    value: int | float
    unit: str | None = None
    deltaPct: float | None = None
    accent: str = "info"  # info | success | warning | danger


class StatusSlice(BaseModel):
    status: str
    count: int


class SupplierMix(BaseModel):
    supplierName: str
    approved: int
    rejected: int
    onHold: int


class DashboardSummary(BaseModel):
    kpis: List[DashboardKPI]
    statusBreakdown: List[StatusSlice]
    supplierMix: List[SupplierMix]
    weeklyVolume: List[int]
    riskHotspots: List[dict]


@router.get("/dashboard/summary", response_model=DashboardSummary)
def summary() -> DashboardSummary:
    statuses = Counter(r.status.value for r in db.receipts.values())
    total = sum(statuses.values())
    pending_review = statuses.get(ReceiptStatus.PENDING_REVIEW.value, 0)
    on_hold = statuses.get(ReceiptStatus.ON_HOLD.value, 0)
    approved = statuses.get(ReceiptStatus.APPROVED.value, 0)
    rejected = statuses.get(ReceiptStatus.REJECTED.value, 0)

    instruments_online = sum(1 for i in db.instruments.values() if i.status.value == "Online")
    instruments_total = len(db.instruments)

    kpis = [
        DashboardKPI(label="Open Lots", value=total - approved - rejected, accent="info", deltaPct=4.2),
        DashboardKPI(label="Awaiting Review", value=pending_review, accent="warning", deltaPct=-1.1),
        DashboardKPI(label="Approval Rate", value=round((approved / max(total, 1)) * 100, 1), unit="%", accent="success", deltaPct=2.4),
        DashboardKPI(label="Instruments Online", value=instruments_online, unit=f"/ {instruments_total}", accent="success"),
    ]

    breakdown = [StatusSlice(status=s, count=c) for s, c in statuses.items()]

    # supplier mix
    supplier_mix: List[SupplierMix] = []
    for s in db.suppliers.values():
        rs = [r for r in db.receipts.values() if r.supplierId == s.id]
        supplier_mix.append(SupplierMix(
            supplierName=s.name,
            approved=sum(1 for r in rs if r.status == ReceiptStatus.APPROVED),
            rejected=sum(1 for r in rs if r.status == ReceiptStatus.REJECTED),
            onHold=sum(1 for r in rs if r.status == ReceiptStatus.ON_HOLD),
        ))

    # synthetic weekly volume
    weekly = [12, 14, 10, 16, 18, 15, 22, 19, 24, 21, 26, 23]

    hotspots = []
    for r in db.receipts.values():
        if r.status in {ReceiptStatus.ON_HOLD, ReceiptStatus.REJECTED} or r.riskLevel.value in {"High"}:
            supplier = db.supplier_by_id(r.supplierId)
            material = db.material_by_id(r.materialId)
            hotspots.append({
                "lotNumber": r.lotNumber,
                "supplier": supplier.name if supplier else "",
                "material": material.name if material else "",
                "status": r.status.value,
                "risk": r.riskLevel.value,
            })

    return DashboardSummary(
        kpis=kpis,
        statusBreakdown=breakdown,
        supplierMix=supplier_mix,
        weeklyVolume=weekly,
        riskHotspots=hotspots,
    )
