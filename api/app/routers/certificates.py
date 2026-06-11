"""Certificate & Dispatch endpoints — Phase 5 enterprise hardening.

Adds on top of the existing surface:
- Customer-spec margin analysis (Phase 5 enhancement PRD §5)
- Approval-chain identity fields (§6)
- Versioning / copy-on-revise (§3)
- Task-engine integration (§10)
- Dispatch-approval records (§11)
- Events timeline (§12)
- Real QR + Code128 (§7, §8)
- Certificate Preview + PDF (§2, §9)
- Public verification endpoint (§14)
"""
from __future__ import annotations
import io
import os
import uuid
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Response

from app.schemas.audit import AuditLog
from app.schemas.certificate import (
    Certificate,
    CertificateCreate,
    CertificateEvent,
    CertificateReviseCreate,
    CertificateStatus,
    CustomerRequirement,
    CustomerSpec,
    DispatchApprovalRecord,
    DispatchDecision,
    DispatchDecisionCreate,
    DispatchStatus,
    MarginStatus,
    QualityStepSummary,
    QualitySummary,
    VerifyPayload,
)
from app.schemas.certificate_insights import CertificateInsight
from app.schemas.common import now_iso
from app.schemas.genealogy import NodeType
from app.schemas.notification import NotificationSeverity
from app.schemas.result import ResultStatus
from app.schemas.task import (
    AssignmentType,
    TaskCreate,
    TaskPriority,
    TaskState,
    TaskType,
)
from app.store import db
from app.frameworks import audit, notifications as notif
from app.frameworks import certificate_insights as cert_fw
from app.frameworks import genealogy as genealogy_fw
from app.frameworks import product_insights as product_fw
from app.frameworks import task_engine


router = APIRouter()


PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:3000")


# --------------------------------------------------------------------------
# Numbering
# --------------------------------------------------------------------------
def _next_certificate_number() -> str:
    nums = []
    for c in db.certificates.values():
        try:
            # Use the root number for numbering so revisions don't bump the sequence.
            root = (c.rootCertificateNumber or c.certificateNumber).split("-R")[0]
            nums.append(int(root.split("-")[-1]))
        except ValueError:
            continue
    next_n = (max(nums) + 1) if nums else 1245
    return f"COA-2026-{next_n:06d}"


# --------------------------------------------------------------------------
# Customer specs + margin analysis
# --------------------------------------------------------------------------
def _latest_result_per_test(product_batch_id: str):
    latest: Dict[str, "any"] = {}  # noqa: F821
    for r in db.presults_for_batch(product_batch_id):
        existing = latest.get(r.testId)
        if existing is None or r.enteredAt > existing.enteredAt:
            latest[r.testId] = r
    return latest


def _compute_margin(
    actual: Optional[float],
    lo: Optional[float],
    hi: Optional[float],
) -> Tuple[Optional[float], Optional[float], MarginStatus]:
    """Returns (marginValue, marginPct, marginStatus).

    - marginValue is the signed distance to the nearest bound. Positive = inside,
      negative = outside. None when not computable.
    - marginPct is 0–100 percentage of band remaining to the closest bound.
      None when band cannot be derived.
    - marginStatus is SAFE (>=30%), TIGHT (>0%), BREACH (<=0%), or NA.
    """
    if actual is None or (lo is None and hi is None):
        return (None, None, MarginStatus.NA)

    if lo is not None and hi is not None:
        if actual < lo:
            margin = actual - lo  # negative
        elif actual > hi:
            margin = hi - actual  # negative
        else:
            margin = min(actual - lo, hi - actual)
        band = hi - lo
        pct = round((margin / band) * 100.0, 1) if band > 0 else None
    elif lo is not None:
        margin = actual - lo
        pct = None
    else:  # hi only
        margin = hi - actual
        pct = None

    if margin < 0:
        status = MarginStatus.BREACH
    elif pct is not None and pct < 30:
        status = MarginStatus.TIGHT
    elif pct is None and margin < 1e-6:
        status = MarginStatus.TIGHT
    else:
        status = MarginStatus.SAFE

    return (round(margin, 4), pct, status)


