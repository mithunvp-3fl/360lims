"""Product Quality Testing endpoints (Phase 4).

Endpoint surface mirrors `metal_batches.py` — same verbs, same response shape,
keyed by product batch number. Decides whether a finished product can be
approved for certificate generation.
"""
from __future__ import annotations
import uuid
import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Response

from app.schemas.audit import AuditLog
from app.schemas.common import now_iso, RiskLevel
from app.schemas.notification import NotificationSeverity
from app.schemas.product_batch import (
    ProductApproval,
    ProductApprovalCreate,
    ProductBatch,
    ProductBatchCreate,
    ProductBatchStatus,
    ProductBatchUpdate,
    ProductDecision,
    ProductResult,
    ProductSample,
    ProductSampleCreate,
    ProductTest,
    ProductType,
)
from app.schemas.product_insights import (
    HistoricalProductBatch,
    ProductInsight,
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
from app.schemas.task import (
    ApprovalDecision as TaskApprovalDecision,
    AssignmentType,
    TaskCreate,
    TaskPriority,
    TaskState,
    TaskType,
)
from app.schemas.test import TestStatus
from app.schemas.workflow import Workflow
from app.store import db
from app.frameworks import audit, notifications as notif, task_engine, workflow_engine
from app.frameworks import product_insights as product_fw


router = APIRouter()


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
DEFAULT_TEST_PLAN: List[tuple[str, str, List[str], str]] = [
    ("UTS", "Ultimate Tensile Strength", ["UTS", "YieldStrength", "Elongation"], "UTS-01"),
    ("HARDNESS", "Hardness", ["Hardness"], "HARD-01"),
    ("CONDUCTIVITY", "Conductivity", ["Conductivity"], "COND-01"),
    ("DIMENSIONS", "Dimensions & Weight", ["Length", "Diameter", "Weight"], "DIM-01"),
    ("METALLOGRAPHY", "Microstructure Review", ["GrainSize", "Phase"], "MICRO-01"),
    ("VISUAL", "Visual Inspection", ["SurfaceDefects"], "VIS-INSP"),
]


def _next_product_batch_number() -> str:
    nums = []
    for b in db.product_batches.values():
        try:
            nums.append(int(b.productBatchNumber.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 210
    return f"PB-2026-{next_n:06d}"


def _next_product_sample_id(product_batch_number: str) -> str:
    batch = db.product_batch_by_number(product_batch_number)
    if not batch:
        seq = 1
    else:
        seq = sum(1 for s in db.product_samples.values() if s.productBatchId == batch.id) + 1
    suffix = chr(ord("A") + min(seq - 1, 25))
    tail = product_batch_number.replace("PB-2026-", "")
    return f"PQS-{tail}-{suffix}"


def _outcome_from_status(status: ProductBatchStatus) -> str:
    return {
        ProductBatchStatus.APPROVED: "Approved",
        ProductBatchStatus.ON_HOLD: "Held",
        ProductBatchStatus.REJECTED: "Rejected",
        ProductBatchStatus.RETEST: "Retest",
        ProductBatchStatus.CANCELLED: "Cancelled",
    }.get(status, "Open")


def _mock_values_for(test: ProductTest, product_type: ProductType, instrument_code: str) -> List[ResultValue]:
    rnd = random.Random(f"{instrument_code}|{test.sampleId}|{test.code}|{product_type.value}")
    out: List[ResultValue] = []
    for param in test.parameters:
        spec = product_fw.spec_for(product_type, param)
        unit = product_fw.unit_for(param)
        if spec:
            lo, hi, target = spec
            jitter = (rnd.random() - 0.5) * 0.4 * (hi - lo)
            value = round(max(0.0, target + jitter), 3)
            status = product_fw._status_for(value, lo, hi)
        else:
            value = round(rnd.uniform(0.0, 1.0), 3)
            status = ResultStatus.PASS
            lo, hi = None, None
        out.append(ResultValue(
            parameter=param,
            value=value,
            unit=unit or "%",
            specMin=lo,
            specMax=hi,
            status=status,
        ))
    return out


def _assign_default_tests(sample: ProductSample) -> None:
    for code, name, params, inst_code in DEFAULT_TEST_PLAN:
        tid = str(uuid.uuid4())
        db.product_tests[tid] = ProductTest(
            id=tid, sampleId=sample.id, code=code, name=name,
            parameters=params, instrumentCode=inst_code,
            status=TestStatus.PENDING, assignedAt=now_iso(),
        )


def _all_tests_done(product_batch_id: str) -> bool:
    tests = db.ptests_for_batch(product_batch_id)
    return bool(tests) and all(t.status == TestStatus.COMPLETED for t in tests)


def _advance_after_result(product_batch_id: str) -> None:
    b = db.product_batches.get(product_batch_id)
    if not b:
        return
    if _all_tests_done(product_batch_id):
        b.status = ProductBatchStatus.PENDING_REVIEW
        wf = db.workflows.get(product_batch_id)
        if wf:
            workflow_engine.complete_through(wf, "validation", "Current User")
        notif.emit(
            "Product validation completed",
            f"Product batch {b.productBatchNumber} ready for QA review.",
            NotificationSeverity.INFO,
            "product-batch", b.id,
        )


# --------------------------------------------------------------------------
# Insights + compliance snapshot — single source of truth used by both the
# read endpoint and the post-mutation refresh hook.
# --------------------------------------------------------------------------
_HIST_SCORE_FALLBACK = {
    ProductBatchStatus.APPROVED: 94,
    ProductBatchStatus.PENDING_REVIEW: 80,
    ProductBatchStatus.PENDING_TESTING: 62,
    ProductBatchStatus.PENDING_SAMPLING: 48,
    ProductBatchStatus.ON_HOLD: 58,
    ProductBatchStatus.RETEST: 55,
    ProductBatchStatus.REJECTED: 40,
    ProductBatchStatus.CANCELLED: 32,
}


_STABILITY_STATUSES = {
    ProductBatchStatus.APPROVED,
    ProductBatchStatus.ON_HOLD,
    ProductBatchStatus.RETEST,
}


def _historical_context(batch: ProductBatch) -> tuple[list[HistoricalProductBatch], list[ProductResult]]:
    """Build the historical context fed to insights.compute().

    Only batches that reached a *delivered* outcome (Approved / On Hold / Retest)
    contribute to the stability sample — in-flight (Pending*) and dead-end
    (Rejected / Cancelled) batches are noise for trend comparison.
    """
    history: list[HistoricalProductBatch] = []
    historical_result_ids: set[str] = set()
    for other in db.product_batches.values():
        if other.id == batch.id or other.productType != batch.productType:
            continue
        if other.status not in _STABILITY_STATUSES:
            continue
        score = other.complianceScore if other.complianceScore is not None else _HIST_SCORE_FALLBACK.get(other.status, 60)
        history.append(HistoricalProductBatch(
            productBatchNumber=other.productBatchNumber,
            productType=other.productType,
            createdAt=other.createdAt,
            outcome=_outcome_from_status(other.status),
            complianceScore=score,
            riskLevel=other.riskLevel,
        ))
        for past in db.presults_for_batch(other.id):
            historical_result_ids.add(past.id)
    history.sort(key=lambda h: h.createdAt, reverse=True)
    historical_results = [
        db.product_results[rid] for rid in historical_result_ids if rid in db.product_results
    ]
    return history, historical_results


def _compute_insight(batch: ProductBatch) -> ProductInsight:
    history, historical_results = _historical_context(batch)
    return product_fw.compute(
        product_batch_id=batch.id,
        product_type=batch.productType,
        tests=db.ptests_for_batch(batch.id),
        results=db.presults_for_batch(batch.id),
        historical_batches=history,
        historical_results=historical_results,
    )


def _refresh_compliance_score(batch: ProductBatch) -> None:
    """Snapshot the latest product compliance score onto the batch entity."""
    batch.complianceScore = _compute_insight(batch).productCompliance


# --------------------------------------------------------------------------
# Task engine integration — emits role-owned tasks aligned with the workflow.
# Tests run in parallel (no blockedBy between siblings); QA review is blocked
# by the five mandatory test tasks; QA approval is blocked by the review.
# --------------------------------------------------------------------------
ROLE_PRODUCTION_ENGINEER = "production-engineer"
ROLE_LAB_ANALYST = "lab-analyst"
ROLE_QA_ENGINEER = "qa-engineer"
ROLE_QA_MANAGER = "qa-manager"

MANDATORY_TEST_CODES = {"UTS", "HARDNESS", "CONDUCTIVITY", "METALLOGRAPHY", "VISUAL"}

_OPEN_TASK_STATES = {
    TaskState.NEW, TaskState.ASSIGNED, TaskState.IN_PROGRESS,
    TaskState.WAITING, TaskState.ESCALATED,
}


def _open_tasks_for(entity_type: str, entity_id: str, task_type: Optional[TaskType] = None) -> list:
    out = []
    for t in db.tasks.values():
        if t.entityType != entity_type or t.entityId != entity_id:
            continue
        if task_type is not None and t.taskType != task_type:
            continue
        if t.state not in _OPEN_TASK_STATES:
            continue
        out.append(t)
    return out


def _emit_sampling_task(batch: ProductBatch) -> None:
    task_engine.create_task(
        TaskCreate(
            title=f"Collect product sample — {batch.productBatchNumber}",
            description=f"Draw a representative sample for {batch.productType.value}.",
            taskType=TaskType.SAMPLING,
            moduleKey="product-quality",
            stageKey="sample",
            assignmentType=AssignmentType.ROLE,
            assignedRole=ROLE_LAB_ANALYST,
            entityType="product-batch",
            entityId=batch.id,
            recordKey=batch.productBatchNumber,
            priority=TaskPriority.MEDIUM,
            slaTargetMins=240,
            slaWarningMins=180,
            slaEscalationMins=360,
            nextAction="Collect sample",
            href=f"/product-quality/{batch.productBatchNumber}",
        ),
        actor="Current User",
        actor_role="Production Engineer",
    )


def _emit_test_review_approval_chain(batch: ProductBatch, sample: ProductSample) -> None:
    """Emit one task per scheduled test (parallel), a QA review blocked by the
    mandatory test set, and a QA approval blocked by the review."""
    # Close out any open sampling task — sample is now collected.
    for st in _open_tasks_for("product-batch", batch.id, TaskType.SAMPLING):
        task_engine.complete_task(st.id, actor=sample.collectedBy, actor_role="Lab Analyst")

    mandatory_task_ids: list[str] = []
    for test in db.ptests_for_batch(batch.id):
        if test.sampleId != sample.id:
            continue
        title_suffix = test.code.title() if test.code else test.name
        tt = task_engine.create_task(
            TaskCreate(
                title=f"{test.name} — {batch.productBatchNumber}",
                description=f"Capture {test.name} for sample {sample.sampleId}.",
                taskType=TaskType.TESTING,
                moduleKey="product-quality",
                stageKey="testing",
                assignmentType=AssignmentType.ROLE,
                assignedRole=ROLE_LAB_ANALYST,
                entityType="product-test",
                entityId=test.id,
                recordKey=batch.productBatchNumber,
                priority=TaskPriority.MEDIUM,
                slaTargetMins=360,
                slaWarningMins=240,
                slaEscalationMins=480,
                nextAction=f"Import {title_suffix} result",
                href=f"/product-quality/{batch.productBatchNumber}",
            ),
            actor="Current User",
            actor_role="Lab Analyst",
        )
        if test.code in MANDATORY_TEST_CODES:
            mandatory_task_ids.append(tt.id)

    review = task_engine.create_task(
        TaskCreate(
            title=f"Review product compliance — {batch.productBatchNumber}",
            description="Validate the result set against product specifications and recommend a release action.",
            taskType=TaskType.REVIEW,
            moduleKey="product-quality",
            stageKey="review",
            assignmentType=AssignmentType.ROLE,
            assignedRole=ROLE_QA_ENGINEER,
            entityType="product-batch",
            entityId=batch.id,
            recordKey=batch.productBatchNumber,
            priority=TaskPriority.HIGH,
            blockedBy=mandatory_task_ids,
            slaTargetMins=240,
            slaWarningMins=180,
            slaEscalationMins=360,
            nextAction="Complete review",
            href=f"/product-quality/{batch.productBatchNumber}",
        ),
        actor="Current User",
        actor_role="QA Engineer",
    )

    task_engine.create_task(
        TaskCreate(
            title=f"Approve product batch — {batch.productBatchNumber}",
            description="Approve, hold, reject, or request retest.",
            taskType=TaskType.APPROVAL,
            moduleKey="product-quality",
            stageKey="release",
            assignmentType=AssignmentType.ROLE,
            assignedRole=ROLE_QA_MANAGER,
            entityType="product-batch",
            entityId=batch.id,
            recordKey=batch.productBatchNumber,
            priority=TaskPriority.HIGH,
            blockedBy=[review.id],
            slaTargetMins=180,
            slaWarningMins=120,
            slaEscalationMins=240,
            nextAction="Decide",
            href=f"/product-quality/{batch.productBatchNumber}",
        ),
        actor="Current User",
        actor_role="QA Manager",
    )


def _complete_test_task(test: ProductTest, actor: str) -> None:
    for tt in _open_tasks_for("product-test", test.id, TaskType.TESTING):
        task_engine.complete_task(tt.id, actor=actor, actor_role="Lab Analyst")


_DECISION_TO_APPROVAL = {
    ProductDecision.APPROVE: TaskApprovalDecision.APPROVE,
    ProductDecision.HOLD: TaskApprovalDecision.HOLD,
    ProductDecision.REJECT: TaskApprovalDecision.REJECT,
    ProductDecision.RETEST: TaskApprovalDecision.ESCALATE,
}


def _close_review_and_approval(batch: ProductBatch, decision: ProductDecision, reason: Optional[str], actor: str) -> None:
    for rt in _open_tasks_for("product-batch", batch.id, TaskType.REVIEW):
        task_engine.complete_task(rt.id, actor=actor, actor_role="QA Engineer", note=reason)
    decision_kind = _DECISION_TO_APPROVAL[decision]
    for at in _open_tasks_for("product-batch", batch.id, TaskType.APPROVAL):
        task_engine.decide_approval(at.id, decision_kind, reason, actor=actor, actor_role="QA Manager")


# --------------------------------------------------------------------------
# Product Batches — CRUD + queue
# --------------------------------------------------------------------------
@router.get("/product-batches", response_model=list[ProductBatch])
def list_product_batches(
    status: Optional[ProductBatchStatus] = None,
    product_type: Optional[ProductType] = None,
    risk: Optional[RiskLevel] = None,
    search: Optional[str] = None,
) -> list[ProductBatch]:
    items = list(db.product_batches.values())
    if status:
        items = [b for b in items if b.status == status]
    if product_type:
        items = [b for b in items if b.productType == product_type]
    if risk:
        items = [b for b in items if b.riskLevel == risk]
    if search:
        s = search.lower()

        def hay(b: ProductBatch) -> str:
            return " ".join([
                b.productBatchNumber, b.productType.value,
                b.customer or "", b.assignedTo or "", b.operator or "",
                b.sourceMetalBatchNumber or "",
            ]).lower()

        items = [b for b in items if s in hay(b)]
    items.sort(key=lambda b: b.createdAt, reverse=True)
    return items


@router.get("/product-batches/queue/summary")
def product_summary() -> dict:
    items = list(db.product_batches.values())
    statuses = {s.value: 0 for s in ProductBatchStatus}
    for b in items:
        statuses[b.status.value] = statuses.get(b.status.value, 0) + 1
    return {"total": len(items), "byStatus": statuses}


@router.get("/product-batches/{product_batch_number}", response_model=ProductBatch)
def get_product_batch(product_batch_number: str) -> ProductBatch:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    return b


@router.post("/product-batches", response_model=ProductBatch, status_code=201)
def create_product_batch(body: ProductBatchCreate) -> ProductBatch:
    bid = str(uuid.uuid4())
    number = _next_product_batch_number()
    batch = ProductBatch(
        id=bid,
        productBatchNumber=number,
        productType=body.productType,
        weight=body.weight,
        uom="MT",
        sourceMetalBatchNumber=body.sourceMetalBatchNumber,
        customer=body.customer,
        operator=body.operator,
        productionDate=body.productionDate or now_iso(),
        status=ProductBatchStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        createdAt=now_iso(),
        createdBy="Current User",
        notes=body.notes,
    )
    db.product_batches[bid] = batch
    wf = workflow_engine.create_workflow("product-quality-testing", bid)
    workflow_engine.complete_through(wf, "batch", "Current User")
    db.workflows[bid] = wf

    audit.record("Current User", "Production Engineer", "create", "product-batch",
                 bid, None, batch.model_dump())
    notif.emit(
        "Product batch created successfully",
        f"{number} created — {body.productType.value} ({body.weight} MT).",
        NotificationSeverity.SUCCESS,
        "product-batch", bid,
    )
    _emit_sampling_task(batch)
    return batch


@router.patch("/product-batches/{product_batch_number}", response_model=ProductBatch)
def update_product_batch(product_batch_number: str, body: ProductBatchUpdate) -> ProductBatch:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    prev = b.model_dump()
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(b, k, v)
    audit.record("Current User", "Production Operator", "update", "product-batch",
                 b.id, prev, b.model_dump())
    notif.emit("Product batch updated", f"{b.productBatchNumber} updated.",
               NotificationSeverity.INFO, "product-batch", b.id)
    return b


@router.post("/product-batches/{product_batch_number}/cancel", response_model=ProductBatch)
def cancel_product_batch(product_batch_number: str) -> ProductBatch:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    prev = b.model_dump()
    b.status = ProductBatchStatus.CANCELLED
    audit.record("Current User", "QA Manager", "cancel", "product-batch",
                 b.id, prev, b.model_dump())
    notif.emit("Product batch cancelled", f"{b.productBatchNumber} cancelled.",
               NotificationSeverity.WARNING, "product-batch", b.id)
    return b


@router.post("/product-batches/{product_batch_number}/clone", response_model=ProductBatch, status_code=201)
def clone_product_batch(product_batch_number: str) -> ProductBatch:
    src = db.product_batch_by_number(product_batch_number)
    if not src:
        raise HTTPException(404, "Product batch not found")
    bid = str(uuid.uuid4())
    number = _next_product_batch_number()
    clone = ProductBatch(
        id=bid,
        productBatchNumber=number,
        productType=src.productType,
        weight=src.weight,
        uom=src.uom,
        sourceMetalBatchNumber=src.sourceMetalBatchNumber,
        customer=src.customer,
        operator=src.operator,
        productionDate=now_iso(),
        status=ProductBatchStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        createdAt=now_iso(),
        createdBy="Current User",
        notes=f"Cloned from {src.productBatchNumber}",
    )
    db.product_batches[bid] = clone
    wf = workflow_engine.create_workflow("product-quality-testing", bid)
    workflow_engine.complete_through(wf, "batch", "Current User")
    db.workflows[bid] = wf
    audit.record("Current User", "Production Engineer", "clone", "product-batch",
                 bid, src.model_dump(), clone.model_dump())
    notif.emit("Product batch cloned", f"{number} cloned from {src.productBatchNumber}.",
               NotificationSeverity.SUCCESS, "product-batch", bid)
    _emit_sampling_task(clone)
    return clone


@router.get("/product-batches/{product_batch_number}/workflow", response_model=Workflow)
def get_product_batch_workflow(product_batch_number: str) -> Workflow:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    wf = db.workflows.get(b.id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


# --------------------------------------------------------------------------
# Samples
# --------------------------------------------------------------------------
@router.get("/product-batches/{product_batch_number}/samples", response_model=list[ProductSample])
def list_product_samples(product_batch_number: str) -> list[ProductSample]:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    return sorted(db.psamples_for_batch(b.id), key=lambda s: s.collectionDate, reverse=True)


@router.post(
    "/product-batches/{product_batch_number}/samples",
    response_model=ProductSample, status_code=201,
)
def create_product_sample(
    product_batch_number: str, body: ProductSampleCreate | None = None,
) -> ProductSample:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    body = body or ProductSampleCreate()
    sid = str(uuid.uuid4())
    sample = ProductSample(
        id=sid,
        sampleId=_next_product_sample_id(b.productBatchNumber),
        productBatchId=b.id,
        collectionDate=now_iso(),
        collectedBy=body.collectedBy or "Current User",
        status=SampleStatus.COLLECTED,
        notes=body.notes,
    )
    db.product_samples[sid] = sample
    _assign_default_tests(sample)

    b.status = ProductBatchStatus.PENDING_TESTING
    wf = db.workflows.get(b.id)
    if wf:
        workflow_engine.complete_through(wf, "sample", sample.collectedBy)

    audit.record(sample.collectedBy, "Lab Analyst", "create", "product-sample",
                 sid, None, sample.model_dump())
    notif.emit(
        "Product sample collected",
        f"Sample {sample.sampleId} drawn for {b.productBatchNumber}.",
        NotificationSeverity.SUCCESS,
        "product-sample", sid,
    )
    _emit_test_review_approval_chain(b, sample)
    return sample


@router.post(
    "/product-batches/{product_batch_number}/samples/recollect",
    response_model=ProductSample, status_code=201,
)
def recollect_product_sample(product_batch_number: str) -> ProductSample:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    for s in db.psamples_for_batch(b.id):
        prev = s.model_dump()
        s.status = SampleStatus.DISCARDED
        audit.record("Current User", "Lab Analyst", "discard", "product-sample",
                     s.id, prev, s.model_dump())
    fresh = create_product_sample(product_batch_number, ProductSampleCreate())
    fresh_obj = db.product_samples[fresh.id]
    fresh_obj.status = SampleStatus.RECOLLECTED
    return fresh_obj


@router.delete("/product-samples/{sample_id}", status_code=204, response_class=Response)
def delete_product_sample(sample_id: str) -> Response:
    s = db.product_samples.get(sample_id)
    if not s:
        raise HTTPException(404, "Sample not found")
    prev = s.model_dump()
    del db.product_samples[sample_id]
    for tid in list(db.product_tests.keys()):
        if db.product_tests[tid].sampleId == sample_id:
            for rid in list(db.product_results.keys()):
                if db.product_results[rid].testId == tid:
                    del db.product_results[rid]
            del db.product_tests[tid]
    audit.record("Current User", "QA Manager", "delete", "product-sample",
                 sample_id, prev, None)
    notif.emit("Sample removed", f"Sample {s.sampleId} removed.",
               NotificationSeverity.WARNING, "product-sample", sample_id)
    return Response(status_code=204)


# --------------------------------------------------------------------------
# Tests + Results
# --------------------------------------------------------------------------
@router.get("/product-batches/{product_batch_number}/tests", response_model=list[ProductTest])
def list_product_tests(product_batch_number: str) -> list[ProductTest]:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    return db.ptests_for_batch(b.id)


@router.get("/product-batches/{product_batch_number}/results", response_model=list[ProductResult])
def list_product_results(product_batch_number: str) -> list[ProductResult]:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    return sorted(db.presults_for_batch(b.id), key=lambda r: r.enteredAt, reverse=True)


def _record_result(
    *,
    test: ProductTest,
    batch: ProductBatch,
    values: List[ResultValue],
    source: ResultSource,
    entered_by: str,
    instrument_code: Optional[str] = None,
    reason: Optional[str] = None,
    file_name: Optional[str] = None,
) -> ProductResult:
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in values):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in values):
        overall = ResultStatus.WARNING
    rid = str(uuid.uuid4())
    result = ProductResult(
        id=rid, testId=test.id, sampleId=test.sampleId,
        source=source, values=values,
        enteredBy=entered_by, enteredAt=now_iso(),
        instrumentCode=instrument_code, reason=reason, fileName=file_name,
        overallStatus=overall,
    )
    db.product_results[rid] = result
    test.status = TestStatus.COMPLETED
    _complete_test_task(test, entered_by)
    _advance_after_result(batch.id)
    _refresh_compliance_score(batch)
    return result


@router.post("/product-results/instrument-import", response_model=ProductResult, status_code=201)
def product_import_from_instrument(body: InstrumentImportRequest) -> ProductResult:
    test = db.product_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.product_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.product_batches.get(sample.productBatchId)
    if not batch:
        raise HTTPException(404, "Product batch not found")

    values = _mock_values_for(test, batch.productType, body.instrumentCode)
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
        workflow_engine.complete_through(wf, "testing", f"System ({instrument_name})")

    audit.record(
        "Current User", "Lab Analyst", "import", "product-result",
        result.id, None,
        {"instrument": body.instrumentCode, "test": test.code,
         "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "Mechanical results imported",
        f"{test.name}: {len(values)} parameter(s) captured from {instrument_name}.",
        NotificationSeverity.SUCCESS,
        "product-result", result.id,
        meta={
            "instrument": instrument_name,
            "instrumentCode": body.instrumentCode,
            "sampleId": sample.sampleId,
            "testCode": test.code, "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "productBatchNumber": batch.productBatchNumber,
        },
    )
    return result


@router.post("/product-results/manual", response_model=ProductResult, status_code=201)
def product_manual_entry(body: ManualResultCreate) -> ProductResult:
    test = db.product_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.product_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.product_batches.get(sample.productBatchId)
    if not batch:
        raise HTTPException(404, "Product batch not found")
    if not body.reason or not body.reason.strip():
        raise HTTPException(400, "A reason is required for manual entries.")

    enriched: List[ResultValue] = []
    for v in body.values:
        spec = product_fw.spec_for(batch.productType, v.parameter)
        unit = product_fw.unit_for(v.parameter) or (v.unit or "")
        if spec:
            lo, hi, _ = spec
            status = product_fw._status_for(v.value, lo, hi)
            enriched.append(ResultValue(
                parameter=v.parameter, value=v.value,
                unit=unit,
                specMin=lo, specMax=hi, status=status,
            ))
        else:
            enriched.append(ResultValue(
                parameter=v.parameter, value=v.value,
                unit=unit,
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
        "Current User", "Lab Analyst", "manual-entry", "product-result",
        result.id, None,
        {"reason": body.reason, "values": [v.model_dump() for v in enriched]},
    )
    notif.emit(
        "Manual product result captured",
        f"{test.name} entered by lab analyst ({body.reason}).",
        NotificationSeverity.INFO,
        "product-result", result.id,
        meta={
            "testCode": test.code, "testName": test.name,
            "reason": body.reason,
            "parameterCount": len(enriched),
            "parameters": [v.parameter for v in enriched],
            "overallStatus": result.overallStatus.value,
            "productBatchNumber": batch.productBatchNumber,
        },
    )
    return result


@router.post("/product-results/file-upload", response_model=ProductResult, status_code=201)
def product_file_upload(body: FileUploadRequest) -> ProductResult:
    test = db.product_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.product_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    batch = db.product_batches.get(sample.productBatchId)
    if not batch:
        raise HTTPException(404, "Product batch not found")

    values = _mock_values_for(test, batch.productType, "FILE-UPLOAD")
    result = _record_result(
        test=test, batch=batch, values=values,
        source=ResultSource.FILE_UPLOAD,
        entered_by="Current User",
        file_name=body.fileName,
    )
    audit.record(
        "Current User", "Lab Analyst", "file-upload", "product-result",
        result.id, None,
        {"fileName": body.fileName, "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "Product test file processed",
        f"{body.fileName} parsed — {len(values)} parameter(s) extracted.",
        NotificationSeverity.SUCCESS,
        "product-result", result.id,
        meta={
            "fileName": body.fileName,
            "testCode": test.code, "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "productBatchNumber": batch.productBatchNumber,
        },
    )
    return result


@router.post("/product-results/{result_id}/retest", response_model=ProductTest, status_code=201)
def product_retest(result_id: str) -> ProductTest:
    r = db.product_results.get(result_id)
    if not r:
        raise HTTPException(404, "Result not found")
    t = db.product_tests.get(r.testId)
    if not t:
        raise HTTPException(404, "Test not found")
    t.status = TestStatus.PENDING
    del db.product_results[result_id]
    audit.record("Current User", "Lab Analyst", "retest", "product-test",
                 t.id, r.model_dump(), None)
    notif.emit("Product retest requested", f"{t.name} flagged for retest.",
               NotificationSeverity.INFO, "product-test", t.id)
    return t


# --------------------------------------------------------------------------
# Approvals
# --------------------------------------------------------------------------
@router.get("/product-batches/{product_batch_number}/approvals", response_model=list[ProductApproval])
def list_product_approvals(product_batch_number: str) -> list[ProductApproval]:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    return sorted(db.papprovals_for_batch(b.id), key=lambda a: a.decidedAt, reverse=True)


@router.post(
    "/product-batches/{product_batch_number}/approvals",
    response_model=ProductApproval, status_code=201,
)
def decide_product_batch(
    product_batch_number: str, body: ProductApprovalCreate,
) -> ProductApproval:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    if body.decision in {ProductDecision.HOLD, ProductDecision.REJECT, ProductDecision.RETEST}:
        if not body.reason or not body.reason.strip():
            raise HTTPException(400, "Hold, Reject, and Retest require a reason.")

    prev = b.model_dump()
    if body.decision == ProductDecision.APPROVE:
        b.status = ProductBatchStatus.APPROVED
        title = "Product approved for release"
        message = f"{b.productBatchNumber} approved ({b.productType.value})."
        severity = NotificationSeverity.SUCCESS
        stage_key = "release"
    elif body.decision == ProductDecision.HOLD:
        b.status = ProductBatchStatus.ON_HOLD
        title = "Product batch placed on hold"
        message = f"{b.productBatchNumber} held — {body.reason}."
        severity = NotificationSeverity.WARNING
        stage_key = "review"
    elif body.decision == ProductDecision.RETEST:
        b.status = ProductBatchStatus.RETEST
        title = "Product retest requested"
        message = f"{b.productBatchNumber} flagged for retest — {body.reason}."
        severity = NotificationSeverity.WARNING
        stage_key = "review"
    else:
        b.status = ProductBatchStatus.REJECTED
        title = "Product batch rejected"
        message = f"{b.productBatchNumber} rejected — {body.reason}."
        severity = NotificationSeverity.DANGER
        stage_key = "review"

    aid = str(uuid.uuid4())
    approval = ProductApproval(
        id=aid, productBatchId=b.id,
        decision=body.decision, reason=body.reason,
        decidedBy="Current User", decidedAt=now_iso(),
    )
    db.product_approvals[aid] = approval

    wf = db.workflows.get(b.id)
    if wf:
        workflow_engine.complete_through(wf, stage_key, "Current User")

    audit.record(
        "Current User", "QA Manager",
        body.decision.value.lower(), "product-batch",
        b.id, prev, b.model_dump(), notes=body.reason,
    )
    notif.emit(title, message, severity, "product-batch", b.id)
    _close_review_and_approval(b, body.decision, body.reason, actor="Current User")
    _refresh_compliance_score(b)
    return approval


# --------------------------------------------------------------------------
# Insights
# --------------------------------------------------------------------------
@router.get("/product-batches/{product_batch_number}/insights", response_model=ProductInsight)
def product_insights(product_batch_number: str) -> ProductInsight:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    insight = _compute_insight(b)
    # Keep the snapshot in sync with what the panel just rendered.
    b.complianceScore = insight.productCompliance
    return insight


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------
@router.get("/product-batches/{product_batch_number}/audit", response_model=list[AuditLog])
def product_audit(product_batch_number: str) -> list[AuditLog]:
    b = db.product_batch_by_number(product_batch_number)
    if not b:
        raise HTTPException(404, "Product batch not found")
    sample_ids = {s.id for s in db.psamples_for_batch(b.id)}
    test_ids = {t.id for t in db.ptests_for_batch(b.id)}
    result_ids = {r.id for r in db.presults_for_batch(b.id)}
    relevant: list[AuditLog] = []
    for log in audit.all_logs(limit=2000):
        if log.entityType == "product-batch" and log.entityId == b.id:
            relevant.append(log)
        elif log.entityType == "product-sample" and log.entityId in sample_ids:
            relevant.append(log)
        elif log.entityType == "product-test" and log.entityId in test_ids:
            relevant.append(log)
        elif log.entityType == "product-result" and log.entityId in result_ids:
            relevant.append(log)
    return relevant
