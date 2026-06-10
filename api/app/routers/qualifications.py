"""Process Material Qualification endpoints.

Endpoint surface mirrors `receipts.py` + `samples.py` + `results.py` +
`approvals.py` + `insights.py` from Phase 1 — same verbs, same response shapes,
keyed by `qualification_number` instead of `lot_number`.
"""
from __future__ import annotations
import uuid
import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Response, Query

from app.schemas.audit import AuditLog
from app.schemas.common import now_iso, RiskLevel
from app.schemas.notification import NotificationSeverity
from app.schemas.process_insights import (
    HistoricalBatch,
    ProcessInsight,
    ProcessRecommendation,
)
from app.schemas.qualification import (
    ConsumptionArea,
    Qualification,
    QualificationApproval,
    QualificationApprovalCreate,
    QualificationCreate,
    QualificationDecision,
    QualificationResult,
    QualificationSample,
    QualificationSampleCreate,
    QualificationStatus,
    QualificationTest,
    QualificationUpdate,
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
from app.frameworks import process_insights as proc_insights_fw


router = APIRouter()


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _next_qualification_number() -> str:
    nums = []
    for q in db.qualifications.values():
        try:
            nums.append(int(q.qualificationNumber.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 1245
    return f"PMQ-2026-{next_n:06d}"


def _next_qual_sample_id(qualification_number: str) -> str:
    q = db.qualification_by_number(qualification_number)
    if not q:
        seq = 1
    else:
        seq = sum(1 for s in db.qualification_samples.values() if s.qualificationId == q.id) + 1
    suffix = chr(ord("A") + min(seq - 1, 25))
    tail = qualification_number.replace("PMQ-2026-", "")
    return f"PMQS-{tail}-{suffix}"


def _outcome_from_status(status: QualificationStatus) -> str:
    return {
        QualificationStatus.RELEASED: "Released",
        QualificationStatus.ON_HOLD: "Held",
        QualificationStatus.REJECTED: "Rejected",
        QualificationStatus.CANCELLED: "Cancelled",
    }.get(status, "Open")


def _spec_for(material_id: str, parameter: str):
    mat = db.material_by_id(material_id)
    if not mat:
        return None
    for s in mat.specifications:
        if s.parameter.lower() == parameter.lower():
            return s
    return None


def _status_for(value: float, lo: float | None, hi: float | None) -> ResultStatus:
    if lo is None and hi is None:
        return ResultStatus.PASS
    if lo is not None and value < lo:
        return ResultStatus.FAIL
    if hi is not None and value > hi:
        return ResultStatus.FAIL
    if lo is not None and hi is not None:
        margin = (hi - lo) * 0.1
        if value < lo + margin or value > hi - margin:
            return ResultStatus.WARNING
    return ResultStatus.PASS


def _mock_values_for(test: QualificationTest, material_id: str, instrument_code: str) -> List[ResultValue]:
    rnd = random.Random(f"{instrument_code}|{test.sampleId}|{test.code}")
    out: List[ResultValue] = []
    for param in test.parameters:
        spec = _spec_for(material_id, param)
        if spec and spec.targetValue is not None:
            jitter = (rnd.random() - 0.5) * 0.06 * (spec.targetValue or 1.0)
            value = round((spec.targetValue + jitter), 3)
            status = _status_for(value, spec.minValue, spec.maxValue)
        else:
            value = round(rnd.uniform(0.1, 5.0), 3)
            status = ResultStatus.PASS
        out.append(ResultValue(
            parameter=param,
            value=value,
            unit=spec.unit if spec else "%",
            specMin=spec.minValue if spec else None,
            specMax=spec.maxValue if spec else None,
            status=status,
        ))
    return out


def _check_all_tests_done(qualification_id: str) -> bool:
    tests = db.qtests_for_qualification(qualification_id)
    return bool(tests) and all(t.status == TestStatus.COMPLETED for t in tests)


def _advance_qualification_after_result(qualification_id: str) -> None:
    q = db.qualifications.get(qualification_id)
    if not q:
        return
    if _check_all_tests_done(qualification_id):
        q.status = QualificationStatus.PENDING_REVIEW
        wf = db.workflows.get(qualification_id)
        if wf:
            workflow_engine.complete_through(wf, "validation", "Current User")
        # also bump readiness notification so the activity feed reads naturally
        notif.emit(
            "Process readiness recalculated",
            f"Qualification {q.qualificationNumber} ready for QA review.",
            NotificationSeverity.INFO,
            "qualification",
            q.id,
        )


# auto-assign tests for a sample based on material
_TEST_NAME_MAP = {
    "SULPHUR": "Sulphur",
    "MOISTURE": "Moisture",
    "DENSITY": "Density",
    "AIR_PERM": "Air Permeability",
    "ELEC_RES": "Electrical Resistance",
    "SOFTENING_POINT": "Softening Point",
    "VISCOSITY": "Viscosity",
    "FLUORIDE": "Fluoride Content",
    "COMPOSITION": "Chemical Composition",
    "PHASE": "Phase Analysis",
    "XRF": "XRF Chemistry",
    "XRD": "XRD Crystallography",
    "CS": "Carbon / Sulphur",
}

_TEST_INSTRUMENT_MAP = {
    "SULPHUR": "CSA-01",
    "MOISTURE": "MA-01",
    "DENSITY": "PYC-01",
    "AIR_PERM": "APA-01",
    "ELEC_RES": "ERA-01",
    "SOFTENING_POINT": "SPT-01",
    "VISCOSITY": "VIS-01",
    "FLUORIDE": "XRF-01",
    "COMPOSITION": "XRF-01",
    "PHASE": "XRD-01",
    "XRF": "XRF-01",
    "XRD": "XRD-01",
    "CS": "CSA-01",
}

_TEST_PARAMS_MAP = {
    "SULPHUR": ["Sulphur"],
    "MOISTURE": ["Moisture"],
    "DENSITY": ["Density"],
    "AIR_PERM": ["Air Permeability"],
    "ELEC_RES": ["Electrical Resistance"],
    "SOFTENING_POINT": ["Softening Point"],
    "VISCOSITY": ["Viscosity"],
    "FLUORIDE": ["Fluoride"],
    "COMPOSITION": ["AlF3", "CaF2", "NaF"],
    "PHASE": ["Cryolite Ratio", "Alumina Phase"],
    "XRF": ["Al", "Si", "Fe"],
    "XRD": ["Crystallinity"],
    "CS": ["Carbon", "Sulphur"],
}


def _assign_tests_for_sample(sample: QualificationSample, material_required: List[str]) -> None:
    for code in material_required:
        tid = str(uuid.uuid4())
        t = QualificationTest(
            id=tid,
            sampleId=sample.id,
            code=code,
            name=_TEST_NAME_MAP.get(code, code.title()),
            parameters=_TEST_PARAMS_MAP.get(code, [code.title()]),
            instrumentCode=_TEST_INSTRUMENT_MAP.get(code),
            status=TestStatus.PENDING,
            assignedAt=now_iso(),
        )
        db.qualification_tests[tid] = t


# --------------------------------------------------------------------------
# Qualifications — CRUD + queue
# --------------------------------------------------------------------------
@router.get("/qualifications", response_model=list[Qualification])
def list_qualifications(
    status: Optional[QualificationStatus] = None,
    material_id: Optional[str] = None,
    consumption_area: Optional[ConsumptionArea] = None,
    search: Optional[str] = None,
) -> list[Qualification]:
    items = list(db.qualifications.values())
    if status:
        items = [q for q in items if q.status == status]
    if material_id:
        items = [q for q in items if q.materialId == material_id]
    if consumption_area:
        items = [q for q in items if q.consumptionArea == consumption_area]
    if search:
        s = search.lower()

        def hay(q: Qualification) -> str:
            mat = db.material_by_id(q.materialId)
            sup = db.supplier_by_id(q.supplierId) if q.supplierId else None
            return " ".join([
                q.qualificationNumber, q.batchNumber, q.consumptionArea.value,
                mat.name if mat else "", sup.name if sup else "",
            ]).lower()

        items = [q for q in items if s in hay(q)]
    items.sort(key=lambda q: q.requestedAt, reverse=True)
    return items


@router.get("/qualifications/{qualification_number}", response_model=Qualification)
def get_qualification(qualification_number: str) -> Qualification:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    return q


@router.post("/qualifications", response_model=Qualification, status_code=201)
def create_qualification(body: QualificationCreate) -> Qualification:
    if not db.material_by_id(body.materialId):
        raise HTTPException(400, "Unknown material")
    if body.supplierId and not db.supplier_by_id(body.supplierId):
        raise HTTPException(400, "Unknown supplier")

    qid = str(uuid.uuid4())
    number = _next_qualification_number()
    q = Qualification(
        id=qid,
        qualificationNumber=number,
        materialId=body.materialId,
        batchNumber=body.batchNumber,
        supplierId=body.supplierId,
        sourceLotNumber=body.sourceLotNumber,
        consumptionArea=body.consumptionArea,
        quantity=body.quantity,
        uom=body.uom,
        status=QualificationStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        requestedAt=now_iso(),
        requestedBy="Current User",
        notes=body.notes,
    )
    db.qualifications[qid] = q

    wf = workflow_engine.create_workflow("process-material-qualification", qid)
    workflow_engine.complete_through(wf, "request", "Current User")
    db.workflows[qid] = wf

    audit.record("Current User", "Process Engineer", "create", "qualification",
                 qid, None, q.model_dump())
    notif.emit(
        "Qualification created successfully",
        f"{number} created for {body.batchNumber} → {body.consumptionArea.value}.",
        NotificationSeverity.SUCCESS,
        "qualification",
        qid,
    )
    return q


@router.patch("/qualifications/{qualification_number}", response_model=Qualification)
def update_qualification(qualification_number: str, body: QualificationUpdate) -> Qualification:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    prev = q.model_dump()
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(q, k, v)
    audit.record("Current User", "Process Engineer", "update", "qualification",
                 q.id, prev, q.model_dump())
    notif.emit("Qualification updated", f"{q.qualificationNumber} updated.",
               NotificationSeverity.INFO, "qualification", q.id)
    return q


@router.post("/qualifications/{qualification_number}/cancel", response_model=Qualification)
def cancel_qualification(qualification_number: str) -> Qualification:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    prev = q.model_dump()
    q.status = QualificationStatus.CANCELLED
    audit.record("Current User", "QA Manager", "cancel", "qualification",
                 q.id, prev, q.model_dump())
    notif.emit("Qualification cancelled", f"{q.qualificationNumber} cancelled.",
               NotificationSeverity.WARNING, "qualification", q.id)
    return q


@router.post("/qualifications/{qualification_number}/clone", response_model=Qualification, status_code=201)
def clone_qualification(qualification_number: str) -> Qualification:
    src = db.qualification_by_number(qualification_number)
    if not src:
        raise HTTPException(404, "Qualification not found")
    qid = str(uuid.uuid4())
    number = _next_qualification_number()
    clone = Qualification(
        id=qid,
        qualificationNumber=number,
        materialId=src.materialId,
        batchNumber=f"{src.batchNumber}-CLONE",
        supplierId=src.supplierId,
        sourceLotNumber=src.sourceLotNumber,
        consumptionArea=src.consumptionArea,
        quantity=src.quantity,
        uom=src.uom,
        status=QualificationStatus.PENDING_SAMPLING,
        riskLevel=RiskLevel.LOW,
        requestedAt=now_iso(),
        requestedBy="Current User",
        notes=f"Cloned from {src.qualificationNumber}",
    )
    db.qualifications[qid] = clone
    wf = workflow_engine.create_workflow("process-material-qualification", qid)
    workflow_engine.complete_through(wf, "request", "Current User")
    db.workflows[qid] = wf
    audit.record("Current User", "Process Engineer", "clone", "qualification",
                 qid, src.model_dump(), clone.model_dump())
    notif.emit("Qualification cloned", f"{number} cloned from {src.qualificationNumber}.",
               NotificationSeverity.SUCCESS, "qualification", qid)
    return clone


@router.get("/qualifications/{qualification_number}/workflow", response_model=Workflow)
def get_qualification_workflow(qualification_number: str) -> Workflow:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    wf = db.workflows.get(q.id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


# --------------------------------------------------------------------------
# Samples (qualification-scoped)
# --------------------------------------------------------------------------
@router.get("/qualifications/{qualification_number}/samples", response_model=list[QualificationSample])
def list_qualification_samples(qualification_number: str) -> list[QualificationSample]:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    return sorted(db.qsamples_for_qualification(q.id), key=lambda s: s.collectionDate, reverse=True)


@router.post(
    "/qualifications/{qualification_number}/samples",
    response_model=QualificationSample,
    status_code=201,
)
def create_qualification_sample(
    qualification_number: str, body: QualificationSampleCreate | None = None,
) -> QualificationSample:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    body = body or QualificationSampleCreate()
    sid = str(uuid.uuid4())
    sample = QualificationSample(
        id=sid,
        sampleId=_next_qual_sample_id(q.qualificationNumber),
        qualificationId=q.id,
        collectionDate=now_iso(),
        collectedBy=body.collectedBy or "Current User",
        status=SampleStatus.COLLECTED,
        notes=body.notes,
    )
    db.qualification_samples[sid] = sample

    mat = db.material_by_id(q.materialId)
    if mat:
        _assign_tests_for_sample(sample, mat.requiredTests)

    q.status = QualificationStatus.PENDING_TESTING
    wf = db.workflows.get(q.id)
    if wf:
        workflow_engine.complete_through(wf, "sample", sample.collectedBy)

    audit.record(sample.collectedBy, "Sampler", "create", "qualification-sample",
                 sid, None, sample.model_dump())
    notif.emit(
        "Sample generated successfully",
        f"Sample {sample.sampleId} drawn for {q.qualificationNumber}.",
        NotificationSeverity.SUCCESS,
        "qualification-sample",
        sid,
    )
    return sample


@router.post(
    "/qualifications/{qualification_number}/samples/recollect",
    response_model=QualificationSample,
    status_code=201,
)
def recollect_qualification_sample(qualification_number: str) -> QualificationSample:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    for s in db.qsamples_for_qualification(q.id):
        prev = s.model_dump()
        s.status = SampleStatus.DISCARDED
        audit.record("Current User", "Sampler", "discard", "qualification-sample",
                     s.id, prev, s.model_dump())
    fresh = create_qualification_sample(qualification_number, QualificationSampleCreate())
    fresh_obj = db.qualification_samples[fresh.id]
    fresh_obj.status = SampleStatus.RECOLLECTED
    return fresh_obj


@router.delete("/qualification-samples/{sample_id}", status_code=204, response_class=Response)
def delete_qualification_sample(sample_id: str) -> Response:
    s = db.qualification_samples.get(sample_id)
    if not s:
        raise HTTPException(404, "Sample not found")
    prev = s.model_dump()
    del db.qualification_samples[sample_id]
    for tid in list(db.qualification_tests.keys()):
        if db.qualification_tests[tid].sampleId == sample_id:
            for rid in list(db.qualification_results.keys()):
                if db.qualification_results[rid].testId == tid:
                    del db.qualification_results[rid]
            del db.qualification_tests[tid]
    audit.record("Current User", "QA Manager", "delete", "qualification-sample",
                 sample_id, prev, None)
    notif.emit("Sample removed", f"Sample {s.sampleId} removed from qualification.",
               NotificationSeverity.WARNING, "qualification-sample", sample_id)
    return Response(status_code=204)


# --------------------------------------------------------------------------
# Tests + Results
# --------------------------------------------------------------------------
@router.get("/qualifications/{qualification_number}/tests", response_model=list[QualificationTest])
def list_qualification_tests(qualification_number: str) -> list[QualificationTest]:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    return db.qtests_for_qualification(q.id)


@router.get("/qualifications/{qualification_number}/results", response_model=list[QualificationResult])
def list_qualification_results(qualification_number: str) -> list[QualificationResult]:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    return sorted(db.qresults_for_qualification(q.id), key=lambda r: r.enteredAt, reverse=True)


def _record_result(
    *,
    test: QualificationTest,
    qualification: Qualification,
    values: List[ResultValue],
    source: ResultSource,
    entered_by: str,
    instrument_code: Optional[str] = None,
    reason: Optional[str] = None,
    file_name: Optional[str] = None,
) -> QualificationResult:
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in values):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in values):
        overall = ResultStatus.WARNING
    rid = str(uuid.uuid4())
    result = QualificationResult(
        id=rid,
        testId=test.id,
        sampleId=test.sampleId,
        source=source,
        values=values,
        enteredBy=entered_by,
        enteredAt=now_iso(),
        instrumentCode=instrument_code,
        reason=reason,
        fileName=file_name,
        overallStatus=overall,
    )
    db.qualification_results[rid] = result
    test.status = TestStatus.COMPLETED
    _advance_qualification_after_result(qualification.id)
    return result


@router.post("/qualification-results/instrument-import", response_model=QualificationResult, status_code=201)
def qualification_import_from_instrument(body: InstrumentImportRequest) -> QualificationResult:
    test = db.qualification_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.qualification_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    q = db.qualifications.get(sample.qualificationId)
    if not q:
        raise HTTPException(404, "Qualification not found")

    values = _mock_values_for(test, q.materialId, body.instrumentCode)
    instrument_name = next((i.name for i in db.instruments.values() if i.code == body.instrumentCode), body.instrumentCode)

    result = _record_result(
        test=test, qualification=q, values=values,
        source=ResultSource.INSTRUMENT,
        entered_by=f"System ({instrument_name})",
        instrument_code=body.instrumentCode,
    )

    for inst in db.instruments.values():
        if inst.code == body.instrumentCode:
            inst.lastImportAt = now_iso()
            inst.importsThisWeek += 1
            break

    audit.record(
        "Current User", "Lab Analyst", "import", "qualification-result",
        result.id, None,
        {"instrument": body.instrumentCode, "test": test.code,
         "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "Results imported successfully",
        f"{test.name}: {len(values)} parameter(s) captured from {instrument_name}.",
        NotificationSeverity.SUCCESS,
        "qualification-result",
        result.id,
        meta={
            "instrument": instrument_name,
            "instrumentCode": body.instrumentCode,
            "sampleId": sample.sampleId,
            "testCode": test.code,
            "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "qualificationNumber": q.qualificationNumber,
        },
    )
    return result


@router.post("/qualification-results/manual", response_model=QualificationResult, status_code=201)
def qualification_manual_entry(body: ManualResultCreate) -> QualificationResult:
    test = db.qualification_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.qualification_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    q = db.qualifications.get(sample.qualificationId)
    if not q:
        raise HTTPException(404, "Qualification not found")
    if not body.reason or not body.reason.strip():
        raise HTTPException(400, "A reason is required for manual entries.")

    enriched: List[ResultValue] = []
    for v in body.values:
        spec = _spec_for(q.materialId, v.parameter)
        status = _status_for(v.value, spec.minValue if spec else None, spec.maxValue if spec else None)
        enriched.append(ResultValue(
            parameter=v.parameter,
            value=v.value,
            unit=v.unit or (spec.unit if spec else "%"),
            specMin=spec.minValue if spec else v.specMin,
            specMax=spec.maxValue if spec else v.specMax,
            status=status,
        ))
    result = _record_result(
        test=test, qualification=q, values=enriched,
        source=ResultSource.MANUAL,
        entered_by="Current User",
        reason=body.reason,
    )
    audit.record(
        "Current User", "Lab Analyst", "manual-entry", "qualification-result",
        result.id, None,
        {"reason": body.reason, "values": [v.model_dump() for v in enriched]},
    )
    notif.emit(
        "Manual result captured",
        f"{test.name} entered by lab analyst ({body.reason}).",
        NotificationSeverity.INFO,
        "qualification-result",
        result.id,
        meta={
            "testCode": test.code, "testName": test.name,
            "reason": body.reason,
            "parameterCount": len(enriched),
            "parameters": [v.parameter for v in enriched],
            "overallStatus": result.overallStatus.value,
            "qualificationNumber": q.qualificationNumber,
        },
    )
    return result


@router.post("/qualification-results/file-upload", response_model=QualificationResult, status_code=201)
def qualification_file_upload(body: FileUploadRequest) -> QualificationResult:
    test = db.qualification_tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.qualification_samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    q = db.qualifications.get(sample.qualificationId)
    if not q:
        raise HTTPException(404, "Qualification not found")

    values = _mock_values_for(test, q.materialId, "FILE-UPLOAD")
    result = _record_result(
        test=test, qualification=q, values=values,
        source=ResultSource.FILE_UPLOAD,
        entered_by="Current User",
        file_name=body.fileName,
    )
    audit.record(
        "Current User", "Lab Analyst", "file-upload", "qualification-result",
        result.id, None,
        {"fileName": body.fileName, "values": [v.model_dump() for v in values]},
    )
    notif.emit(
        "File processed",
        f"{body.fileName} parsed — {len(values)} parameter(s) extracted.",
        NotificationSeverity.SUCCESS,
        "qualification-result",
        result.id,
        meta={
            "fileName": body.fileName,
            "testCode": test.code, "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": result.overallStatus.value,
            "qualificationNumber": q.qualificationNumber,
        },
    )
    return result


@router.post("/qualification-results/{result_id}/retest", response_model=QualificationTest, status_code=201)
def qualification_retest(result_id: str) -> QualificationTest:
    r = db.qualification_results.get(result_id)
    if not r:
        raise HTTPException(404, "Result not found")
    t = db.qualification_tests.get(r.testId)
    if not t:
        raise HTTPException(404, "Test not found")
    t.status = TestStatus.PENDING
    del db.qualification_results[result_id]
    audit.record("Current User", "Lab Analyst", "retest", "qualification-test",
                 t.id, r.model_dump(), None)
    notif.emit("Retest requested", f"{t.name} flagged for retest.",
               NotificationSeverity.INFO, "qualification-test", t.id)
    return t


# --------------------------------------------------------------------------
# Approvals
# --------------------------------------------------------------------------
@router.get("/qualifications/{qualification_number}/approvals", response_model=list[QualificationApproval])
def list_qualification_approvals(qualification_number: str) -> list[QualificationApproval]:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    return sorted(db.qapprovals_for_qualification(q.id), key=lambda a: a.decidedAt, reverse=True)


@router.post(
    "/qualifications/{qualification_number}/approvals",
    response_model=QualificationApproval,
    status_code=201,
)
def decide_qualification(
    qualification_number: str, body: QualificationApprovalCreate,
) -> QualificationApproval:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    if body.decision in {QualificationDecision.HOLD, QualificationDecision.REJECT}:
        if not body.reason or not body.reason.strip():
            raise HTTPException(400, "Hold and Reject require a reason.")

    prev = q.model_dump()
    if body.decision == QualificationDecision.RELEASE:
        q.status = QualificationStatus.RELEASED
        title = "Material released successfully"
        message = f"{q.qualificationNumber} released to {q.consumptionArea.value}."
        severity = NotificationSeverity.SUCCESS
        stage_key = "release"
    elif body.decision == QualificationDecision.HOLD:
        q.status = QualificationStatus.ON_HOLD
        title = "Material placed on hold"
        message = f"{q.qualificationNumber} placed on hold."
        severity = NotificationSeverity.WARNING
        stage_key = "review"
    else:
        q.status = QualificationStatus.REJECTED
        title = "Material rejected for process use"
        message = f"{q.qualificationNumber} rejected for {q.consumptionArea.value}."
        severity = NotificationSeverity.DANGER
        stage_key = "review"

    aid = str(uuid.uuid4())
    approval = QualificationApproval(
        id=aid,
        qualificationId=q.id,
        decision=body.decision,
        reason=body.reason,
        decidedBy="Current User",
        decidedAt=now_iso(),
    )
    db.qualification_approvals[aid] = approval

    wf = db.workflows.get(q.id)
    if wf:
        workflow_engine.complete_through(wf, stage_key, "Current User")

    audit.record(
        "Current User", "QA Manager",
        body.decision.value.lower(), "qualification",
        q.id, prev, q.model_dump(), notes=body.reason,
    )
    notif.emit(title, message, severity, "qualification", q.id)
    return approval


# --------------------------------------------------------------------------
# Insights
# --------------------------------------------------------------------------
@router.get("/qualifications/{qualification_number}/insights", response_model=ProcessInsight)
def qualification_insights(qualification_number: str) -> ProcessInsight:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")

    tests = db.qtests_for_qualification(q.id)
    results = db.qresults_for_qualification(q.id)

    # historical batches for the same material + consumption area
    history: List[HistoricalBatch] = []
    historical_result_ids: set[str] = set()
    for other in db.qualifications.values():
        if other.id == q.id:
            continue
        if other.materialId != q.materialId:
            continue
        if other.consumptionArea != q.consumptionArea:
            continue
        # derive a deterministic readiness score from outcome
        score_map = {
            QualificationStatus.RELEASED: 92,
            QualificationStatus.PENDING_REVIEW: 78,
            QualificationStatus.PENDING_TESTING: 60,
            QualificationStatus.PENDING_SAMPLING: 45,
            QualificationStatus.ON_HOLD: 55,
            QualificationStatus.REJECTED: 38,
            QualificationStatus.CANCELLED: 30,
        }
        history.append(HistoricalBatch(
            qualificationNumber=other.qualificationNumber,
            batchNumber=other.batchNumber,
            requestedAt=other.requestedAt,
            outcome=_outcome_from_status(other.status),
            readinessScore=score_map.get(other.status, 60),
            riskLevel=other.riskLevel,
        ))
        for past in db.qresults_for_qualification(other.id):
            historical_result_ids.add(past.id)
    history.sort(key=lambda h: h.requestedAt, reverse=True)
    historical_results = [
        db.qualification_results[rid]
        for rid in historical_result_ids
        if rid in db.qualification_results
    ]

    return proc_insights_fw.compute(
        qualification_id=q.id,
        consumption_area=q.consumptionArea.value,
        tests=tests,
        results=results,
        historical_batches=history,
        historical_results=historical_results,
    )


# --------------------------------------------------------------------------
# Audit (qualification-scoped roll-up)
# --------------------------------------------------------------------------
@router.get("/qualifications/{qualification_number}/audit", response_model=list[AuditLog])
def qualification_audit(qualification_number: str) -> list[AuditLog]:
    q = db.qualification_by_number(qualification_number)
    if not q:
        raise HTTPException(404, "Qualification not found")
    sample_ids = {s.id for s in db.qsamples_for_qualification(q.id)}
    test_ids = {t.id for t in db.qtests_for_qualification(q.id)}
    result_ids = {r.id for r in db.qresults_for_qualification(q.id)}
    relevant: list[AuditLog] = []
    for log in audit.all_logs(limit=2000):
        if log.entityType == "qualification" and log.entityId == q.id:
            relevant.append(log)
        elif log.entityType == "qualification-sample" and log.entityId in sample_ids:
            relevant.append(log)
        elif log.entityType == "qualification-test" and log.entityId in test_ids:
            relevant.append(log)
        elif log.entityType == "qualification-result" and log.entityId in result_ids:
            relevant.append(log)
    return relevant


# --------------------------------------------------------------------------
# Role queue (for dashboard reuse)
# --------------------------------------------------------------------------
@router.get("/qualifications/queue/summary")
def qualifications_summary() -> dict:
    items = list(db.qualifications.values())
    statuses = {s.value: 0 for s in QualificationStatus}
    for q in items:
        statuses[q.status.value] = statuses.get(q.status.value, 0) + 1
    return {"total": len(items), "byStatus": statuses}