def _build_customer_specs(
    product_batch_id: str,
    product_type,
    customer_requirements: Optional[List[CustomerRequirement]] = None,
) -> List[CustomerSpec]:
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

            # compliance status
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

            margin_value, margin_pct, margin_status = _compute_margin(v.value, lo, hi)

            specs.append(CustomerSpec(
                parameter=v.parameter,
                unit=v.unit or product_fw.unit_for(v.parameter) or "",
                requiredMin=lo,
                requiredMax=hi,
                requiredTarget=target,
                actualValue=v.value,
                complianceStatus=status,
                marginValue=margin_value,
                marginPct=margin_pct,
                marginStatus=margin_status,
            ))
    return specs


# --------------------------------------------------------------------------
# Chain walk
# --------------------------------------------------------------------------
def _chain_for_certificate(cert: Certificate) -> Tuple[Optional[str], Optional[str], Optional[str], int]:
    pb = db.product_batch_by_number(cert.productBatchNumber)
    if not pb:
        return (None, None, None, 1)
    metal_no = pb.sourceMetalBatchNumber
    qual_no = None
    lot_no = None
    coverage = 2
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
# Task wiring (Phase 10)
# --------------------------------------------------------------------------
TASK_TITLES = {
    TaskType.REVIEW: "Review Certificate",
    "approve_cert": "Approve Certificate",
    "approve_dispatch": "Approve Dispatch",
    "release": "Release Certificate",
}


def _emit_certificate_tasks(cert: Certificate) -> None:
    """Create the 4-step task chain for a new certificate.

    Review → Approve Certificate → Approve Dispatch → Release Certificate.
    All scoped to moduleKey='certificates' with recordKey=cert.certificateNumber.
    Each later task is blockedBy the previous so they appear in My Work in order.
    """
    review = task_engine.create_task(
        TaskCreate(
            title="Review Certificate",
            description=f"Verify customer specs and quality summary for {cert.certificateNumber}.",
            taskType=TaskType.REVIEW,
            moduleKey="certificates",
            stageKey="review",
            assignmentType=AssignmentType.ROLE,
            assignedRole="qa-engineer",
            entityType="certificate",
            entityId=cert.id,
            recordKey=cert.certificateNumber,
            priority=TaskPriority.HIGH,
            slaTargetMins=240,
            slaWarningMins=180,
            slaEscalationMins=480,
            nextAction="Open the workbench and confirm spec compliance.",
            href=f"/certificates/{cert.certificateNumber}",
        ),
        actor=cert.createdBy or "System",
        actor_role="QA Engineer",
    )

    approve_cert = task_engine.create_task(
        TaskCreate(
            title="Approve Certificate",
            description=f"QA Manager sign-off for issuing {cert.certificateNumber}.",
            taskType=TaskType.APPROVAL,
            moduleKey="certificates",
            stageKey="approve",
            assignmentType=AssignmentType.ROLE,
            assignedRole="qa-manager",
            entityType="certificate",
            entityId=cert.id,
            recordKey=cert.certificateNumber,
            priority=TaskPriority.HIGH,
            blockedBy=[review.id],
            slaTargetMins=240,
            slaWarningMins=180,
            slaEscalationMins=480,
            nextAction="Issue the certificate to lock the COA.",
            href=f"/certificates/{cert.certificateNumber}",
        ),
        actor=cert.createdBy or "System",
        actor_role="QA Engineer",
    )

    approve_dispatch = task_engine.create_task(
        TaskCreate(
            title="Approve Dispatch",
            description=f"Authorize dispatch of {cert.certificateNumber} to {cert.customer}.",
            taskType=TaskType.APPROVAL,
            moduleKey="certificates",
            stageKey="dispatch-approve",
            assignmentType=AssignmentType.ROLE,
            assignedRole="qa-manager",
            entityType="certificate",
            entityId=cert.id,
            recordKey=cert.certificateNumber,
            priority=TaskPriority.HIGH,
            blockedBy=[approve_cert.id],
            slaTargetMins=480,
            slaWarningMins=360,
            slaEscalationMins=720,
            nextAction="Approve, hold, reject, or override the dispatch.",
            href=f"/certificates/{cert.certificateNumber}",
        ),
        actor=cert.createdBy or "System",
        actor_role="QA Engineer",
    )

    task_engine.create_task(
        TaskCreate(
            title="Release Certificate",
            description=f"Mark {cert.certificateNumber} released to {cert.customer}.",
            taskType=TaskType.DISPATCH,
            moduleKey="certificates",
            stageKey="release",
            assignmentType=AssignmentType.ROLE,
            assignedRole="qa-manager",
            entityType="certificate",
            entityId=cert.id,
            recordKey=cert.certificateNumber,
            priority=TaskPriority.MEDIUM,
            blockedBy=[approve_dispatch.id],
            slaTargetMins=720,
            slaWarningMins=480,
            slaEscalationMins=1440,
            nextAction="Release the dispatch after approval.",
            href=f"/certificates/{cert.certificateNumber}",
        ),
        actor=cert.createdBy or "System",
        actor_role="QA Engineer",
    )


