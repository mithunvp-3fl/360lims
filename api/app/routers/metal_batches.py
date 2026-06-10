"""Metal Quality Control endpoints (Phase 3).

Endpoint surface mirrors `qualifications.py` — same verbs, same response shape,
keyed by metal batch number instead of qualification number. Decides whether
molten aluminum can be released for casting.
"""
from __future__ import annotations
import uuid
import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Response

from app.schemas.audit import AuditLog
from app.schemas.common import now_iso, RiskLevel
from app.schemas.notification import NotificationSeverity
from app.schemas.metal_batch import (
    MetalApproval,
    MetalApprovalCreate,
    MetalBatch,
    MetalBatchCreate,
    MetalBatchDecision,
    MetalBatchStatus,
    MetalBatchUpdate,
    MetalResult,
    MetalSample,
    MetalSampleCreate,
    MetalTest,
    ProductGrade,
)
from app.schemas.metal_insights import (
    HistoricalMetalBatch,
    MetalInsight,
)
from app.schemas.result import (
    FileUploadRequest,
    InstrumentImportRequest,
    ManualResultCreate,
    ResultSource,
    ResultStatus,
    ResultValue,
)
from app.schemas.sample import SampleStatus
from app.schemas.test import TestStatus
from app.schemas.workflow import Workflow
from app.store import db
from app.frameworks import audit, notifications as notif, workflow_engine
from app.frameworks import metal_insights as metal_fw


router = APIRouter()


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
DEFAULT_TEST_PLAN: List[tuple[str, str, List[str], str]] = [
    ("OES", "OES Chemistry", ["Si", "Fe", "Cu", "Mg", "Zn", "Ti", "Mn"], "OES-01"),
]


