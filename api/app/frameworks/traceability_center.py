"""Traceability Center V2 — chain-wide aggregators.

This framework composes the existing per-module surfaces (audit log, approvals,
tasks, lineage) into chain-scoped views: a unified event stream, an approval
history, a quality summary, a scorecard, an impact map, a risk panel, and a
related-records pane.

Everything here is read-only. Mutations stay in their module-owned routers.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Tuple

from app.frameworks import audit as audit_fw
from app.frameworks import genealogy as gen
from app.frameworks import task_engine
from app.schemas.genealogy import GenealogyChain, GenealogyNode, NodeType
from app.schemas.task import TaskState, TaskType
from app.schemas.traceability_v2 import (
    ApprovalRationale,
    ApprovalsResponse,
    ChainQualitySummary,
    ChainRiskPanel,
    ImpactAnalysis,
    ImpactItem,
    QualityEvent,
    QualityEventCategory,
    QualityEventSeverity,
    QualityEventsResponse,
    QualityScorecard,
    RelatedRecord,
    RelatedRecords,
    RiskFinding,
    ScorecardMetric,
)
from app.store import db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _chain(node_type: NodeType, node_key: str) -> Optional[GenealogyChain]:
    return gen.build_chain(node_type, node_key)


def _entity_id_for_audit(node: GenealogyNode) -> str:
    return node.entityId


_ACTION_TO_CATEGORY = {
    # Sampling
    "create-sample": QualityEventCategory.SAMPLING,
    "recollect-sample": QualityEventCategory.SAMPLING,
    "discard-sample": QualityEventCategory.SAMPLING,
    # Testing
    "manual-entry": QualityEventCategory.TESTING,
    "result-manual-entry": QualityEventCategory.TESTING,
    "retest": QualityEventCategory.TESTING,
    "file-upload": QualityEventCategory.TESTING,
    # Imports
    "instrument-import": QualityEventCategory.IMPORT,
    "import-from-instrument": QualityEventCategory.IMPORT,
    # Approvals
    "approve": QualityEventCategory.APPROVAL,
    "release": QualityEventCategory.RELEASE,
    "hold": QualityEventCategory.APPROVAL,
    "reject": QualityEventCategory.APPROVAL,
    "downgrade": QualityEventCategory.APPROVAL,
    "retest-decision": QualityEventCategory.APPROVAL,
    # Certificate / dispatch
    "issue-certificate": QualityEventCategory.CERTIFICATE,
    "create-certificate": QualityEventCategory.CERTIFICATE,
    "revise-certificate": QualityEventCategory.CERTIFICATE,
    "dispatch-decision": QualityEventCategory.DISPATCH,
}


def _categorize(action: str, entity_type: str = "") -> QualityEventCategory:
    a = (action or "").lower()
    et = (entity_type or "").lower()

    if a in _ACTION_TO_CATEGORY:
        return _ACTION_TO_CATEGORY[a]

    # Entity-type driven inference — seed audit logs use short verbs
    # ("create", "import", "issue") so the entity is what tells us what
    # was created.
    if "sample" in et:
        return QualityEventCategory.SAMPLING
    if "result" in et or "test" in et:
        return QualityEventCategory.TESTING
    if "approval" in et:
        return QualityEventCategory.APPROVAL
    if "certificate" in et or "dispatch" in et:
        return (
            QualityEventCategory.DISPATCH
            if "dispatch" in a or "dispatch" in et
            else QualityEventCategory.CERTIFICATE
        )
    if "task" in et:
        return QualityEventCategory.APPROVAL if "approval" in a else QualityEventCategory.OTHER

    # Action-keyword heuristics for variants we did not enumerate explicitly.
    if "sample" in a:
        return QualityEventCategory.SAMPLING
    if "import" in a:
        return QualityEventCategory.IMPORT
    if "result" in a or "test" in a or "retest" in a:
        return QualityEventCategory.TESTING
    if "release" in a:
        return QualityEventCategory.RELEASE
    if "approv" in a or "decision" in a or a.startswith("approval:") or "reject" in a or "hold" in a or "downgrade" in a:
        return QualityEventCategory.APPROVAL
    if "dispatch" in a:
        return QualityEventCategory.DISPATCH
    if "certificate" in a or "coa" in a or "issue" in a:
        return QualityEventCategory.CERTIFICATE
    return QualityEventCategory.OTHER


def _event_severity(action: str) -> QualityEventSeverity:
    a = (action or "").lower()
    if "reject" in a:
        return QualityEventSeverity.DANGER
    if "hold" in a or "override" in a or "downgrade" in a or "escalat" in a:
        return QualityEventSeverity.WARNING
    if "approve" in a or "release" in a or "issue" in a:
        return QualityEventSeverity.SUCCESS
    return QualityEventSeverity.INFO


# ---------------------------------------------------------------------------
# Phase 5 — Quality Events stream across the chain
# ---------------------------------------------------------------------------
def chain_events(node_type: NodeType, node_key: str) -> Optional[QualityEventsResponse]:
    chain = _chain(node_type, node_key)
    if chain is None:
        return None

    events: List[QualityEvent] = []
    for node in chain.nodes:
        # Pull every audit event for the node + its child sample/result entities.
        for etype, eid in gen._audit_entity_types_for(node.nodeType, node.entityId):
            for log in audit_fw.list_for(entity_type=etype, entity_id=eid, limit=500):
                cat = _categorize(log.action, log.entityType)
                sev = _event_severity(log.action)
                events.append(QualityEvent(
                    timestamp=log.timestamp,
                    category=cat,
                    severity=sev,
                    title=log.action,
                    actor=log.actor,
                    actorRole=log.actorRole,
                    nodeType=node.nodeType,
                    nodeKey=node.nodeKey,
                    entityType=log.entityType,
                    entityId=log.entityId,
                    notes=log.notes,
                ))

    events.sort(key=lambda e: e.timestamp, reverse=True)
    return QualityEventsResponse(currentKey=node_key, events=events)


# ---------------------------------------------------------------------------
# Phase 6 + 8 — Unified approvals with rationale
# ---------------------------------------------------------------------------
def _decision_tone(decision: str) -> str:
    d = (decision or "").lower()
    if d in {"approved", "approve", "released", "release", "issued", "issue"}:
        return "success"
    if d in {"rejected", "reject"}:
        return "danger"
    if d in {"hold", "on hold", "downgrade", "downgraded", "override", "overridden", "retest"}:
        return "warning"
    return "info"


def _supporting_evidence_for(entity_type: str, entity_id: str, node: GenealogyNode) -> List[str]:
    """Best-effort list of human readable evidence references."""
    out: List[str] = []
    # For module-level approvals, surface compliance + test counts.
    if entity_type == "receipt":
        out.append(f"Lot {node.nodeKey}")
    elif entity_type == "qualification":
        out.append(f"Qualification {node.nodeKey}")
    elif entity_type == "metal-batch":
        out.append(f"Metal batch {node.nodeKey}")
    elif entity_type == "product-batch":
        out.append(f"Product batch {node.nodeKey}")
    elif entity_type == "certificate":
        out.append(f"Certificate {node.nodeKey}")
    out.append(f"Audit trail · {entity_type}/{entity_id[:8]}")
    return out


def chain_approvals(node_type: NodeType, node_key: str) -> Optional[ApprovalsResponse]:
    chain = _chain(node_type, node_key)
    if chain is None:
        return None

    items: List[ApprovalRationale] = []

    for node in chain.nodes:
        if node.nodeType == NodeType.RAW_MATERIAL:
            for a in db.approvals_for_receipt(node.entityId):
                items.append(ApprovalRationale(
                    nodeType=node.nodeType, nodeKey=node.nodeKey,
                    entityType="receipt", entityId=node.entityId,
                    decision=a.decision.value if hasattr(a.decision, "value") else str(a.decision),
                    decisionTone=_decision_tone(a.decision.value if hasattr(a.decision, "value") else str(a.decision)),
                    approver=a.decidedBy,
                    decidedAt=a.decidedAt,
                    reason=a.reason,
                    supportingEvidence=_supporting_evidence_for("receipt", node.entityId, node),
                    href=node.href,
                ))
        elif node.nodeType == NodeType.PROCESS_QUALIFICATION:
            for a in db.qapprovals_for_qualification(node.entityId):
                items.append(ApprovalRationale(
                    nodeType=node.nodeType, nodeKey=node.nodeKey,
                    entityType="qualification", entityId=node.entityId,
                    decision=a.decision.value if hasattr(a.decision, "value") else str(a.decision),
                    decisionTone=_decision_tone(a.decision.value if hasattr(a.decision, "value") else str(a.decision)),
                    approver=a.decidedBy,
                    decidedAt=a.decidedAt,
                    reason=a.reason,
                    supportingEvidence=_supporting_evidence_for("qualification", node.entityId, node),
                    href=node.href,
                ))
        elif node.nodeType == NodeType.METAL_BATCH:
            for a in db.mapprovals_for_batch(node.entityId):
                items.append(ApprovalRationale(
                    nodeType=node.nodeType, nodeKey=node.nodeKey,
                    entityType="metal-batch", entityId=node.entityId,
                    decision=a.decision.value if hasattr(a.decision, "value") else str(a.decision),
                    decisionTone=_decision_tone(a.decision.value if hasattr(a.decision, "value") else str(a.decision)),
                    approver=a.decidedBy,
                    decidedAt=a.decidedAt,
                    reason=a.reason,
                    supportingEvidence=_supporting_evidence_for("metal-batch", node.entityId, node),
                    href=node.href,
                ))
        elif node.nodeType == NodeType.PRODUCT_BATCH:
            for a in db.papprovals_for_batch(node.entityId):
                items.append(ApprovalRationale(
                    nodeType=node.nodeType, nodeKey=node.nodeKey,
                    entityType="product-batch", entityId=node.entityId,
                    decision=a.decision.value if hasattr(a.decision, "value") else str(a.decision),
                    decisionTone=_decision_tone(a.decision.value if hasattr(a.decision, "value") else str(a.decision)),
                    approver=a.decidedBy,
                    decidedAt=a.decidedAt,
                    reason=a.reason,
                    supportingEvidence=_supporting_evidence_for("product-batch", node.entityId, node),
                    href=node.href,
                ))
        elif node.nodeType == NodeType.CERTIFICATE:
            cert = db.certificates.get(node.entityId)
            if cert:
                # Issue event
                if cert.issuedAt and cert.issuedBy:
                    items.append(ApprovalRationale(
                        nodeType=node.nodeType, nodeKey=node.nodeKey,
                        entityType="certificate", entityId=node.entityId,
                        decision="Issued",
                        decisionTone="success",
                        approver=cert.issuedBy,
                        decidedAt=cert.issuedAt,
                        reason=cert.revisionReason,
                        supportingEvidence=_supporting_evidence_for("certificate", node.entityId, node),
                        href=node.href,
                    ))
                # Review event
                if cert.reviewedAt and cert.reviewedBy:
                    items.append(ApprovalRationale(
                        nodeType=node.nodeType, nodeKey=node.nodeKey,
                        entityType="certificate", entityId=node.entityId,
                        decision="Reviewed",
                        decisionTone="info",
                        approver=cert.reviewedBy,
                        decidedAt=cert.reviewedAt,
                        reason=None,
                        supportingEvidence=_supporting_evidence_for("certificate", node.entityId, node),
                        href=node.href,
                    ))
                for dispatch in db.dispatch_approvals_for_certificate(node.entityId):
                    items.append(ApprovalRationale(
                        nodeType=node.nodeType, nodeKey=node.nodeKey,
                        entityType="certificate", entityId=node.entityId,
                        decision=dispatch.decision.value if hasattr(dispatch.decision, "value") else str(dispatch.decision),
                        decisionTone=_decision_tone(dispatch.decision.value if hasattr(dispatch.decision, "value") else str(dispatch.decision)),
                        approver=dispatch.decidedBy,
                        decidedAt=dispatch.decidedAt,
                        reason=dispatch.reason,
                        supportingEvidence=_supporting_evidence_for("certificate", node.entityId, node)
                            + [f"Dispatch {dispatch.decision.value if hasattr(dispatch.decision, 'value') else dispatch.decision}"],
                        href=node.href,
                    ))

    items.sort(key=lambda x: x.decidedAt, reverse=True)
    return ApprovalsResponse(currentKey=node_key, items=items)


# ---------------------------------------------------------------------------
# Phase 7 — Quality Summary
# ---------------------------------------------------------------------------
def _tone_for_status(node: GenealogyNode) -> Tuple[str, str]:
    """Return (label, tone) describing the chain status from `node`'s view."""
    return node.status, node.statusTone