def _complete_task_by_stage(cert: Certificate, stage_key: str, actor: str, actor_role: str) -> None:
    for t in db.tasks.values():
        if (
            t.moduleKey == "certificates"
            and t.entityId == cert.id
            and t.stageKey == stage_key
            and t.state not in (TaskState.COMPLETED, TaskState.CANCELLED)
        ):
            task_engine.complete_task(t.id, actor=actor, actor_role=actor_role)


def _decide_approval_task_by_stage(
    cert: Certificate, stage_key: str, decision_label: str, reason: Optional[str], actor: str, actor_role: str
) -> None:
    from app.schemas.task import ApprovalDecision as TaskApprovalDecision
    decision_map = {
        "Approve": TaskApprovalDecision.APPROVE,
        "Hold": TaskApprovalDecision.HOLD,
        "Reject": TaskApprovalDecision.REJECT,
        "Override": TaskApprovalDecision.OVERRIDE,
        "Release": TaskApprovalDecision.APPROVE,
    }
    td = decision_map.get(decision_label, TaskApprovalDecision.APPROVE)
    for t in db.tasks.values():
        if (
            t.moduleKey == "certificates"
            and t.entityId == cert.id
            and t.stageKey == stage_key
            and t.state not in (TaskState.COMPLETED, TaskState.CANCELLED)
        ):
            task_engine.decide_approval(t.id, td, reason, actor=actor, actor_role=actor_role)


# --------------------------------------------------------------------------
# CRUD — list + summary + get
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


# --------------------------------------------------------------------------
# Create — emits 4-task chain (Phase 10)
# --------------------------------------------------------------------------
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
        qrCodeValue=f"{PUBLIC_BASE_URL}/verify/{number}",
        barcodeValue=number,
        notes=body.notes,
        version=1,
        rootCertificateNumber=number,
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

    # Phase 10 — task chain
    _emit_certificate_tasks(cert)

    return cert


# --------------------------------------------------------------------------
# Issue — completes Review + Approve-Certificate tasks; sets reviewedBy
# --------------------------------------------------------------------------
@router.post("/certificates/{certificate_number}/issue", response_model=Certificate)
def issue_certificate(certificate_number: str) -> Certificate:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    prev = c.model_dump()
    actor = "Current User"
    c.status = CertificateStatus.ISSUED
    c.issuedAt = now_iso()
    c.issuedBy = actor
    c.reviewedBy = c.reviewedBy or actor
    c.reviewedAt = c.reviewedAt or c.issuedAt
    c.dispatchStatus = DispatchStatus.READY
    c.digitalSignaturePlaceholder = f"SHA256:{c.id[:8].upper()}-{c.certificateNumber}"
    audit.record(actor, "QA Manager", "issue", "certificate",
                 c.id, prev, c.model_dump())
    notif.emit(
        "Certificate issued",
        f"{c.certificateNumber} issued for {c.productBatchNumber}.",
        NotificationSeverity.SUCCESS,
        "certificate", c.id,
    )

    # Complete the Review task and decide the Approve-Certificate task.
    _complete_task_by_stage(c, "review", actor=actor, actor_role="QA Engineer")
    _decide_approval_task_by_stage(c, "approve", "Approve", None, actor=actor, actor_role="QA Manager")

    return c