def _next_metal_batch_number() -> str:
    nums = []
    for b in db.metal_batches.values():
        try:
            nums.append(int(b.metalBatchNumber.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 1245
    return f"MB-2026-{next_n:06d}"


def _next_metal_sample_id(metal_batch_number: str) -> str:
    batch = db.metal_batch_by_number(metal_batch_number)
    if not batch:
        seq = 1
    else:
        seq = sum(1 for s in db.metal_samples.values() if s.metalBatchId == batch.id) + 1
    suffix = chr(ord("A") + min(seq - 1, 25))
    tail = metal_batch_number.replace("MB-2026-", "")
    return f"MQS-{tail}-{suffix}"


def _outcome_from_status(status: MetalBatchStatus) -> str:
    return {
        MetalBatchStatus.RELEASED: "Released",
        MetalBatchStatus.ON_HOLD: "Held",
        MetalBatchStatus.REJECTED: "Rejected",
        MetalBatchStatus.DOWNGRADED: "Downgraded",
        MetalBatchStatus.CANCELLED: "Cancelled",
    }.get(status, "Open")


def _mock_values_for(test: MetalTest, grade: ProductGrade, instrument_code: str) -> List[ResultValue]:
    rnd = random.Random(f"{instrument_code}|{test.sampleId}|{test.code}|{grade.value}")
    out: List[ResultValue] = []
    for param in test.parameters:
        spec = metal_fw.spec_for(grade, param)
        if spec:
            lo, hi, target = spec
            jitter = (rnd.random() - 0.5) * 0.4 * (hi - lo)
            value = round(max(0.0, target + jitter), 3)
            status = metal_fw._status_for(value, lo, hi)
        else:
            value = round(rnd.uniform(0.01, 0.2), 3)
            status = ResultStatus.PASS
            lo, hi = None, None
        out.append(ResultValue(
            parameter=param,
            value=value,
            unit="%",
            specMin=lo,
            specMax=hi,
            status=status,
        ))
    return out


def _assign_default_tests(sample: MetalSample) -> None:
    for code, name, params, inst_code in DEFAULT_TEST_PLAN:
        tid = str(uuid.uuid4())
        db.metal_tests[tid] = MetalTest(
            id=tid, sampleId=sample.id, code=code, name=name,
            parameters=params, instrumentCode=inst_code,
            status=TestStatus.PENDING, assignedAt=now_iso(),
        )


def _all_tests_done(metal_batch_id: str) -> bool:
    tests = db.mtests_for_batch(metal_batch_id)
    return bool(tests) and all(t.status == TestStatus.COMPLETED for t in tests)


def _advance_after_result(metal_batch_id: str) -> None:
    b = db.metal_batches.get(metal_batch_id)
    if not b:
        return
    if _all_tests_done(metal_batch_id):
        b.status = MetalBatchStatus.PENDING_REVIEW
        wf = db.workflows.get(metal_batch_id)
        if wf:
            workflow_engine.complete_through(wf, "validation", "Current User")
        notif.emit(
            "Chemistry validation completed",
            f"Metal batch {b.metalBatchNumber} ready for QA review.",
            NotificationSeverity.INFO,
            "metal-batch", b.id,
        )


# --------------------------------------------------------------------------
# Metal Batches — CRUD + queue
# --------------------------------------------------------------------------
@router.get("/metal-batches", response_model=list[MetalBatch])
def list_metal_batches(
    status: Optional[MetalBatchStatus] = None,
    product_grade: Optional[ProductGrade] = None,
    potline: Optional[str] = None,
    risk: Optional[RiskLevel] = None,
    search: Optional[str] = None,
) -> list[MetalBatch]:
    items = list(db.metal_batches.values())
    if status:
        items = [b for b in items if b.status == status]
    if product_grade:
        items = [b for b in items if b.productGrade == product_grade]
    if potline:
        items = [b for b in items if b.potline == potline]
    if risk:
        items = [b for b in items if b.riskLevel == risk]
    if search:
        s = search.lower()

        def hay(b: MetalBatch) -> str:
            return " ".join([
                b.metalBatchNumber, b.productGrade.value, b.potline,
                b.assignedTo or "", b.operator or "",
            ]).lower()

        items = [b for b in items if s in hay(b)]
    items.sort(key=lambda b: b.createdAt, reverse=True)
    return items


@router.get("/metal-batches/{metal_batch_number}", response_model=MetalBatch)
def get_metal_batch(metal_batch_number: str) -> MetalBatch:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    return b


@router.post("/metal-batches", response_model=MetalBatch, status_code=201)
def create_metal_batch(body: MetalBatchCreate) -> MetalBatch:
    bid = str(uuid.uuid4())
    number = _next_metal_batch_number()
    batch = MetalBatch(
        id=bid,
        metalBatchNumber=number,
        productGrade=body.productGrade,
        potline=body.potline,
        shift=body.shift,
        productionDate=body.productionDate or now_iso(),
        weight=body.weight,
        uom="MT",
        operator=body.operator,
        status=MetalBatchStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        createdAt=now_iso(),
        createdBy="Current User",
        notes=body.notes,
    )
    db.metal_batches[bid] = batch
    wf = workflow_engine.create_workflow("metal-quality-control", bid)
    workflow_engine.complete_through(wf, "batch", "Current User")
    db.workflows[bid] = wf

    audit.record("Current User", "Casthouse Operator", "create", "metal-batch",
                 bid, None, batch.model_dump())
    notif.emit(
        "Metal batch created successfully",
        f"{number} created — {body.productGrade.value} on {body.potline} ({body.weight} MT).",
        NotificationSeverity.SUCCESS,
        "metal-batch", bid,
    )
    return batch


@router.patch("/metal-batches/{metal_batch_number}", response_model=MetalBatch)
def update_metal_batch(metal_batch_number: str, body: MetalBatchUpdate) -> MetalBatch:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    prev = b.model_dump()
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(b, k, v)
    audit.record("Current User", "Casthouse Operator", "update", "metal-batch",
                 b.id, prev, b.model_dump())
    notif.emit("Metal batch updated", f"{b.metalBatchNumber} updated.",
               NotificationSeverity.INFO, "metal-batch", b.id)
    return b


@router.post("/metal-batches/{metal_batch_number}/cancel", response_model=MetalBatch)
def cancel_metal_batch(metal_batch_number: str) -> MetalBatch:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    prev = b.model_dump()
    b.status = MetalBatchStatus.CANCELLED
    audit.record("Current User", "QA Manager", "cancel", "metal-batch",
                 b.id, prev, b.model_dump())
    notif.emit("Metal batch cancelled", f"{b.metalBatchNumber} cancelled.",
               NotificationSeverity.WARNING, "metal-batch", b.id)
    return b


@router.post("/metal-batches/{metal_batch_number}/clone", response_model=MetalBatch, status_code=201)
def clone_metal_batch(metal_batch_number: str) -> MetalBatch:
    src = db.metal_batch_by_number(metal_batch_number)
    if not src:
        raise HTTPException(404, "Metal batch not found")
    bid = str(uuid.uuid4())
    number = _next_metal_batch_number()
    clone = MetalBatch(
        id=bid,
        metalBatchNumber=number,
        productGrade=src.productGrade,
        potline=src.potline,
        shift=src.shift,
        productionDate=now_iso(),
        weight=src.weight,
        uom=src.uom,
        operator=src.operator,
        status=MetalBatchStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        createdAt=now_iso(),
        createdBy="Current User",
        notes=f"Cloned from {src.metalBatchNumber}",
    )
    db.metal_batches[bid] = clone
    wf = workflow_engine.create_workflow("metal-quality-control", bid)
    workflow_engine.complete_through(wf, "batch", "Current User")
    db.workflows[bid] = wf
    audit.record("Current User", "Casthouse Operator", "clone", "metal-batch",
                 bid, src.model_dump(), clone.model_dump())
    notif.emit("Metal batch cloned", f"{number} cloned from {src.metalBatchNumber}.",
               NotificationSeverity.SUCCESS, "metal-batch", bid)
    return clone


@router.get("/metal-batches/{metal_batch_number}/workflow", response_model=Workflow)
def get_metal_batch_workflow(metal_batch_number: str) -> Workflow:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    wf = db.workflows.get(b.id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


# --------------------------------------------------------------------------
# Samples
# --------------------------------------------------------------------------
@router.get("/metal-batches/{metal_batch_number}/samples", response_model=list[MetalSample])
def list_metal_samples(metal_batch_number: str) -> list[MetalSample]:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    return sorted(db.msamples_for_batch(b.id), key=lambda s: s.collectionDate, reverse=True)


@router.post(
    "/metal-batches/{metal_batch_number}/samples",
    response_model=MetalSample, status_code=201,
)
def create_metal_sample(
    metal_batch_number: str, body: MetalSampleCreate | None = None,
) -> MetalSample:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    body = body or MetalSampleCreate()
    sid = str(uuid.uuid4())
    sample = MetalSample(
        id=sid,
        sampleId=_next_metal_sample_id(b.metalBatchNumber),
        metalBatchId=b.id,
        collectionDate=now_iso(),
        collectedBy=body.collectedBy or "Current User",
        status=SampleStatus.COLLECTED,
        notes=body.notes,
    )
    db.metal_samples[sid] = sample
    _assign_default_tests(sample)

    b.status = MetalBatchStatus.PENDING_TESTING
    wf = db.workflows.get(b.id)
    if wf:
        workflow_engine.complete_through(wf, "sample", sample.collectedBy)

    audit.record(sample.collectedBy, "Lab Analyst", "create", "metal-sample",
                 sid, None, sample.model_dump())
    notif.emit(
        "Sample generated successfully",
        f"Sample {sample.sampleId} drawn for {b.metalBatchNumber}.",
        NotificationSeverity.SUCCESS,
        "metal-sample", sid,
    )
    return sample


@router.post(
    "/metal-batches/{metal_batch_number}/samples/recollect",
    response_model=MetalSample, status_code=201,
)
def recollect_metal_sample(metal_batch_number: str) -> MetalSample:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    for s in db.msamples_for_batch(b.id):
        prev = s.model_dump()
        s.status = SampleStatus.DISCARDED
        audit.record("Current User", "Lab Analyst", "discard", "metal-sample",
                     s.id, prev, s.model_dump())
    fresh = create_metal_sample(metal_batch_number, MetalSampleCreate())
    fresh_obj = db.metal_samples[fresh.id]
    fresh_obj.status = SampleStatus.RECOLLECTED
    return fresh_obj


@router.delete("/metal-samples/{sample_id}", status_code=204, response_class=Response)
def delete_metal_sample(sample_id: str) -> Response:
    s = db.metal_samples.get(sample_id)
    if not s:
        raise HTTPException(404, "Sample not found")
    prev = s.model_dump()
    del db.metal_samples[sample_id]
    for tid in list(db.metal_tests.keys()):
        if db.metal_tests[tid].sampleId == sample_id:
            for rid in list(db.metal_results.keys()):
                if db.metal_results[rid].testId == tid:
                    del db.metal_results[rid]
            del db.metal_tests[tid]
    audit.record("Current User", "QA Manager", "delete", "metal-sample",
                 sample_id, prev, None)
    notif.emit("Sample removed", f"Sample {s.sampleId} removed.",
               NotificationSeverity.WARNING, "metal-sample", sample_id)
    return Response(status_code=204)


# --------------------------------------------------------------------------
# Tests + Results
# --------------------------------------------------------------------------
@router.get("/metal-batches/{metal_batch_number}/tests", response_model=list[MetalTest])
def list_metal_tests(metal_batch_number: str) -> list[MetalTest]:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    return db.mtests_for_batch(b.id)


@router.get("/metal-batches/{metal_batch_number}/results", response_model=list[MetalResult])
def list_metal_results(metal_batch_number: str) -> list[MetalResult]:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    return sorted(db.mresults_for_batch(b.id), key=lambda r: r.enteredAt, reverse=True)


def _record_result(
    *,
    test: MetalTest,
    batch: MetalBatch,
    values: List[ResultValue],
    source: ResultSource,
    entered_by: str,
    instrument_code: Optional[str] = None,
    reason: Optional[str] = None,
    file_name: Optional[str] = None,
) -> MetalResult:
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in values):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in values):
        overall = ResultStatus.WARNING
    rid = str(uuid.uuid4())
    result = MetalResult(
        id=rid, testId=test.id, sampleId=test.sampleId,
        source=source, values=values,
        enteredBy=entered_by, enteredAt=now_iso(),
        instrumentCode=instrument_code, reason=reason, fileName=file_name,
        overallStatus=overall,
    )
    db.metal_results[rid] = result
    test.status = TestStatus.COMPLETED
    _advance_after_result(batch.id)
    return result


@router.post("/metal-results/instrument-import", response_model=MetalResult, status_code=201)
def metal_import_from_instrument(body: InstrumentImportRequest) -> MetalResult:
    test = db.metal_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.metal_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.metal_batches.get(sample.metalBatchId)
    if not batch:
        raise HTTPException(404, "Metal batch not found")

    values = _mock_values_for(test, batch.productGrade, body.instrumentCode)
    instrument_name = next((i.name for i in db.instruments.values() if i.code == body.instrumentCode), body.instrumentCode)

    result = _record_result(
        test=test, batch=batch, values=values,
        source=ResultSource.INSTRUMENT,
        entered_by=f"System ({instrument_name})",
        instrument_code=body.instrumentCode,
    )

    for inst in db.instruments.values():
        if inst.code == body.instrumentCode:
            inst.lastImportAt = now_iso()
            inst.importsThisWeek += 1
            break

    wf = db.workflows.get(batch.id)
    if wf:
        workflow_engine.complete_through(wf, "oes", f"System ({instrument_name})")

    audit.record(
        "Current User", "Lab Analyst", "import", "metal-result",
        result.id, None,
        {"instrument": body.instrumentCode, "test": test.code,
         "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "OES results imported",
        f"{test.name}: {len(values)} parameter(s) captured from {instrument_name}.",
        NotificationSeverity.SUCCESS,
        "metal-result", result.id,
        meta={
            "instrument": instrument_name,
            "instrumentCode": body.instrumentCode,
            "sampleId": sample.sampleId,
            "testCode": test.code, "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "metalBatchNumber": batch.metalBatchNumber,
        },
    )
    return result


@router.post("/metal-results/manual", response_model=MetalResult, status_code=201)
def metal_manual_entry(body: ManualResultCreate) -> MetalResult:
    test = db.metal_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.metal_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.metal_batches.get(sample.metalBatchId)
    if not batch:
        raise HTTPException(404, "Metal batch not found")
    if not body.reason or not body.reason.strip():
        raise HTTPException(400, "A reason is required for manual entries.")

    enriched: List[ResultValue] = []
    for v in body.values:
        spec = metal_fw.spec_for(batch.productGrade, v.parameter)
        if spec:
            lo, hi, _ = spec
            status = metal_fw._status_for(v.value, lo, hi)
            enriched.append(ResultValue(
                parameter=v.parameter, value=v.value,
                unit=v.unit or "%",
                specMin=lo, specMax=hi, status=status,
            ))
        else:
            enriched.append(ResultValue(
                parameter=v.parameter, value=v.value,
                unit=v.unit or "%",
                specMin=v.specMin, specMax=v.specMax,
                status=ResultStatus.PASS,
            ))
    result = _record_result(
        test=test, batch=batch, values=enriched,
        source=ResultSource.MANUAL,
        entered_by="Current User",
        reason=body.reason,
    )
    audit.record(
        "Current User", "Lab Analyst", "manual-entry", "metal-result",
        result.id, None,
        {"reason": body.reason, "values": [v.model_dump() for v in enriched]},
    )
    notif.emit(
        "Manual chemistry captured",
        f"{test.name} entered by lab analyst ({body.reason}).",
        NotificationSeverity.INFO,
        "metal-result", result.id,
        meta={
            "testCode": test.code, "testName": test.name,
            "reason": body.reason,
            "parameterCount": len(enriched),
            "parameters": [v.parameter for v in enriched],
            "overallStatus": result.overallStatus.value,
            "metalBatchNumber": batch.metalBatchNumber,
        },
    )
    return result


@router.post("/metal-results/file-upload", response_model=MetalResult, status_code=201)
def metal_file_upload(body: FileUploadRequest) -> MetalResult:
    test = db.metal_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.metal_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.metal_batches.get(sample.metalBatchId)
    if not batch:
        raise HTTPException(404, "Metal batch not found")

    values = _mock_values_for(test, batch.productGrade, "FILE-UPLOAD")
    result = _record_result(
        test=test, batch=batch, values=values,
        source=ResultSource.FILE_UPLOAD,
        entered_by="Current User",
        file_name=body.fileName,
    )
    audit.record(
        "Current User", "Lab Analyst", "file-upload", "metal-result",
        result.id, None,
        {"fileName": body.fileName, "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "Chemistry file processed",
        f"{body.fileName} parsed — {len(values)} parameter(s) extracted.",
        NotificationSeverity.SUCCESS,
        "metal-result", result.id,
        meta={
            "fileName": body.fileName,
            "testCode": test.code, "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "metalBatchNumber": batch.metalBatchNumber,
        },
    )
    return result


@router.post("/metal-results/{result_id}/retest", response_model=MetalTest, status_code=201)
def metal_retest(result_id: str) -> MetalTest:
    r = db.metal_results.get(result_id)
    if not r:
        raise HTTPException(404, "Result not found")
    t = db.metal_tests.get(r.testId)
    if not t:
        raise HTTPException(404, "Test not found")
    t.status = TestStatus.PENDING
    del db.metal_results[result_id]
    audit.record("Current User", "Lab Analyst", "retest", "metal-test",
                 t.id, r.model_dump(), None)
    notif.emit("Retest requested", f"{t.name} flagged for retest.",
               NotificationSeverity.INFO, "metal-test", t.id)
    return t


# --------------------------------------------------------------------------
# Approvals — release / hold / reject / downgrade
# --------------------------------------------------------------------------
@router.get("/metal-batches/{metal_batch_number}/approvals", response_model=list[MetalApproval])
def list_metal_approvals(metal_batch_number: str) -> list[MetalApproval]:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    return sorted(db.mapprovals_for_batch(b.id), key=lambda a: a.decidedAt, reverse=True)


@router.post(
    "/metal-batches/{metal_batch_number}/approvals",
    response_model=MetalApproval, status_code=201,
)
def decide_metal_batch(
    metal_batch_number: str, body: MetalApprovalCreate,
) -> MetalApproval:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    if body.decision in {MetalBatchDecision.HOLD, MetalBatchDecision.REJECT, MetalBatchDecision.DOWNGRADE}:
        if not body.reason or not body.reason.strip():
            raise HTTPException(400, "Hold, Reject, and Downgrade require a reason.")
    if body.decision == MetalBatchDecision.DOWNGRADE and not body.targetGrade:
        raise HTTPException(400, "Downgrade requires a target grade.")

    prev = b.model_dump()
    if body.decision == MetalBatchDecision.RELEASE:
        b.status = MetalBatchStatus.RELEASED
        title = "Casting release approved"
        message = f"{b.metalBatchNumber} released for casting ({b.productGrade.value} on {b.potline})."
        severity = NotificationSeverity.SUCCESS
        stage_key = "release"
    elif body.decision == MetalBatchDecision.HOLD:
        b.status = MetalBatchStatus.ON_HOLD
        title = "Metal batch placed on hold"
        message = f"{b.metalBatchNumber} held — {body.reason}."
        severity = NotificationSeverity.WARNING
        stage_key = "review"
    elif body.decision == MetalBatchDecision.DOWNGRADE:
        b.status = MetalBatchStatus.DOWNGRADED
        if body.targetGrade:
            b.productGrade = body.targetGrade
        title = "Grade downgraded"
        message = f"{b.metalBatchNumber} downgraded to {b.productGrade.value}."
        severity = NotificationSeverity.WARNING
        stage_key = "release"
    else:
        b.status = MetalBatchStatus.REJECTED
        title = "Metal batch rejected"
        message = f"{b.metalBatchNumber} rejected — {body.reason}."
        severity = NotificationSeverity.DANGER
        stage_key = "review"

    aid = str(uuid.uuid4())
    approval = MetalApproval(
        id=aid, metalBatchId=b.id,
        decision=body.decision, reason=body.reason,
        targetGrade=body.targetGrade,
        decidedBy="Current User", decidedAt=now_iso(),
    )
    db.metal_approvals[aid] = approval

    wf = db.workflows.get(b.id)
    if wf:
        workflow_engine.complete_through(wf, stage_key, "Current User")

    audit.record(
        "Current User", "QA Manager",
        body.decision.value.lower(), "metal-batch",
        b.id, prev, b.model_dump(), notes=body.reason,
    )
    notif.emit(title, message, severity, "metal-batch", b.id)
    return approval


# --------------------------------------------------------------------------
# Insights
# --------------------------------------------------------------------------
@router.get("/metal-batches/{metal_batch_number}/insights", response_model=MetalInsight)
def metal_insights(metal_batch_number: str) -> MetalInsight:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")

    tests = db.mtests_for_batch(b.id)
    results = db.mresults_for_batch(b.id)

    # historical batches for the same grade + potline
    history: List[HistoricalMetalBatch] = []
    historical_result_ids: set[str] = set()
    score_map = {
        MetalBatchStatus.RELEASED: 94,
        MetalBatchStatus.PENDING_REVIEW: 80,
        MetalBatchStatus.PENDING_TESTING: 62,
        MetalBatchStatus.PENDING_SAMPLING: 48,
        MetalBatchStatus.ON_HOLD: 58,
        MetalBatchStatus.DOWNGRADED: 70,
        MetalBatchStatus.REJECTED: 40,
        MetalBatchStatus.CANCELLED: 32,
    }
    for other in db.metal_batches.values():
        if other.id == b.id:
            continue
        if other.productGrade != b.productGrade:
            continue
        if other.potline != b.potline:
            continue
        history.append(HistoricalMetalBatch(
            metalBatchNumber=other.metalBatchNumber,
            productGrade=other.productGrade,
            potline=other.potline,
            createdAt=other.createdAt,
            outcome=_outcome_from_status(other.status),
            complianceScore=score_map.get(other.status, 60),
            riskLevel=other.riskLevel,
        ))
        for past in db.mresults_for_batch(other.id):
            historical_result_ids.add(past.id)
    history.sort(key=lambda h: h.createdAt, reverse=True)
    historical_results = [
        db.metal_results[rid]
        for rid in historical_result_ids
        if rid in db.metal_results
    ]

    return metal_fw.compute(
        metal_batch_id=b.id,
        product_grade=b.productGrade,
        batch_weight_mt=b.weight,
        tests=tests,
        results=results,
        historical_batches=history,
        historical_results=historical_results,
    )


# --------------------------------------------------------------------------
# Audit (metal-batch-scoped roll-up)
# --------------------------------------------------------------------------
@router.get("/metal-batches/{metal_batch_number}/audit", response_model=list[AuditLog])
def metal_audit(metal_batch_number: str) -> list[AuditLog]:
    b = db.metal_batch_by_number(metal_batch_number)
    if not b:
        raise HTTPException(404, "Metal batch not found")
    sample_ids = {s.id for s in db.msamples_for_batch(b.id)}
    test_ids = {t.id for t in db.mtests_for_batch(b.id)}
    result_ids = {r.id for r in db.mresults_for_batch(b.id)}
    relevant: list[AuditLog] = []
    for log in audit.all_logs(limit=2000):
        if log.entityType == "metal-batch" and log.entityId == b.id:
            relevant.append(log)
        elif log.entityType == "metal-sample" and log.entityId in sample_ids:
            relevant.append(log)
        elif log.entityType == "metal-test" and log.entityId in test_ids:
            relevant.append(log)
        elif log.entityType == "metal-result" and log.entityId in result_ids:
            relevant.append(log)
    return relevant


# --------------------------------------------------------------------------
# Queue summary (for dashboard reuse)
# --------------------------------------------------------------------------
@router.get("/metal-batches/queue/summary")
def metal_summary() -> dict:
    items = list(db.metal_batches.values())
    statuses = {s.value: 0 for s in MetalBatchStatus}
    for b in items:
        statuses[b.status.value] = statuses.get(b.status.value, 0) + 1
    return {"total": len(items), "byStatus": statuses}