def _chain_tasks(chain: GenealogyChain) -> List:
    """All tasks attached to any record in the chain."""
    record_keys = {n.nodeKey for n in chain.nodes}
    entity_ids = {n.entityId for n in chain.nodes}
    out = []
    for t in db.tasks.values():
        if (t.recordKey and t.recordKey in record_keys) or (t.entityId and t.entityId in entity_ids):
            out.append(t)
    return out


def chain_summary(node_type: NodeType, node_key: str) -> Optional[ChainQualitySummary]:
    chain = _chain(node_type, node_key)
    if chain is None:
        return None

    # Pick the most-downstream node as the "headline" status.
    tail = chain.nodes[-1] if chain.nodes else None
    overall_status = tail.status if tail else "Pending"
    overall_tone = tail.statusTone if tail else "neutral"

    tasks = _chain_tasks(chain)
    open_states = {TaskState.NEW, TaskState.ASSIGNED, TaskState.IN_PROGRESS, TaskState.WAITING, TaskState.ESCALATED}

    pending_tasks = sum(1 for t in tasks if t.state in open_states and t.taskType != TaskType.APPROVAL)
    pending_approvals = sum(1 for t in tasks if t.state in open_states and t.taskType == TaskType.APPROVAL)
    overdue = sum(1 for t in tasks if t.state in open_states and (t.slaTargetMins is not None))
    # Decorate to compute isOverdue via the engine — list_tasks already does that
    decorated_overdue = [task_engine._decorate(t) for t in tasks]
    overdue = sum(1 for t in decorated_overdue if t.isOverdue and t.state in open_states)

    # Open deviations heuristic: any module status in {On Hold, Rejected, Downgraded, Retest}.
    DEVIATION_STATUSES = {"On Hold", "Rejected", "Downgraded", "Retest", "Cancelled"}
    open_deviations = sum(1 for n in chain.nodes if n.status in DEVIATION_STATUSES)

    # Risk level: derive from worst-case along the chain.
    risk = "Low"
    for n in chain.nodes:
        if n.statusTone == "danger":
            risk = "High"
            break
        if n.statusTone == "warning" and risk != "High":
            risk = "Medium"

    last_event = None
    for n in chain.nodes:
        for etype, eid in gen._audit_entity_types_for(n.nodeType, n.entityId):
            logs = audit_fw.list_for(entity_type=etype, entity_id=eid, limit=1)
            if logs:
                ts = logs[0].timestamp
                if last_event is None or ts > last_event:
                    last_event = ts

    notes: List[str] = []
    if open_deviations:
        notes.append(f"{open_deviations} record(s) on hold or rejected along the chain.")
    if overdue:
        notes.append(f"{overdue} task(s) past SLA.")

    return ChainQualitySummary(
        currentKey=node_key,
        overallStatus=overall_status,
        overallStatusTone=overall_tone,
        riskLevel=risk,
        pendingTasks=pending_tasks,
        pendingApprovals=pending_approvals,
        overdueItems=overdue,
        openDeviations=open_deviations,
        chainCoverage=chain.coverage,
        lastEventAt=last_event,
        notes=notes,
    )