# --------------------------------------------------------------------------
# Dispatch decision — persists approval record + decides task (Phase 11)
# --------------------------------------------------------------------------
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
    actor = "Current User"
    actor_role = "QA Manager"
    ts = now_iso()
    if body.decision == DispatchDecision.APPROVE:
        c.dispatchStatus = DispatchStatus.APPROVED
        c.dispatchApprovedBy = actor
        c.dispatchApprovedAt = ts
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
        c.dispatchApprovedBy = actor
        c.dispatchApprovedAt = ts
        title = "Dispatch overridden"
        message = f"{c.certificateNumber} overridden — {body.reason}."
        severity = NotificationSeverity.WARNING
    else:  # RELEASE
        c.dispatchStatus = DispatchStatus.RELEASED
        c.releasedBy = actor
        c.releasedAt = ts
        title = "Shipment released"
        message = f"{c.certificateNumber} released for shipment."
        severity = NotificationSeverity.SUCCESS

    # Persist the approval record (Phase 11).
    rec = DispatchApprovalRecord(
        id=str(uuid.uuid4()),
        certificateId=c.id,
        certificateNumber=c.certificateNumber,
        decision=body.decision,
        reason=body.reason,
        decidedBy=actor,
        decidedByRole=actor_role,
        decidedAt=ts,
    )
    db.dispatch_approvals[rec.id] = rec

    audit.record(
        actor, actor_role,
        body.decision.value.lower(), "certificate",
        c.id, prev, c.model_dump(), notes=body.reason,
    )
    notif.emit(title, message, severity, "certificate", c.id)

    # Complete the matching task (Phase 10).
    if body.decision in (DispatchDecision.APPROVE, DispatchDecision.OVERRIDE):
        _decide_approval_task_by_stage(c, "dispatch-approve", body.decision.value, body.reason, actor=actor, actor_role=actor_role)
    elif body.decision == DispatchDecision.HOLD:
        _decide_approval_task_by_stage(c, "dispatch-approve", "Hold", body.reason, actor=actor, actor_role=actor_role)
    elif body.decision == DispatchDecision.REJECT:
        _decide_approval_task_by_stage(c, "dispatch-approve", "Reject", body.reason, actor=actor, actor_role=actor_role)
    elif body.decision == DispatchDecision.RELEASE:
        _complete_task_by_stage(c, "release", actor=actor, actor_role=actor_role)

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
# Versioning (Phase 3) — copy-on-revise
# --------------------------------------------------------------------------
@router.post("/certificates/{certificate_number}/revise", response_model=Certificate, status_code=201)
def revise_certificate(certificate_number: str, body: CertificateReviseCreate) -> Certificate:
    base = db.certificate_by_number(certificate_number)
    if not base:
        raise HTTPException(404, "Certificate not found")
    if not body.revisionReason or not body.revisionReason.strip():
        raise HTTPException(400, "Revision reason is required.")

    # Lock the parent as Revised — it remains visible but is immutable from here on.
    prev = base.model_dump()
    base.status = CertificateStatus.REVISED
    audit.record("Current User", "QA Manager", "revise-parent", "certificate",
                 base.id, prev, base.model_dump(), notes=body.revisionReason)

    root = base.rootCertificateNumber or base.certificateNumber
    siblings = db.certificates_in_lineage(root)
    next_version = max(c.version for c in siblings) + 1
    new_number = f"{root}-R{next_version - 1}"  # R1, R2, …

    pb = db.product_batch_by_number(base.productBatchNumber)
    specs = _build_customer_specs(pb.id, pb.productType, body.customerRequirements) if pb else list(base.customerSpecs)

    cid = str(uuid.uuid4())
    cert = Certificate(
        id=cid,
        certificateNumber=new_number,
        productBatchNumber=base.productBatchNumber,
        productBatchId=base.productBatchId,
        customer=base.customer,
        customerSpecs=specs,
        status=CertificateStatus.DRAFT,
        dispatchStatus=DispatchStatus.PENDING,
        createdAt=now_iso(),
        createdBy="Current User",
        qrCodeValue=f"{PUBLIC_BASE_URL}/verify/{new_number}",
        barcodeValue=new_number,
        notes=body.notes or base.notes,
        version=next_version,
        parentCertificateNumber=base.certificateNumber,
        rootCertificateNumber=root,
        revisionReason=body.revisionReason,
    )
    db.certificates[cid] = cert

    audit.record("Current User", "QA Manager", "create-revision", "certificate",
                 cid, None, cert.model_dump(), notes=body.revisionReason)
    notif.emit(
        "Certificate revised",
        f"{new_number} created — revision of {base.certificateNumber}.",
        NotificationSeverity.INFO,
        "certificate", cid,
    )

    _emit_certificate_tasks(cert)
    return cert


