from __future__ import annotations
import uuid
from fastapi import APIRouter, HTTPException

from app.schemas.approval import Approval, ApprovalCreate, ApprovalDecision
from app.schemas.common import now_iso, ReceiptStatus
from app.store import db
from app.frameworks import audit, notifications as notif, workflow_engine
from app.schemas.notification import NotificationSeverity


router = APIRouter()


@router.get("/receipts/{lot_number}/approvals", response_model=list[Approval])
def list_for_receipt(lot_number: str) -> list[Approval]:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    return sorted(db.approvals_for_receipt(r.id), key=lambda a: a.decidedAt, reverse=True)


@router.post("/receipts/{lot_number}/approvals", response_model=Approval, status_code=201)
def decide(lot_number: str, body: ApprovalCreate) -> Approval:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    if body.decision in {ApprovalDecision.HOLD, ApprovalDecision.REJECTED}:
        if not body.reason or not body.reason.strip():
            raise HTTPException(400, "Hold and Reject require a reason.")

    prev = r.model_dump()
    if body.decision == ApprovalDecision.APPROVED:
        r.status = ReceiptStatus.APPROVED
        message = f"Material approved successfully for {r.lotNumber}."
        title = "Material Approved"
        severity = NotificationSeverity.SUCCESS
        stage_key = "release"
    elif body.decision == ApprovalDecision.HOLD:
        r.status = ReceiptStatus.ON_HOLD
        message = f"Lot {r.lotNumber} placed on hold."
        title = "Material On Hold"
        severity = NotificationSeverity.WARNING
        stage_key = "review"
    else:
        r.status = ReceiptStatus.REJECTED
        message = f"Lot {r.lotNumber} rejected."
        title = "Material Rejected"
        severity = NotificationSeverity.DANGER
        stage_key = "review"

    aid = str(uuid.uuid4())
    approval = Approval(
        id=aid, receiptId=r.id, decision=body.decision,
        reason=body.reason, decidedBy="Current User", decidedAt=now_iso(),
    )
    db.approvals[aid] = approval

    wf = db.workflows.get(r.id)
    if wf:
        workflow_engine.complete_through(wf, stage_key, "Current User")

    audit.record("Current User", "QA Manager", body.decision.value.lower(), "receipt",
                 r.id, prev, r.model_dump(), notes=body.reason)
    notif.emit(title, message, severity, "receipt", r.id)
    return approval
