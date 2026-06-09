from __future__ import annotations
import uuid
import random
from typing import List
from fastapi import APIRouter, HTTPException, Response

from app.schemas.result import (
    Result,
    ResultSource,
    ResultStatus,
    ResultValue,
    ManualResultCreate,
    InstrumentImportRequest,
    FileUploadRequest,
)
from app.schemas.test import Test, TestStatus
from app.schemas.common import now_iso, ReceiptStatus
from app.store import db
from app.frameworks import audit, notifications as notif, workflow_engine
from app.schemas.notification import NotificationSeverity


router = APIRouter()


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


def _mock_values_for(test: Test, material_id: str, instrument_code: str) -> List[ResultValue]:
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


def _check_all_tests_done(receipt_id: str) -> bool:
    tests = db.tests_for_receipt(receipt_id)
    return bool(tests) and all(t.status == TestStatus.COMPLETED for t in tests)


def _advance_receipt_after_result(receipt_id: str):
    receipt = db.receipts.get(receipt_id)
    if not receipt:
        return
    if _check_all_tests_done(receipt_id):
        receipt.status = ReceiptStatus.PENDING_REVIEW
        wf = db.workflows.get(receipt_id)
        if wf:
            workflow_engine.complete_through(wf, "validation", "Current User")


@router.get("/receipts/{lot_number}/results", response_model=list[Result])
def list_for_receipt(lot_number: str) -> list[Result]:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    return sorted(db.results_for_receipt(r.id), key=lambda x: x.enteredAt, reverse=True)


@router.get("/receipts/{lot_number}/tests", response_model=list[Test])
def list_tests(lot_number: str) -> list[Test]:
    r = db.receipt_by_lot(lot_number)
    if not r:
        raise HTTPException(404, "Receipt not found")
    return db.tests_for_receipt(r.id)


@router.post("/results/instrument-import", response_model=Result, status_code=201)
def import_from_instrument(body: InstrumentImportRequest) -> Result:
    test = db.tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    receipt = db.receipts.get(sample.receiptId)
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    values = _mock_values_for(test, receipt.materialId, body.instrumentCode)
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in values):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in values):
        overall = ResultStatus.WARNING

    rid = str(uuid.uuid4())
    instrument_name = next((i.name for i in db.instruments.values() if i.code == body.instrumentCode), body.instrumentCode)
    result = Result(
        id=rid, testId=test.id, sampleId=sample.id, source=ResultSource.INSTRUMENT,
        values=values, enteredBy=f"System ({instrument_name})", enteredAt=now_iso(),
        instrumentCode=body.instrumentCode, overallStatus=overall,
    )
    db.results[rid] = result
    test.status = TestStatus.COMPLETED
    # bump instrument metrics
    for inst in db.instruments.values():
        if inst.code == body.instrumentCode:
            inst.lastImportAt = now_iso()
            inst.importsThisWeek += 1
            break
    audit.record("Current User", "Lab Analyst", "import", "result", rid, None,
                 {"instrument": body.instrumentCode, "test": test.code,
                  "values": [v.model_dump() for v in values]})
    summary = f"{len(values)} parameters captured from {instrument_name}."
    notif.emit(
        "Results imported successfully",
        summary,
        NotificationSeverity.SUCCESS,
        "result",
        rid,
        meta={
            "instrument": instrument_name,
            "instrumentCode": body.instrumentCode,
            "sampleId": sample.sampleId,
            "testCode": test.code,
            "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": overall.value,
            "durationMs": 5400,
        },
    )
    # spec-validation rollup notification
    if overall == ResultStatus.PASS:
        notif.emit(
            "Specification validation completed",
            f"{test.name}: all {len(values)} parameters within specification.",
            NotificationSeverity.INFO,
            "result",
            rid,
            meta={"testCode": test.code, "result": "compliant"},
        )
    elif overall == ResultStatus.WARNING:
        warn_count = sum(1 for v in values if v.status == ResultStatus.WARNING)
        notif.emit(
            "Specification variance detected",
            f"{test.name}: {warn_count} parameter(s) near spec edge — second look recommended.",
            NotificationSeverity.WARNING,
            "result",
            rid,
            meta={"testCode": test.code, "result": "variance",
                  "varianceParameters": [v.parameter for v in values if v.status == ResultStatus.WARNING]},
        )
    else:
        fail_count = sum(1 for v in values if v.status == ResultStatus.FAIL)
        notif.emit(
            "Specification failure",
            f"{test.name}: {fail_count} parameter(s) out of specification.",
            NotificationSeverity.DANGER,
            "result",
            rid,
            meta={"testCode": test.code, "result": "out-of-spec",
                  "failedParameters": [v.parameter for v in values if v.status == ResultStatus.FAIL]},
        )
    _advance_receipt_after_result(receipt.id)
    return result