@router.get("/certificates/{certificate_number}/versions", response_model=list[Certificate])
def list_versions(certificate_number: str) -> list[Certificate]:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    root = c.rootCertificateNumber or c.certificateNumber
    return db.certificates_in_lineage(root)


# --------------------------------------------------------------------------
# Dispatch approval records (Phase 11)
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/dispatch-approvals", response_model=list[DispatchApprovalRecord])
def list_dispatch_approvals(certificate_number: str) -> list[DispatchApprovalRecord]:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    items = db.dispatch_approvals_for_certificate(c.id)
    items.sort(key=lambda a: a.decidedAt, reverse=True)
    return items


# --------------------------------------------------------------------------
# Insights
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/insights", response_model=CertificateInsight)
def certificate_insights(certificate_number: str) -> CertificateInsight:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

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
        has_product_batch=bool(pb),
    )


# --------------------------------------------------------------------------
# Quality summary
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/quality-summary", response_model=QualitySummary)
def certificate_quality_summary(certificate_number: str) -> QualitySummary:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    metal_no, qual_no, lot_no, _ = _chain_for_certificate(c)
    genealogy_fw.build_chain(NodeType.CERTIFICATE, c.certificateNumber)

    steps: List[QualityStepSummary] = []

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

    pb = db.product_batch_by_number(c.productBatchNumber)
    if pb:
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

    # Phase 13 — include the certificate as the 5th step
    steps.append(QualityStepSummary(
        label="Certificate of Analysis",
        nodeKey=c.certificateNumber,
        nodeType=NodeType.CERTIFICATE.value,
        status=c.status.value,
        href=f"/certificates/{c.certificateNumber}",
    ))

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


# --------------------------------------------------------------------------
# Events timeline (Phase 12) — merged audit + dispatch + tasks
# --------------------------------------------------------------------------
_AUDIT_LABELS = {
    "create": "Certificate generated",
    "issue": "Certificate issued",
    "cancel": "Certificate cancelled",
    "approve": "Dispatch approved",
    "hold": "Dispatch held",
    "reject": "Dispatch rejected",
    "override": "Dispatch overridden",
    "release": "Shipment released",
    "revise-parent": "Parent locked as revised",
    "create-revision": "Revision created",
}


def _audit_severity(action: str) -> str:
    if action in ("create", "issue", "approve", "release"):
        return "success"
    if action in ("hold", "override", "revise-parent", "create-revision"):
        return "warning"
    if action in ("reject", "cancel"):
        return "danger"
    return "info"


