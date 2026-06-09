from __future__ import annotations
import uuid
from fastapi import APIRouter, HTTPException, Response

from app.schemas.sample import Sample, SampleCreate, SampleStatus
from app.schemas.test import Test, TestStatus
from app.schemas.common import now_iso, ReceiptStatus
from app.store import db
from app.frameworks import audit, notifications as notif, workflow_engine
from app.schemas.notification import NotificationSeverity


router = APIRouter()


def _next_sample_id(receipt_lot: str, receipt_id: str) -> str:
    seq = sum(1 for s in db.samples.values() if s.receiptId == receipt_id) + 1
    suffix = chr(ord("A") + min(seq - 1, 25))
    short = receipt_lot.replace("LOT-", "SMP-")
    return f"{short}-{suffix}"


@router.get("/receipts/{lot_number}/samples", response_model=list[Sample])
def list_for_receipt(lot_number: str) -> list[Sample]:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    return sorted(db.samples_for_receipt(r.id), key=lambda s: s.collectionDate, reverse=True)


@router.post("/receipts/{lot_number}/samples", response_model=Sample, status_code=201)
def create_sample(lot_number: str, body: SampleCreate | None = None) -> Sample:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    body = body or SampleCreate(receiptId=r.id)
    sid = str(uuid.uuid4())
    sample = Sample(
        id=sid,
        sampleId=_next_sample_id(r.lotNumber, r.id),
        receiptId=r.id,
        collectionDate=now_iso(),
        collectedBy=body.collectedBy or "Current User",
        status=SampleStatus.COLLECTED,
        notes=body.notes,
    )
    db.samples[sid] = sample

    # Auto-assign required tests based on material spec
    mat = db.material_by_id(r.materialId)
    if mat:
        for code in mat.requiredTests:
            tid = str(uuid.uuid4())
            test_name_map = {"XRF": "XRF Chemistry", "OES": "OES Chemistry",
                              "MOISTURE": "Moisture", "CS": "Carbon / Sulphur"}
            instrument_map = {"XRF": "XRF-01", "OES": "OES-01",
                              "MOISTURE": "MOIST-01", "CS": "CS-01"}
            params_for_code = {
                "XRF": ["Al", "Si", "Fe", "Cu"],
                "OES": ["Al", "Si", "Fe", "Mg", "Mn", "Zn"],
                "MOISTURE": ["Moisture"],
                "CS": ["Carbon", "Sulphur"],
            }
            t = Test(id=tid, sampleId=sid, code=code,
                     name=test_name_map.get(code, code),
                     parameters=params_for_code.get(code, []),
                     instrumentCode=instrument_map.get(code),
                     status=TestStatus.PENDING, assignedAt=now_iso())
            db.tests[tid] = t

    # advance receipt + workflow
    r.status = ReceiptStatus.PENDING_TESTING
    wf = db.workflows.get(r.id)
    if wf:
        workflow_engine.complete_through(wf, "sample", sample.collectedBy)

    audit.record(sample.collectedBy, "Sampler", "create", "sample", sid, None, sample.model_dump())
    notif.emit("Sample Created", f"Sample {sample.sampleId} collected for {r.lotNumber}.",
               NotificationSeverity.SUCCESS, "sample", sid)
    return sample


@router.post("/receipts/{lot_number}/samples/recollect", response_model=Sample, status_code=201)
def recollect_sample(lot_number: str) -> Sample:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    # mark existing as discarded
    for s in db.samples_for_receipt(r.id):
        prev = s.model_dump()
        s.status = SampleStatus.DISCARDED
        audit.record("Current User", "Sampler", "discard", "sample", s.id, prev, s.model_dump())
    # create a fresh one
    fresh = create_sample(lot_number)  # type: ignore[arg-type]
    fresh_obj = db.samples[fresh.id]
    fresh_obj.status = SampleStatus.RECOLLECTED
    return fresh_obj


@router.delete("/samples/{sample_id}", status_code=204, response_class=Response)
def delete_sample(sample_id: str):
    s = db.samples.get(sample_id)
    if not s:
        raise HTTPException(404, "Sample not found")
    prev = s.model_dump()
    del db.samples[sample_id]
    # cascade tests + results
    for tid in list(db.tests.keys()):
        if db.tests[tid].sampleId == sample_id:
            for rid in list(db.results.keys()):
                if db.results[rid].testId == tid:
                    del db.results[rid]
            del db.tests[tid]
    audit.record("Current User", "QA Manager", "delete", "sample", sample_id, prev, None)
    notif.emit("Sample Deleted", f"Sample {s.sampleId} removed.",
               NotificationSeverity.WARNING, "sample", sample_id)
    return Response(status_code=204)
