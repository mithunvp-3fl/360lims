from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException

from app.schemas.audit import AuditLog
from app.store import db
from app.frameworks import audit as audit_fw


router = APIRouter()


@router.get("/audit", response_model=list[AuditLog])
def list_audit(entity_type: Optional[str] = None, entity_id: Optional[str] = None) -> list[AuditLog]:
    return audit_fw.list_for(entity_type, entity_id)


@router.get("/receipts/{lot_number}/audit", response_model=list[AuditLog])
def audit_for_receipt(lot_number: str) -> list[AuditLog]:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    receipt_ids = {r.id}
    sample_ids = {s.id for s in db.samples_for_receipt(r.id)}
    test_ids = {t.id for t in db.tests_for_receipt(r.id)}
    result_ids = {res.id for res in db.results_for_receipt(r.id)}
    logs = audit_fw.all_logs(limit=2000)
    relevant = []
    for log in logs:
        if log.entityType == "receipt" and log.entityId in receipt_ids:
            relevant.append(log)
        elif log.entityType == "sample" and log.entityId in sample_ids:
            relevant.append(log)
        elif log.entityType == "test" and log.entityId in test_ids:
            relevant.append(log)
        elif log.entityType == "result" and log.entityId in result_ids:
            relevant.append(log)
    return relevant