@router.get("/certificates/{certificate_number}/events", response_model=list[CertificateEvent])
def certificate_events(certificate_number: str) -> list[CertificateEvent]:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    events: list[CertificateEvent] = []

    # Audit-sourced events
    for log in audit.all_logs(limit=2000):
        if log.entityType == "certificate" and log.entityId == c.id:
            label = _AUDIT_LABELS.get(log.action, log.action.replace("-", " ").title())
            events.append(CertificateEvent(
                timestamp=log.timestamp,
                actor=log.actor,
                actorRole=log.actorRole,
                action=log.action,
                label=label,
                severity=_audit_severity(log.action),
                notes=log.notes,
                relatedId=log.id,
                relatedType="audit",
            ))

    # Task lifecycle events
    for t in db.tasks.values():
        if t.moduleKey == "certificates" and t.entityId == c.id:
            events.append(CertificateEvent(
                timestamp=t.createdAt,
                actor=t.createdBy or "System",
                actorRole=t.assignedRole,
                action="task-created",
                label=f"Task created — {t.title}",
                severity="info",
                relatedId=t.id,
                relatedType="task",
            ))
            if t.completedAt:
                events.append(CertificateEvent(
                    timestamp=t.completedAt,
                    actor=t.completedBy or "System",
                    actorRole=t.assignedRole,
                    action="task-completed",
                    label=f"Task completed — {t.title}",
                    severity="success",
                    notes=t.decisionReason,
                    relatedId=t.id,
                    relatedType="task",
                ))

    # Dispatch approval records
    for rec in db.dispatch_approvals_for_certificate(c.id):
        events.append(CertificateEvent(
            timestamp=rec.decidedAt,
            actor=rec.decidedBy,
            actorRole=rec.decidedByRole,
            action=f"dispatch-{rec.decision.value.lower()}",
            label=f"Dispatch {rec.decision.value.lower()}",
            severity=_audit_severity(rec.decision.value.lower()),
            notes=rec.reason,
            relatedId=rec.id,
            relatedType="dispatch-approval",
        ))

    events.sort(key=lambda e: e.timestamp)
    return events


# --------------------------------------------------------------------------
# QR + Barcode SVG endpoints (Phase 7, 8) — server-rendered, scannable
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/qr.svg")
def certificate_qr(certificate_number: str) -> Response:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    payload = c.qrCodeValue or f"{PUBLIC_BASE_URL}/verify/{certificate_number}"
    try:
        import qrcode
        import qrcode.image.svg as svg
        factory = svg.SvgPathImage
        img = qrcode.make(payload, image_factory=factory, box_size=10, border=2)
        buf = io.BytesIO()
        img.save(buf)
        return Response(content=buf.getvalue(), media_type="image/svg+xml")
    except ImportError:
        raise HTTPException(503, "QR generation requires the `qrcode` package. Run `pip install -r requirements.txt`.")


@router.get("/certificates/{certificate_number}/barcode.svg")
def certificate_barcode(certificate_number: str) -> Response:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    payload = c.barcodeValue or c.certificateNumber
    try:
        from barcode import Code128
        from barcode.writer import SVGWriter
        buf = io.BytesIO()
        Code128(payload, writer=SVGWriter()).write(
            buf, options={"write_text": False, "module_height": 10.0, "quiet_zone": 2.0}
        )
        return Response(content=buf.getvalue(), media_type="image/svg+xml")
    except ImportError:
        raise HTTPException(503, "Barcode generation requires the `python-barcode` package.")


# --------------------------------------------------------------------------
# Preview (Phase 2) — structured payload the frontend renders as COA layout
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/preview")
def certificate_preview(certificate_number: str) -> dict:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    metal_no, qual_no, lot_no, _ = _chain_for_certificate(c)
    insight = certificate_insights(certificate_number)

    return {
        "certificate": c.model_dump(),
        "chain": {
            "rawMaterialLotNumber": lot_no,
            "qualificationNumber": qual_no,
            "metalBatchNumber": metal_no,
            "productBatchNumber": c.productBatchNumber,
        },
        "insight": insight.model_dump(),
        "verifyUrl": f"{PUBLIC_BASE_URL}/verify/{c.certificateNumber}",
        "qrUrl": f"/api/v1/certificates/{c.certificateNumber}/qr.svg",
        "barcodeUrl": f"/api/v1/certificates/{c.certificateNumber}/barcode.svg",
        "generatedAt": now_iso(),
    }


