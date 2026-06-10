"""Certificate & Dispatch endpoints (Phase 5).

A `Certificate` is generated from an approved product batch and tracks dispatch
state. Customer specs are derived from the product batch's most recent results,
optionally tightened by the customer requirements passed at creation.
"""
from __future__ import annotations
import uuid
from typing import Dict, List, Optional, Tuple
from fastapi import APIRouter, HTTPException

from app.schemas.audit import AuditLog
from app.schemas.certificate import (
    Certificate,
    CertificateCreate,
    CertificateStatus,
    CustomerRequirement,
    CustomerSpec,
    DispatchDecision,
    DispatchDecisionCreate,
    DispatchStatus,
    QualityStepSummary,
    QualitySummary,
)
from app.schemas.certificate_insights import CertificateInsight
from app.schemas.common import now_iso, RiskLevel
from app.schemas.genealogy import NodeType
from app.schemas.notification import NotificationSeverity
from app.schemas.result import ResultStatus
from app.store import db
from app.frameworks import audit, notifications as notif
from app.frameworks import certificate_insights as cert_fw
from app.frameworks import genealogy as genealogy_fw
from app.frameworks import product_insights as product_fw


router = APIRouter()


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _next_certificate_number() -> str:
    nums = []
    for c in db.certificates.values():
        try:
            nums.append(int(c.certificateNumber.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 1245
    return f"COA-2026-{next_n:06d}"


def _latest_result_per_test(product_batch_id: str) -> Dict[str, "ProductResult"]:  # noqa: F821
    """Pick the most recent result per test for the product batch."""
    latest: Dict[str, "any"] = {}  # noqa: F821
    for r in db.presults_for_batch(product_batch_id):
        existing = latest.get(r.testId)
        if existing is None or r.enteredAt > existing.enteredAt:
            latest[r.testId] = r
    return latest


def _build_customer_specs(
    product_batch_id: str,
    product_type,
    customer_requirements: Optional[List[CustomerRequirement]] = None,
) -> List[CustomerSpec]:
    """Derive customer specs from latest product results + (optional) overrides."""
    overrides: Dict[str, CustomerRequirement] = {}
    if customer_requirements:
        for req in customer_requirements:
            overrides[req.parameter] = req

    latest = _latest_result_per_test(product_batch_id)

    specs: List[CustomerSpec] = []
    seen: set[str] = set()
    for r in latest.values():
        for v in r.values:
            if v.parameter in seen:
                continue
            seen.add(v.parameter)

            spec = product_fw.spec_for(product_type, v.parameter)
            lo = spec[0] if spec else v.specMin
            hi = spec[1] if spec else v.specMax
            target = spec[2] if spec else None

            ov = overrides.get(v.parameter)
            if ov:
                if ov.min is not None:
                    lo = ov.min
                if ov.max is not None:
                    hi = ov.max
                if ov.target is not None:
                    target = ov.target

            # compliance vs customer requirements
            if lo is not None and hi is not None and v.value is not None:
                if v.value < lo or v.value > hi:
                    status = ResultStatus.FAIL
                else:
                    span = hi - lo
                    if span > 0:
                        margin = span * 0.1
                        if v.value < lo + margin or v.value > hi - margin:
                            status = ResultStatus.WARNING
                        else:
                            status = ResultStatus.PASS
                    else:
                        status = ResultStatus.PASS
            else:
                status = ResultStatus.PENDING

            specs.append(CustomerSpec(
                parameter=v.parameter,
                unit=v.unit or product_fw.unit_for(v.parameter) or "",
                requiredMin=lo,
                requiredMax=hi,
                requiredTarget=target,
                actualValue=v.value,
                complianceStatus=status,
            ))
    return specs


def _chain_for_certificate(cert: Certificate) -> Tuple[Optional[str], Optional[str], Optional[str], int]:
    """Walk genealogy upstream from product batch. Returns
    (metal_batch_number, qualification_number, lot_number, coverage_count)."""
    pb = db.product_batch_by_number(cert.productBatchNumber)
    if not pb:
        return (None, None, None, 1)  # only the certificate
    metal_no = pb.sourceMetalBatchNumber
    qual_no = None
    lot_no = None
    coverage = 2  # certificate + product
    if metal_no:
        coverage = 3
        mb = db.metal_batch_by_number(metal_no)
        if mb:
            qual_no = mb.sourceQualificationNumber
            if qual_no:
                coverage = 4
                q = db.qualification_by_number(qual_no)
                if q:
                    lot_no = getattr(q, "sourceLotNumber", None)
                    if lot_no:
                        coverage = 5
    return (metal_no, qual_no, lot_no, coverage)


# --------------------------------------------------------------------------
# CRUD
# --------------------------------------------------------------------------
@router.get("/certificates", response_model=list[Certificate])
def list_certificates(
    status: Optional[CertificateStatus] = None,
    dispatch_status: Optional[DispatchStatus] = None,
    customer: Optional[str] = None,
    search: Optional[str] = None,
) -> list[Certificate]:
    items = list(db.certificates.values())
    if status:
        items = [c for c in items if c.status == status]
    if dispatch_status:
        items = [c for c in items if c.dispatchStatus == dispatch_status]
    if customer:
        items = [c for c in items if (c.customer or "").lower() == customer.lower()]
    if search:
        s = search.lower()

        def hay(c: Certificate) -> str:
            return " ".join([
                c.certificateNumber, c.productBatchNumber,
                c.customer or "", c.notes or "",
            ]).lower()

        items = [c for c in items if s in hay(c)]
    items.sort(key=lambda c: c.createdAt, reverse=True)
    return items


@router.get("/certificates/queue/summary")
def certificate_summary() -> dict:
    items = list(db.certificates.values())
    statuses = {s.value: 0 for s in CertificateStatus}
    dispatches = {d.value: 0 for d in DispatchStatus}
    for c in items:
        statuses[c.status.value] = statuses.get(c.status.value, 0) + 1
        dispatches[c.dispatchStatus.value] = dispatches.get(c.dispatchStatus.value, 0) + 1
    return {
        "total": len(items),
        "byStatus": statuses,
        "byDispatchStatus": dispatches,
    }


@router.get("/certificates/{certificate_number}", response_model=Certificate)
def get_certificate(certificate_number: str) -> Certificate:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    return c


@router.post("/certificates", response_model=Certificate, status_code=201)
def create_certificate(body: CertificateCreate) -> Certificate:
    pb = db.product_batch_by_number(body.productBatchNumber)
    if not pb:
        raise HTTPException(404, "Product batch not found")

    cid = str(uuid.uuid4())
    number = _next_certificate_number()
    specs = _build_customer_specs(pb.id, pb.productType, body.customerRequirements)
    cert = Certificate(
        id=cid,
        certificateNumber=number,
        productBatchNumber=pb.productBatchNumber,
        productBatchId=pb.id,
        customer=body.customer,
        customerSpecs=specs,
        status=CertificateStatus.DRAFT,
        dispatchStatus=DispatchStatus.PENDING,
        createdAt=now_iso(),
        createdBy="Current User",
        qrCodeValue=number,
        barcodeValue=number,
        notes=body.notes,
    )
    db.certificates[cid] = cert

    audit.record("Current User", "QA Engineer", "create", "certificate",
                 cid, None, cert.model_dump())
    notif.emit(
        "Certificate generated",
        f"{number} generated for {pb.productBatchNumber} → {body.customer}.",
        NotificationSeverity.SUCCESS,
        "certificate", cid,
    )
    return cert


@router.post("/certificates/{certificate_number}/issue", response_model=Certificate)
def issue_certificate(certificate_number: str) -> Certificate:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    prev = c.model_dump()
    c.status = CertificateStatus.ISSUED
    c.issuedAt = now_iso()
    c.issuedBy = "Current User"
    c.dispatchStatus = DispatchStatus.READY
    audit.record("Current User", "QA Engineer", "issue", "certificate",
                 c.id, prev, c.model_dump())
    notif.emit(
        "Certificate issued",
        f"{c.certificateNumber} issued for {c.productBatchNumber}.",
        NotificationSeverity.SUCCESS,
        "certificate", c.id,
    )
    return c


@router.post("/certificates/{certificate_number}/dispatch", response_model=Certificate)
def dispatch_certificate(
    certificate_number: str, body: DispatchDecisionCreate,
) -> Certificate:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    if body.decision in {DispatchDecision.HOLD, DispatchDecision.REJECT, DispatchDecision.OVERRIDE}:
        if not body.reason or not body.reason.strip():
            raise HTTPException(400, "Hold, Reject, and Override require a reason.")

    prev = c.model_dump()
    if body.decision == DispatchDecision.APPROVE:
        c.dispatchStatus = DispatchStatus.APPROVED
        title = "Dispatch approved"
        message = f"{c.certificateNumber} dispatch approved."
        severity = NotificationSeverity.SUCCESS
    elif body.decision == DispatchDecision.HOLD:
        c.dispatchStatus = DispatchStatus.HELD
        title = "Dispatch placed on hold"
        message = f"{c.certificateNumber} held — {body.reason}."
        severity = NotificationSeverity.WARNING
    elif body.decision == DispatchDecision.REJECT:
        c.dispatchStatus = DispatchStatus.REJECTED
        title = "Dispatch rejected"
        message = f"{c.certificateNumber} rejected — {body.reason}."
        severity = NotificationSeverity.DANGER
    elif body.decision == DispatchDecision.OVERRIDE:
        c.dispatchStatus = DispatchStatus.OVERRIDDEN
        title = "Dispatch overridden"
        message = f"{c.certificateNumber} overridden — {body.reason}."
        severity = NotificationSeverity.WARNING
    else:  # RELEASE
        c.dispatchStatus = DispatchStatus.RELEASED
        title = "Shipment released"
        message = f"{c.certificateNumber} released for shipment."
        severity = NotificationSeverity.SUCCESS

    audit.record(
        "Current User", "QA Manager",
        body.decision.value.lower(), "certificate",
        c.id, prev, c.model_dump(), notes=body.reason,
    )
    notif.emit(title, message, severity, "certificate", c.id)
    return c


@router.post("/certificates/{certificate_number}/cancel", response_model=Certificate)
def cancel_certificate(certificate_number: str) -> Certificate:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    prev = c.model_dump()
    c.status = CertificateStatus.CANCELLED
    audit.record("Current User", "QA Manager", "cancel", "certificate",
                 c.id, prev, c.model_dump())
    notif.emit("Certificate cancelled", f"{c.certificateNumber} cancelled.",
               NotificationSeverity.WARNING, "certificate", c.id)
    return c


# --------------------------------------------------------------------------
# Insights
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/insights", response_model=CertificateInsight)
def certificate_insights(certificate_number: str) -> CertificateInsight:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    # Upstream product batch compliance
    product_compliance: Optional[int] = None
    pb = db.product_batch_by_number(c.productBatchNumber)
    if pb:
        tests = db.ptests_for_batch(pb.id)
        results = db.presults_for_batch(pb.id)
        insight = product_fw.compute(
            product_batch_id=pb.id,
            product_type=pb.productType,
            tests=tests,
            results=results,
            historical_batches=[],
            historical_results=[],
        )
        product_compliance = insight.productCompliance

    _, _, _, coverage = _chain_for_certificate(c)

    return cert_fw.compute(
        certificate=c,
        product_compliance=product_compliance,
        chain_coverage=coverage,
    )


# --------------------------------------------------------------------------
# Quality Summary (cross-step rollup)
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/quality-summary", response_model=QualitySummary)
def certificate_quality_summary(certificate_number: str) -> QualitySummary:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    metal_no, qual_no, lot_no, _ = _chain_for_certificate(c)

    # Walk chain (uses framework if available)
    chain = genealogy_fw.build_chain(NodeType.CERTIFICATE, c.certificateNumber)

    steps: List[QualityStepSummary] = []

    # Step 1: Incoming Inspection
    if lot_no:
        receipt = db.receipt_by_lot(lot_no)
        steps.append(QualityStepSummary(
            label="Incoming Inspection",
            nodeKey=lot_no,
            nodeType=NodeType.RAW_MATERIAL.value,
            status=receipt.status.value if receipt else None,
            href=f"/inspection/{lot_no}",
        ))
    else:
        steps.append(QualityStepSummary(label="Incoming Inspection"))

    # Step 2: Process Qualification
    if qual_no:
        q = db.qualification_by_number(qual_no)
        steps.append(QualityStepSummary(
            label="Process Qualification",
            nodeKey=qual_no,
            nodeType=NodeType.PROCESS_QUALIFICATION.value,
            status=q.status.value if q else None,
            href=f"/qualification/{qual_no}",
        ))
    else:
        steps.append(QualityStepSummary(label="Process Qualification"))

    # Step 3: Metal Quality
    if metal_no:
        mb = db.metal_batch_by_number(metal_no)
        steps.append(QualityStepSummary(
            label="Metal Quality",
            nodeKey=metal_no,
            nodeType=NodeType.METAL_BATCH.value,
            status=mb.status.value if mb else None,
            href=f"/metal-quality/{metal_no}",
        ))
    else:
        steps.append(QualityStepSummary(label="Metal Quality"))

    # Step 4: Product Testing
    pb = db.product_batch_by_number(c.productBatchNumber)
    if pb:
        # compliance from product insights
        tests = db.ptests_for_batch(pb.id)
        results = db.presults_for_batch(pb.id)
        pi = product_fw.compute(
            product_batch_id=pb.id,
            product_type=pb.productType,
            tests=tests, results=results,
            historical_batches=[], historical_results=[],
        )
        steps.append(QualityStepSummary(
            label="Product Testing",
            nodeKey=pb.productBatchNumber,
            nodeType=NodeType.PRODUCT_BATCH.value,
            status=pb.status.value,
            compliance=pi.productCompliance,
            href=f"/product-quality/{pb.productBatchNumber}",
        ))
    else:
        steps.append(QualityStepSummary(label="Product Testing"))

    return QualitySummary(
        certificateNumber=c.certificateNumber,
        productBatchNumber=c.productBatchNumber,
        metalBatchNumber=metal_no,
        qualificationNumber=qual_no,
        rawMaterialLotNumber=lot_no,
        steps=steps,
    )


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/audit", response_model=list[AuditLog])
def certificate_audit(certificate_number: str) -> list[AuditLog]:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    relevant: list[AuditLog] = []
    for log in audit.all_logs(limit=2000):
        if log.entityType == "certificate" and log.entityId == c.id:
            relevant.append(log)
    return relevant