# ---------------------------------------------------------------------------
# Phase 9 — Quality Scorecard
# ---------------------------------------------------------------------------
def _score_tone(score: int) -> str:
    if score >= 85:
        return "success"
    if score >= 60:
        return "info"
    if score >= 40:
        return "warning"
    return "danger"


def chain_scorecard(node_type: NodeType, node_key: str) -> Optional[QualityScorecard]:
    chain = _chain(node_type, node_key)
    if chain is None:
        return None

    # 1. Compliance: average of node tones — success=100, info=80, warning=55, danger=25.
    tone_score = {"success": 100, "info": 80, "neutral": 70, "accent": 80, "warning": 55, "danger": 25}
    if chain.nodes:
        compliance = round(sum(tone_score.get(n.statusTone, 70) for n in chain.nodes) / len(chain.nodes))
    else:
        compliance = 0

    # 2. Traceability coverage: distinct node types present / 5
    traceability_pct = int(round(chain.coverage / 5 * 100))

    # 3. Approval coverage: approvals collected for nodes that are at terminal
    #    decisions / total terminal nodes.
    approvals_resp = chain_approvals(node_type, node_key)
    approvals = approvals_resp.items if approvals_resp else []
    terminal_statuses = {
        "Approved", "Released", "Issued", "Rejected", "On Hold", "Downgraded", "Cancelled",
    }
    terminal_nodes = [n for n in chain.nodes if n.status in terminal_statuses]
    if terminal_nodes:
        covered = sum(1 for n in terminal_nodes if any(a.entityId == n.entityId for a in approvals))
        approval_pct = int(round(covered / len(terminal_nodes) * 100))
    else:
        approval_pct = 100 if not chain.nodes else 0

    # 4. Audit completeness: nodes with ≥ 1 audit log / total nodes
    audit_pct = 0
    if chain.nodes:
        with_audit = 0
        for n in chain.nodes:
            has_log = False
            for etype, eid in gen._audit_entity_types_for(n.nodeType, n.entityId):
                if audit_fw.list_for(entity_type=etype, entity_id=eid, limit=1):
                    has_log = True
                    break
            if has_log:
                with_audit += 1
        audit_pct = int(round(with_audit / len(chain.nodes) * 100))

    # 5. Task completion: completed / total chain tasks (100% if none scheduled).
    tasks = _chain_tasks(chain)
    if tasks:
        completed = sum(1 for t in tasks if t.state == TaskState.COMPLETED)
        task_pct = int(round(completed / len(tasks) * 100))
    else:
        task_pct = 100

    overall = round((compliance + traceability_pct + approval_pct + audit_pct + task_pct) / 5)

    return QualityScorecard(
        currentKey=node_key,
        compliance=ScorecardMetric(label="Compliance", score=compliance, tone=_score_tone(compliance),
                                    detail="Weighted by node status across the chain."),
        traceabilityCoverage=ScorecardMetric(label="Traceability Coverage", score=traceability_pct,
                                              tone=_score_tone(traceability_pct),
                                              detail=f"{chain.coverage} of 5 lifecycle steps populated."),
        approvalCoverage=ScorecardMetric(label="Approval Coverage", score=approval_pct,
                                          tone=_score_tone(approval_pct),
                                          detail=f"{len(approvals)} approval decision(s) recorded."),
        auditCompleteness=ScorecardMetric(label="Audit Completeness", score=audit_pct,
                                           tone=_score_tone(audit_pct),
                                           detail="Nodes with at least one audit entry."),
        taskCompletion=ScorecardMetric(label="Task Completion", score=task_pct,
                                        tone=_score_tone(task_pct),
                                        detail=f"{len(tasks)} task(s) attached to this chain."),
        overall=overall,
    )