# --------------------------------------------------------------------------
# PDF (Phase 9)
# --------------------------------------------------------------------------
@router.get("/certificates/{certificate_number}/pdf")
def certificate_pdf(certificate_number: str) -> Response:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
    except ImportError:
        raise HTTPException(503, "PDF generation requires the `reportlab` package. Run `pip install -r requirements.txt`.")

    metal_no, qual_no, lot_no, _ = _chain_for_certificate(c)
    insight = certificate_insights(certificate_number)

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4

    ink = HexColor("#0F172A")
    muted = HexColor("#64748B")
    accent = HexColor("#7C3AED")
    line = HexColor("#E2E8F0")
    success = HexColor("#059669")
    danger = HexColor("#DC2626")
    warning = HexColor("#D97706")

    margin = 18 * mm
    y = page_h - margin

    # Header band
    pdf.setFillColor(accent)
    pdf.rect(0, page_h - 12 * mm, page_w, 12 * mm, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, page_h - 8 * mm, "QUALITY360 — CERTIFICATE OF ANALYSIS")
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(page_w - margin, page_h - 8 * mm, f"Version {c.version}  ·  {c.status.value}")

    y = page_h - 18 * mm

    # Title block
    pdf.setFillColor(ink)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margin, y, c.certificateNumber)
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(muted)
    pdf.drawString(margin, y - 6 * mm, f"Customer: {c.customer}  ·  Product Batch: {c.productBatchNumber}")

    # QR top-right
    try:
        import qrcode
        from PIL import Image as PILImage  # noqa: F401
        qr_img = qrcode.make(c.qrCodeValue or f"{PUBLIC_BASE_URL}/verify/{c.certificateNumber}")
        qbuf = io.BytesIO()
        qr_img.save(qbuf, format="PNG")
        qbuf.seek(0)
        pdf.drawImage(ImageReader(qbuf), page_w - margin - 28 * mm, y - 22 * mm,
                      width=28 * mm, height=28 * mm, preserveAspectRatio=True, mask='auto')
    except Exception:
        pass

    y -= 28 * mm

    # Identification table
    pdf.setStrokeColor(line)
    pdf.setLineWidth(0.4)
    pdf.line(margin, y, page_w - margin, y)
    y -= 5 * mm

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(margin, y, "IDENTIFICATION")
    y -= 5 * mm

    rows = [
        ("Certificate Number", c.certificateNumber),
        ("Customer", c.customer),
        ("Product Batch", c.productBatchNumber),
        ("Metal Batch", metal_no or "—"),
        ("Process Qualification", qual_no or "—"),
        ("Raw Material Lot", lot_no or "—"),
        ("Issued", f"{c.issuedAt or '—'}  ·  {c.issuedBy or '—'}"),
        ("Reviewed By", c.reviewedBy or "—"),
        ("Approved By", c.dispatchApprovedBy or "—"),
        ("Released By", c.releasedBy or "—"),
    ]
    pdf.setFillColor(ink)
    pdf.setFont("Helvetica", 9)
    for label, value in rows:
        pdf.setFillColor(muted)
        pdf.drawString(margin, y, label)
        pdf.setFillColor(ink)
        pdf.drawString(margin + 50 * mm, y, str(value)[:60])
        y -= 4.5 * mm

    y -= 3 * mm
    pdf.setStrokeColor(line)
    pdf.line(margin, y, page_w - margin, y)
    y -= 5 * mm

    # Customer spec table
    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(margin, y, "CUSTOMER SPECIFICATION COMPLIANCE")
    y -= 5 * mm

    pdf.setFont("Helvetica-Bold", 8)
    pdf.setFillColor(ink)
    pdf.drawString(margin, y, "Parameter")
    pdf.drawString(margin + 50 * mm, y, "Required")
    pdf.drawString(margin + 90 * mm, y, "Actual")
    pdf.drawString(margin + 115 * mm, y, "Unit")
    pdf.drawString(margin + 140 * mm, y, "Margin")
    pdf.drawString(margin + 165 * mm, y, "Status")
    y -= 4 * mm
    pdf.line(margin, y, page_w - margin, y)
    y -= 4 * mm

    pdf.setFont("Helvetica", 8.5)
    for s in c.customerSpecs:
        if y < 35 * mm:
            pdf.showPage()
            y = page_h - margin
        required = "—"
        if s.requiredMin is not None and s.requiredMax is not None:
            required = f"{s.requiredMin} – {s.requiredMax}"
        elif s.requiredMin is not None:
            required = f"≥ {s.requiredMin}"
        elif s.requiredMax is not None:
            required = f"≤ {s.requiredMax}"
        pdf.setFillColor(ink)
        pdf.drawString(margin, y, s.parameter[:24])
        pdf.drawString(margin + 50 * mm, y, required)
        pdf.drawString(margin + 90 * mm, y, "—" if s.actualValue is None else str(s.actualValue))
        pdf.drawString(margin + 115 * mm, y, s.unit or "")
        margin_text = "—" if s.marginPct is None else f"{s.marginPct:.0f}%"
        pdf.drawString(margin + 140 * mm, y, margin_text)
        tone = {
            ResultStatus.PASS: success,
            ResultStatus.WARNING: warning,
            ResultStatus.FAIL: danger,
        }.get(s.complianceStatus, muted)
        pdf.setFillColor(tone)
        pdf.drawString(margin + 165 * mm, y, s.complianceStatus.value)
        y -= 4.5 * mm

    y -= 3 * mm
    pdf.setStrokeColor(line)
    pdf.line(margin, y, page_w - margin, y)
    y -= 5 * mm

    # Release confidence + health
    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(margin, y, "QUALITY ASSURANCE SUMMARY")
    y -= 5 * mm

    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColor(ink)
    pdf.drawString(margin, y, f"Release Confidence: {insight.releaseConfidence} / 100")
    pdf.drawString(margin + 80 * mm, y, f"Certificate Health: {insight.certificateHealth.score if insight.certificateHealth else '—'} / 100")
    y -= 5 * mm
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(muted)
    for obs in insight.observations[:4]:
        pdf.drawString(margin, y, f"• {obs}")
        y -= 4 * mm

    # Barcode footer
    try:
        from barcode import Code128
        from barcode.writer import ImageWriter
        bbuf = io.BytesIO()
        Code128(c.barcodeValue or c.certificateNumber, writer=ImageWriter()).write(
            bbuf, options={"write_text": False, "module_height": 8.0, "quiet_zone": 1.0}
        )
        bbuf.seek(0)
        pdf.drawImage(ImageReader(bbuf), margin, 20 * mm,
                      width=80 * mm, height=14 * mm, preserveAspectRatio=False, mask='auto')
        pdf.setFont("Helvetica", 7)
        pdf.setFillColor(muted)
        pdf.drawString(margin, 18 * mm, c.barcodeValue or c.certificateNumber)
    except Exception:
        pass

    # Signature + verify
    pdf.setFont("Helvetica", 7)
    pdf.setFillColor(muted)
    pdf.drawRightString(page_w - margin, 22 * mm, f"Digital signature: {c.digitalSignaturePlaceholder}")
    pdf.drawRightString(page_w - margin, 18 * mm, f"Verify: {PUBLIC_BASE_URL}/verify/{c.certificateNumber}")
    pdf.drawRightString(page_w - margin, 14 * mm, f"Generated {now_iso()}")

    pdf.showPage()
    pdf.save()

    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{c.certificateNumber}.pdf"',
        },
    )


