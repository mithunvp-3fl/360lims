from __future__ import annotations
from collections import Counter
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.schemas.common import ReceiptStatus
from app.schemas.test import TestStatus
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


class RoleQueueItem(BaseModel):
    lotNumber: str
    supplier: str
    material: str
    status: str
    riskLevel: str
    receiptDate: str
    callout: str  # short imperative for the user, e.g. "Draw sample"


class RoleQueue(BaseModel):
    role: str
    headline: str
    description: str
    items: List[RoleQueueItem]


def _enrich(r) -> dict:
    s = db.supplier_by_id(r.supplierId)
    m = db.material_by_id(r.materialId)
    return {
        "lotNumber": r.lotNumber,
        "supplier": s.name if s else "",
        "material": m.name if m else "",
        "status": r.status.value,
        "riskLevel": r.riskLevel.value,
        "receiptDate": r.receiptDate,
    }


@router.get("/dashboard/role-queue", response_model=RoleQueue)
def role_queue(role: str = Query(...)) -> RoleQueue:
    receipts = list(db.receipts.values())
    items: List[RoleQueueItem] = []

    if role == "sampler":
        for r in receipts:
            if r.status == ReceiptStatus.PENDING_SAMPLING:
                items.append(RoleQueueItem(**_enrich(r), callout="Draw sample"))
        headline = "Lots awaiting sampling"
        description = "These lots have been received and need a representative sample drawn."

    elif role == "lab-analyst":
        # receipts that have at least one pending test
        pending_test_receipt_ids = set()
        for t in db.tests.values():
            if t.status in {TestStatus.PENDING, TestStatus.IN_PROGRESS}:
                sample = db.samples.get(t.sampleId)
                if sample:
                    pending_test_receipt_ids.add(sample.receiptId)
        for r in receipts:
            if r.id in pending_test_receipt_ids:
                items.append(RoleQueueItem(**_enrich(r), callout="Import / enter results"))
        headline = "Lots with pending tests"
        description = "Samples are drawn and waiting on instrument imports or manual entry."

    elif role == "qa-engineer":
        for r in receipts:
            if r.status == ReceiptStatus.PENDING_REVIEW:
                items.append(RoleQueueItem(**_enrich(r), callout="Review & recommend"))
        headline = "Lots awaiting review"
        description = "Testing is complete. Review results and recommend an action to QA Manager."

    elif role == "qa-manager":
        for r in receipts:
            if r.status == ReceiptStatus.PENDING_REVIEW:
                items.append(RoleQueueItem(**_enrich(r), callout="Approve / Hold / Reject"))
            elif r.status == ReceiptStatus.ON_HOLD:
                items.append(RoleQueueItem(**_enrich(r), callout="Resolve hold"))
        headline = "Lots awaiting your decision"
        description = "Final approvals and on-hold lots needing your attention."

    elif role == "stores-executive":
        for r in receipts:
            if r.status in {ReceiptStatus.APPROVED, ReceiptStatus.REJECTED}:
                items.append(RoleQueueItem(
                    **_enrich(r),
                    callout="Release" if r.status == ReceiptStatus.APPROVED else "Quarantine",
                ))
        headline = "Lots ready for release"
        description = "Approved lots to release to production, rejected lots to quarantine."

    else:  # viewer / unknown
        for r in receipts[:6]:
            items.append(RoleQueueItem(**_enrich(r), callout="Open"))
        headline = "Recent activity"
        description = "Read-only view of the latest lots across the platform."

    items.sort(key=lambda i: i.receiptDate, reverse=True)
    return RoleQueue(role=role, headline=headline, description=description, items=items[:8])