# ---------------------------------------------------------------------------
# Phase 12 — Impact Analysis (downstream fan-out)
# ---------------------------------------------------------------------------
def _all_downstream(node_type: NodeType, node_key: str) -> List[Tuple[NodeType, str, int]]:
    """Multi-hop downstream walk, returning (type, key, distance) for every
    descendant. Distance is the number of hops from the trigger."""
    out: List[Tuple[NodeType, str, int]] = []
    frontier: List[Tuple[NodeType, str, int]] = [(node_type, node_key, 0)]
    seen: set = set()
    while frontier:
        nt, nk, d = frontier.pop(0)
        if (nt, nk) in seen:
            continue
        seen.add((nt, nk))
        # Skip emitting the trigger itself.
        if d > 0:
            out.append((nt, nk, d))
        # Walk one hop downstream — every child, not just the first.
        if nt == NodeType.RAW_MATERIAL:
            for q in db.qualifications.values():
                if getattr(q, "sourceLotNumber", None) == nk:
                    frontier.append((NodeType.PROCESS_QUALIFICATION, q.qualificationNumber, d + 1))
        elif nt == NodeType.PROCESS_QUALIFICATION:
            for b in db.metal_batches.values():
                if getattr(b, "sourceQualificationNumber", None) == nk:
                    frontier.append((NodeType.METAL_BATCH, b.metalBatchNumber, d + 1))
        elif nt == NodeType.METAL_BATCH:
            for p in db.product_batches.values():
                if getattr(p, "sourceMetalBatchNumber", None) == nk:
                    frontier.append((NodeType.PRODUCT_BATCH, p.productBatchNumber, d + 1))
        elif nt == NodeType.PRODUCT_BATCH:
            for c in db.certificates.values():
                if getattr(c, "productBatchNumber", None) == nk:
                    frontier.append((NodeType.CERTIFICATE, c.certificateNumber, d + 1))
    return out