# --------------------------------------------------------------------------
# Public verification (Phase 14) — read-only, no auth
# --------------------------------------------------------------------------
@router.get("/verify/certificates/{certificate_number}", response_model=VerifyPayload)
def verify_certificate(certificate_number: str) -> VerifyPayload:
    c = db.certificate_by_number(certificate_number)
    if not c:
        raise HTTPException(404, "Certificate not found")

    metal_no, qual_no, lot_no, _ = _chain_for_certificate(c)

    pass_count = sum(1 for s in c.customerSpecs if s.complianceStatus == ResultStatus.PASS)
    total = len(c.customerSpecs)

    insight = certificate_insights(certificate_number)

    return VerifyPayload(
        certificateNumber=c.certificateNumber,
        version=c.version,
        customer=c.customer,
        productBatchNumber=c.productBatchNumber,
        metalBatchNumber=metal_no,
        qualificationNumber=qual_no,
        rawMaterialLotNumber=lot_no,
        status=c.status,
        dispatchStatus=c.dispatchStatus,
        issuedAt=c.issuedAt,
        issuedBy=c.issuedBy,
        customerComplianceCount=pass_count,
        customerComplianceTotal=total,
        releaseConfidence=insight.releaseConfidence,
        certificateHealth=insight.certificateHealth.score if insight.certificateHealth else None,
        verifiedAt=now_iso(),
        authentic=c.status in (CertificateStatus.ISSUED, CertificateStatus.REVISED),
    )