@router.post("/results/manual", response_model=Result, status_code=201)
def manual_entry(body: ManualResultCreate) -> Result:
    test = db.tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    receipt = db.receipts.get(sample.receiptId)
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    if not body.reason or not body.reason.strip():
        raise HTTPException(400, "A reason is required for manual entries.")

    # recompute spec compliance per value
    enriched: List[ResultValue] = []
    for v in body.values:
        spec = _spec_for(receipt.materialId, v.parameter)
        status = _status_for(v.value, spec.minValue if spec else None, spec.maxValue if spec else None)
        enriched.append(ResultValue(
            parameter=v.parameter, value=v.value, unit=v.unit or (spec.unit if spec else "%"),
            specMin=spec.minValue if spec else v.specMin,
            specMax=spec.maxValue if spec else v.specMax,
            status=status,
        ))
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in enriched):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in enriched):
        overall = ResultStatus.WARNING

    rid = str(uuid.uuid4())
    result = Result(
        id=rid, testId=test.id, sampleId=sample.id, source=ResultSource.MANUAL,
        values=enriched, enteredBy="Current User", enteredAt=now_iso(),
        reason=body.reason, overallStatus=overall,
    )
    db.results[rid] = result
    test.status = TestStatus.COMPLETED
    audit.record("Current User", "Lab Analyst", "manual-entry", "result", rid,
                 None, {"reason": body.reason, "values": [v.model_dump() for v in enriched]})
    notif.emit(
        "Manual result captured",
        f"{test.name} entered by lab analyst ({body.reason}).",
        NotificationSeverity.INFO, "result", rid,
        meta={
            "testCode": test.code,
            "testName": test.name,
            "reason": body.reason,
            "parameterCount": len(enriched),
            "parameters": [v.parameter for v in enriched],
            "overallStatus": overall.value,
        },
    )
    _advance_receipt_after_result(receipt.id)
    return result


@router.post("/results/file-upload", response_model=Result, status_code=201)
def file_upload(body: FileUploadRequest) -> Result:
    test = db.tests.get(body.testId)
    if not test:
        raise HTTPException(404, "Test not found")
    sample = db.samples.get(test.sampleId)
    if not sample:
        raise HTTPException(404, "Sample not found")
    receipt = db.receipts.get(sample.receiptId)
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    values = _mock_values_for(test, receipt.materialId, "FILE-UPLOAD")
    overall = ResultStatus.PASS
    if any(v.status == ResultStatus.FAIL for v in values):
        overall = ResultStatus.FAIL
    elif any(v.status == ResultStatus.WARNING for v in values):
        overall = ResultStatus.WARNING

    rid = str(uuid.uuid4())
    result = Result(
        id=rid, testId=test.id, sampleId=sample.id, source=ResultSource.FILE_UPLOAD,
        values=values, enteredBy="Current User", enteredAt=now_iso(),
        fileName=body.fileName, overallStatus=overall,
    )
    db.results[rid] = result
    test.status = TestStatus.COMPLETED
    audit.record("Current User", "Lab Analyst", "file-upload", "result", rid,
                 None, {"fileName": body.fileName, "values": [v.model_dump() for v in values]})
    notif.emit(
        "File processed",
        f"{body.fileName} parsed — {len(values)} parameters extracted.",
        NotificationSeverity.SUCCESS, "result", rid,
        meta={
            "fileName": body.fileName,
            "testCode": test.code,
            "testName": test.name,
            "parameterCount": len(values),
            "parameters": [v.parameter for v in values],
            "overallStatus": overall.value,
        },
    )
    _advance_receipt_after_result(receipt.id)
    return result


@router.delete("/results/{result_id}", status_code=204, response_class=Response)
def delete_result(result_id: str):
    r = db.results.get(result_id)
    if not r:
        raise HTTPException(404, "Result not found")
    prev = r.model_dump()
    del db.results[result_id]
    # mark test as pending again
    t = db.tests.get(r.testId)
    if t:
        t.status = TestStatus.PENDING
    audit.record("Current User", "QA Manager", "delete", "result", result_id, prev, None)
    notif.emit("Result Removed", "A result entry was removed.",
               NotificationSeverity.WARNING, "result", result_id)
    return Response(status_code=204)


@router.post("/results/{result_id}/retest", response_model=Test, status_code=201)
def retest(result_id: str) -> Test:
    r = db.results.get(result_id)
    if not r:
        raise HTTPException(404, "Result not found")
    t = db.tests.get(r.testId)
    if not t:
        raise HTTPException(404, "Test not found")
    t.status = TestStatus.PENDING
    # remove the existing result so a fresh one can be captured
    del db.results[result_id]
    audit.record("Current User", "Lab Analyst", "retest", "test", t.id, r.model_dump(), None)
    notif.emit("Retest Requested", f"{t.name} flagged for retest.",
               NotificationSeverity.INFO, "test", t.id)
    return t