def chain_impact(node_type: NodeType, node_key: str) -> Optional[ImpactAnalysis]:
    trigger = gen._node_for(node_type, node_key)
    if trigger is None:
        return None

    descendants = _all_downstream(node_type, node_key)
    affected: List[ImpactItem] = []
    customers: List[str] = []
    certificates: List[str] = []
    for nt, nk, dist in descendants:
        node = gen._node_for(nt, nk)
        if node is None:
            continue
        relationship = "Downstream"
        if nt == NodeType.CERTIFICATE:
            relationship = "Certificate"
            certificates.append(nk)
            cert = db.certificate_by_number(nk)
            if cert and cert.customer and cert.customer not in customers:
                customers.append(cert.customer)
        elif nt == NodeType.PRODUCT_BATCH:
            relationship = "Product Batch"
            pb = db.product_batch_by_number(nk)
            if pb and pb.customer and pb.customer not in customers:
                customers.append(pb.customer)
        elif nt == NodeType.METAL_BATCH:
            relationship = "Metal Batch"
        elif nt == NodeType.PROCESS_QUALIFICATION:
            relationship = "Qualification"
        affected.append(ImpactItem(
            nodeType=nt, nodeKey=nk,
            title=node.title, subtitle=node.subtitle,
            status=node.status, statusTone=node.statusTone,
            href=node.href, relationship=relationship, distance=dist,
        ))

    affected.sort(key=lambda x: (x.distance, x.nodeType.value))

    # Summary text
    summary = f"{len(affected)} downstream record(s) affected"
    if certificates:
        summary += f", {len(certificates)} certificate(s)"
    if customers:
        summary += f", {len(customers)} customer(s)"
    summary += "."
    if not affected:
        summary = "No downstream records — this is currently a terminal record."

    return ImpactAnalysis(
        currentKey=node_key,
        triggerStatus=trigger.status,
        affected=affected,
        affectedCustomers=customers,
        affectedCertificates=certificates,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Phase 13 — Risk Panel
# ---------------------------------------------------------------------------
def chain_risk(node_type: NodeType, node_key: str) -> Optional[ChainRiskPanel]:
    chain = _chain(node_type, node_key)
    if chain is None:
        return None

    # Open deviations: nodes on hold/rejected/downgrade.
    deviation_nodes = [n for n in chain.nodes if n.status in {"On Hold", "Rejected", "Downgraded", "Retest", "Cancelled"}]
    deviation_finding = RiskFinding(
        label="Open Deviations",
        count=len(deviation_nodes),
        severity="danger" if any(n.status == "Rejected" for n in deviation_nodes)
                  else "warning" if deviation_nodes else "info",
        detail=None if deviation_nodes else "No open deviations on the chain.",
        items=[f"{n.title} · {n.status}" for n in deviation_nodes],
    )

    # Manual overrides: dispatch approvals with OVERRIDE decision.
    override_items: List[str] = []
    for node in chain.nodes:
        if node.nodeType == NodeType.CERTIFICATE:
            for d in db.dispatch_approvals_for_certificate(node.entityId):
                if (d.decision.value if hasattr(d.decision, "value") else str(d.decision)) == "Override":
                    override_items.append(f"{node.title} · {d.reason or 'Override'}")
    override_finding = RiskFinding(
        label="Manual Overrides",
        count=len(override_items),
        severity="warning" if override_items else "info",
        detail=None if override_items else "No manual overrides recorded.",
        items=override_items,
    )

    # Failed tests: walk results across all nodes.
    failed_items: List[str] = []

    def _check(results, label):
        for r in results:
            os = r.overallStatus.value if hasattr(r.overallStatus, "value") else str(r.overallStatus)
            if os == "Fail":
                failed_items.append(f"{label} · {r.id[:8]}")

    for n in chain.nodes:
        if n.nodeType == NodeType.RAW_MATERIAL:
            _check(db.results_for_receipt(n.entityId), n.title)
        elif n.nodeType == NodeType.PROCESS_QUALIFICATION:
            _check(db.qresults_for_qualification(n.entityId), n.title)
        elif n.nodeType == NodeType.METAL_BATCH:
            _check(db.mresults_for_batch(n.entityId), n.title)
        elif n.nodeType == NodeType.PRODUCT_BATCH:
            _check(db.presults_for_batch(n.entityId), n.title)
    failed_finding = RiskFinding(
        label="Failed Tests",
        count=len(failed_items),
        severity="danger" if failed_items else "info",
        detail=None if failed_items else "No failing test results in the chain.",
        items=failed_items[:10],
    )

    # Overdue tasks
    tasks = [task_engine._decorate(t) for t in _chain_tasks(chain)]
    overdue_tasks = [t for t in tasks if t.isOverdue and t.state in {TaskState.NEW, TaskState.ASSIGNED, TaskState.IN_PROGRESS, TaskState.WAITING, TaskState.ESCALATED}]
    overdue_finding = RiskFinding(
        label="Overdue Tasks",
        count=len(overdue_tasks),
        severity="danger" if overdue_tasks else "info",
        detail=None if overdue_tasks else "No tasks past SLA.",
        items=[f"{t.title} · {t.recordKey or t.entityId[:8]}" for t in overdue_tasks[:10]],
    )

    # Pending reviews: open approval-type tasks + nodes in Under Review / Pending Review.
    pending_reviews = [t for t in tasks if t.taskType == TaskType.APPROVAL and t.state in {TaskState.NEW, TaskState.ASSIGNED, TaskState.IN_PROGRESS, TaskState.WAITING}]
    review_nodes = [n for n in chain.nodes if n.status in {"Pending Review", "Under Review"}]
    pending_review_finding = RiskFinding(
        label="Pending Reviews",
        count=len(pending_reviews) + len(review_nodes),
        severity="warning" if (pending_reviews or review_nodes) else "info",
        detail=None if (pending_reviews or review_nodes) else "No outstanding reviews.",
        items=[f"{t.title} · {t.recordKey or ''}" for t in pending_reviews[:5]]
            + [f"{n.title} · {n.status}" for n in review_nodes[:5]],
    )

    findings = [
        deviation_finding,
        override_finding,
        failed_finding,
        overdue_finding,
        pending_review_finding,
    ]

    # Overall risk = worst severity
    severities = [f.severity for f in findings if f.count > 0]
    if "danger" in severities:
        risk_level = "High"
    elif "warning" in severities:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return ChainRiskPanel(currentKey=node_key, riskLevel=risk_level, findings=findings)


# ---------------------------------------------------------------------------
# Phase 11 — Related Records (parents/siblings/children)
# ---------------------------------------------------------------------------
def _siblings_of(node_type: NodeType, node_key: str) -> List[Tuple[NodeType, str]]:
    """Peers that share the same parent. Skip the node itself."""
    if node_type == NodeType.RAW_MATERIAL:
        return []
    out: List[Tuple[NodeType, str]] = []
    if node_type == NodeType.PROCESS_QUALIFICATION:
        rec = db.qualification_by_number(node_key)
        if rec and getattr(rec, "sourceLotNumber", None):
            for q in db.qualifications.values():
                if q.qualificationNumber == node_key:
                    continue
                if getattr(q, "sourceLotNumber", None) == rec.sourceLotNumber:
                    out.append((NodeType.PROCESS_QUALIFICATION, q.qualificationNumber))
    elif node_type == NodeType.METAL_BATCH:
        rec = db.metal_batch_by_number(node_key)
        if rec and getattr(rec, "sourceQualificationNumber", None):
            for b in db.metal_batches.values():
                if b.metalBatchNumber == node_key:
                    continue
                if getattr(b, "sourceQualificationNumber", None) == rec.sourceQualificationNumber:
                    out.append((NodeType.METAL_BATCH, b.metalBatchNumber))
    elif node_type == NodeType.PRODUCT_BATCH:
        rec = db.product_batch_by_number(node_key)
        if rec and getattr(rec, "sourceMetalBatchNumber", None):
            for p in db.product_batches.values():
                if p.productBatchNumber == node_key:
                    continue
                if getattr(p, "sourceMetalBatchNumber", None) == rec.sourceMetalBatchNumber:
                    out.append((NodeType.PRODUCT_BATCH, p.productBatchNumber))
    elif node_type == NodeType.CERTIFICATE:
        rec = db.certificate_by_number(node_key)
        if rec:
            for c in db.certificates.values():
                if c.certificateNumber == node_key:
                    continue
                if c.productBatchNumber == rec.productBatchNumber:
                    out.append((NodeType.CERTIFICATE, c.certificateNumber))
    return out


def _related_record_from_node(n: GenealogyNode, relation: str) -> RelatedRecord:
    return RelatedRecord(
        nodeType=n.nodeType, nodeKey=n.nodeKey,
        title=n.title, subtitle=n.subtitle,
        status=n.status, statusTone=n.statusTone,
        href=n.href, relation=relation,
    )


def related_records(node_type: NodeType, node_key: str) -> Optional[RelatedRecords]:
    if gen._resolve(node_type, node_key) is None:
        return None

    # Use the lineage framework for parents and direct children.
    from app.frameworks import lineage as lineage_fw

    lineage = lineage_fw.build_lineage(node_type, node_key)
    parents: List[RelatedRecord] = []
    children: List[RelatedRecord] = []
    if lineage:
        for e in lineage.parents:
            parents.append(_related_record_from_node(e.node, "Parent"))
        for e in lineage.children:
            children.append(_related_record_from_node(e.node, "Child"))

    siblings: List[RelatedRecord] = []
    for st, sk in _siblings_of(node_type, node_key):
        n = gen._node_for(st, sk)
        if n is not None:
            siblings.append(_related_record_from_node(n, "Sibling"))

    return RelatedRecords(currentKey=node_key, parents=parents, siblings=siblings, children=children)


__all__ = [
    "chain_events",
    "chain_approvals",
    "chain_summary",
    "chain_scorecard",
    "chain_impact",
    "chain_risk",
    "related_records",
]
