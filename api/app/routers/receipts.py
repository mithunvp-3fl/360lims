from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.receipt import Receipt, ReceiptCreate, ReceiptUpdate
from app.schemas.common import ReceiptStatus, RiskLevel, now_iso
from app.schemas.workflow import Workflow
from app.store import db
from app.frameworks import audit, notifications as notif, workflow_engine
from app.schemas.notification import NotificationSeverity


router = APIRouter()


def _next_lot_number() -> str:
    nums = []
    for r in db.receipts.values():
        try:
            nums.append(int(r.lotNumber.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 1
    return f"LOT-2026-{next_n:04d}"


@router.get("/receipts", response_model=list[Receipt])
def list_receipts(
    status: Optional[ReceiptStatus] = None,
    supplier_id: Optional[str] = None,
    material_id: Optional[str] = None,
    search: Optional[str] = None,
) -> list[Receipt]:
    items = list(db.receipts.values())
    if status:
        items = [r for r in items if r.status == status]
    if supplier_id:
        items = [r for r in items if r.supplierId == supplier_id]
    if material_id:
        items = [r for r in items if r.materialId == material_id]
    if search:
        q = search.lower()
        def hay(r: Receipt) -> str:
            s = db.supplier_by_id(r.supplierId)
            m = db.material_by_id(r.materialId)
            return " ".join([r.lotNumber, r.vehicleNumber, r.poNumber,
                             s.name if s else "", m.name if m else ""]).lower()
        items = [r for r in items if q in hay(r)]
    items.sort(key=lambda r: r.receiptDate, reverse=True)
    return items


@router.get("/receipts/{lot_number}", response_model=Receipt)
def get_receipt(lot_number: str) -> Receipt:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    return r


@router.post("/receipts", response_model=Receipt, status_code=201)
def create_receipt(body: ReceiptCreate) -> Receipt:
    if not db.supplier_by_id(body.supplierId):
        raise HTTPException(400, "Unknown supplier")
    if not db.material_by_id(body.materialId):
        raise HTTPException(400, "Unknown material")

    rid = str(uuid.uuid4())
    lot = _next_lot_number()
    receipt = Receipt(
        id=rid, lotNumber=lot, supplierId=body.supplierId, materialId=body.materialId,
        quantity=body.quantity, uom=body.uom, vehicleNumber=body.vehicleNumber,
        poNumber=body.poNumber, receiptDate=body.receiptDate or now_iso(),
        status=ReceiptStatus.PENDING_SAMPLING, riskLevel=RiskLevel.LOW,
        createdAt=now_iso(), createdBy="Current User", notes=body.notes,
    )
    db.receipts[rid] = receipt
    wf = workflow_engine.create_workflow("incoming-inspection", rid)
    workflow_engine.complete_through(wf, "receipt", "Current User")
    db.workflows[rid] = wf
    audit.record("Current User", "Stores Executive", "create", "receipt", rid, None, receipt.model_dump())
    notif.emit("Receipt Created", f"Lot {lot} created and queued for sampling.",
               NotificationSeverity.SUCCESS, "receipt", rid)
    return receipt


@router.patch("/receipts/{lot_number}", response_model=Receipt)
def update_receipt(lot_number: str, body: ReceiptUpdate) -> Receipt:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    prev = r.model_dump()
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(r, k, v)
    audit.record("Current User", "Stores Executive", "update", "receipt", r.id, prev, r.model_dump())
    notif.emit("Receipt Updated", f"Lot {r.lotNumber} updated.", NotificationSeverity.INFO, "receipt", r.id)
    return r


@router.post("/receipts/{lot_number}/cancel", response_model=Receipt)
def cancel_receipt(lot_number: str) -> Receipt:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    prev = r.model_dump()
    r.status = ReceiptStatus.REJECTED
    audit.record("Current User", "QA Manager", "cancel", "receipt", r.id, prev, r.model_dump())
    notif.emit("Receipt Cancelled", f"Lot {r.lotNumber} cancelled.", NotificationSeverity.WARNING, "receipt", r.id)
    return r


@router.post("/receipts/{lot_number}/clone", response_model=Receipt, status_code=201)
def clone_receipt(lot_number: str) -> Receipt:
    src = db.receipt_by_lot(lot_number)
    if not src:
        raise HTTPException(404, "Receipt not found")
    rid = str(uuid.uuid4())
    lot = _next_lot_number()
    clone = Receipt(
        id=rid, lotNumber=lot, supplierId=src.supplierId, materialId=src.materialId,
        quantity=src.quantity, uom=src.uom, vehicleNumber=src.vehicleNumber,
        poNumber=src.poNumber + "-CLONE", receiptDate=now_iso(),
        status=ReceiptStatus.PENDING_SAMPLING, riskLevel=RiskLevel.LOW,
        createdAt=now_iso(), createdBy="Current User",
        notes=f"Cloned from {src.lotNumber}",
    )
    db.receipts[rid] = clone
    wf = workflow_engine.create_workflow("incoming-inspection", rid)
    workflow_engine.complete_through(wf, "receipt", "Current User")
    db.workflows[rid] = wf
    audit.record("Current User", "Stores Executive", "clone", "receipt", rid, src.model_dump(), clone.model_dump())
    notif.emit("Receipt Cloned", f"Lot {lot} cloned from {src.lotNumber}.",
               NotificationSeverity.SUCCESS, "receipt", rid)
    return clone


@router.get("/receipts/{lot_number}/workflow", response_model=Workflow)
def get_workflow(lot_number: str) -> Workflow:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    wf = db.workflows.get(r.id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf
