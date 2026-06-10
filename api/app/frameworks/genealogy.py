"""Quality Genealogy & Traceability Framework.

Single source of truth for the cross-module chain:

    Raw Material Lot → Process Qualification → Metal Batch → Product Batch → Certificate

Every entity already lives in its own module store. The framework resolves
those entities to `GenealogyNode`s and walks the bidirectional graph by
following the link fields the modules already carry (e.g.
`qualification.sourceLotNumber`, `metal_batch.sourceQualificationNumber`).

Phase 4 (Product Batch) and Phase 5 (Certificate) are not built yet — the
framework simply omits those nodes when no data is present and the journey
panel reports them as `Pending`.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Tuple

from app.frameworks import audit as audit_fw
from app.schemas.genealogy import (
    GenealogyChain,
    GenealogyLink,
    GenealogyNode,
    JourneyEvent,
    JourneyStep,
    JourneyStepKey,
    JourneyStepStatus,
    JourneyTimeline,
    NodeType,
    TraceabilityDashboard,
    TraceabilitySearchHit,
)
from app.schemas.qualification import QualificationStatus
from app.schemas.metal_batch import MetalBatchStatus
from app.schemas.product_batch import ProductBatchStatus
from app.schemas.certificate import CertificateStatus, DispatchStatus
from app.schemas.common import ReceiptStatus
from app.store import db


# ---------------------------------------------------------------------------
# Tone helpers — every module exposes its own status enum, but the genealogy
# UI needs a single colour vocabulary. Mapping lives here so the framework can
# stay generic.
# ---------------------------------------------------------------------------
_RECEIPT_TONE = {
    ReceiptStatus.APPROVED.value: "success",
    ReceiptStatus.REJECTED.value: "danger",
    ReceiptStatus.ON_HOLD.value: "warning",
    ReceiptStatus.PENDING_REVIEW.value: "info",
    ReceiptStatus.PENDING_TESTING.value: "info",
    ReceiptStatus.PENDING_SAMPLING.value: "neutral",
}
_QUAL_TONE = {
    QualificationStatus.RELEASED.value: "success",
    QualificationStatus.REJECTED.value: "danger",
    QualificationStatus.ON_HOLD.value: "warning",
    QualificationStatus.PENDING_REVIEW.value: "info",
    QualificationStatus.PENDING_TESTING.value: "info",
    QualificationStatus.PENDING_SAMPLING.value: "neutral",
    QualificationStatus.CANCELLED.value: "neutral",
}
_METAL_TONE = {
    MetalBatchStatus.RELEASED.value: "success",
    MetalBatchStatus.REJECTED.value: "danger",
    MetalBatchStatus.ON_HOLD.value: "warning",
    MetalBatchStatus.DOWNGRADED.value: "warning",
    MetalBatchStatus.PENDING_REVIEW.value: "info",
    MetalBatchStatus.PENDING_TESTING.value: "info",
    MetalBatchStatus.PENDING_SAMPLING.value: "neutral",
    MetalBatchStatus.CANCELLED.value: "neutral",
}
_PRODUCT_TONE = {
    ProductBatchStatus.APPROVED.value: "success",
    ProductBatchStatus.REJECTED.value: "danger",
    ProductBatchStatus.ON_HOLD.value: "warning",
    ProductBatchStatus.PENDING_REVIEW.value: "info",
    ProductBatchStatus.PENDING_TESTING.value: "info",
    ProductBatchStatus.PENDING_SAMPLING.value: "neutral",
    ProductBatchStatus.RETEST.value: "warning",
    ProductBatchStatus.CANCELLED.value: "neutral",
}
_CERT_TONE = {
    CertificateStatus.ISSUED.value: "success",
    CertificateStatus.DRAFT.value: "info",
    CertificateStatus.REVISED.value: "warning",
    CertificateStatus.CANCELLED.value: "neutral",
}
_DISPATCH_TONE = {
    DispatchStatus.PENDING.value: "neutral",
    DispatchStatus.READY.value: "info",
    DispatchStatus.APPROVED.value: "success",
    DispatchStatus.HELD.value: "warning",
    DispatchStatus.REJECTED.value: "danger",
    DispatchStatus.RELEASED.value: "success",
    DispatchStatus.OVERRIDDEN.value: "warning",
}


_STEP_LABELS: Dict[NodeType, Tuple[JourneyStepKey, int, str]] = {
    NodeType.RAW_MATERIAL: (JourneyStepKey.STEP_1, 1, "Incoming Inspection"),
    NodeType.PROCESS_QUALIFICATION: (JourneyStepKey.STEP_2, 2, "Process Qualification"),
    NodeType.METAL_BATCH: (JourneyStepKey.STEP_3, 3, "Metal Quality"),
    NodeType.PRODUCT_BATCH: (JourneyStepKey.STEP_4, 4, "Product Testing"),
    NodeType.CERTIFICATE: (JourneyStepKey.STEP_5, 5, "Certificate"),
}


# ---------------------------------------------------------------------------
# Node materialisation — one builder per module that returns a GenealogyNode
# given the raw record. Builders silently skip missing relations so a partial
# chain (common in phase 1-3 demo data) still renders.
# ---------------------------------------------------------------------------
def _receipt_node(receipt) -> GenealogyNode:
    supplier = db.suppliers.get(receipt.supplierId)
    material = db.materials.get(receipt.materialId)
    subtitle_parts = []
    if material:
        subtitle_parts.append(material.name)
    if supplier:
        subtitle_parts.append(supplier.name)
    badges = []
    if receipt.quantity:
        badges.append(f"{receipt.quantity:g} {receipt.uom}")
    if receipt.poNumber:
        badges.append(receipt.poNumber)
    return GenealogyNode(
        nodeType=NodeType.RAW_MATERIAL,
        nodeKey=receipt.lotNumber,
        entityId=receipt.id,
        title=receipt.lotNumber,
        subtitle=" · ".join(subtitle_parts) or None,
        status=receipt.status.value if hasattr(receipt.status, "value") else str(receipt.status),
        statusTone=_RECEIPT_TONE.get(
            receipt.status.value if hasattr(receipt.status, "value") else str(receipt.status),
            "neutral",
        ),
        timestamp=receipt.receiptDate,
        href=f"/inspection/{receipt.lotNumber}",
        badges=badges,
    )


def _qualification_node(q) -> GenealogyNode:
    material = db.materials.get(q.materialId)
    subtitle_parts = []
    if material:
        subtitle_parts.append(material.name)
    subtitle_parts.append(q.consumptionArea.value if hasattr(q.consumptionArea, "value") else str(q.consumptionArea))
    badges = [f"{q.quantity:g} {q.uom}", q.batchNumber]
    return GenealogyNode(
        nodeType=NodeType.PROCESS_QUALIFICATION,
        nodeKey=q.qualificationNumber,
        entityId=q.id,
        title=q.qualificationNumber,
        subtitle=" · ".join(subtitle_parts) or None,
        status=q.status.value if hasattr(q.status, "value") else str(q.status),
        statusTone=_QUAL_TONE.get(
            q.status.value if hasattr(q.status, "value") else str(q.status),
            "neutral",
        ),
        timestamp=q.requestedAt,
        href=f"/qualification/{q.qualificationNumber}",
        badges=badges,
    )


def _metal_node(b) -> GenealogyNode:
    grade = b.productGrade.value if hasattr(b.productGrade, "value") else str(b.productGrade)
    badges = [grade, b.potline, f"{b.weight:g} {b.uom}"]
    return GenealogyNode(
        nodeType=NodeType.METAL_BATCH,
        nodeKey=b.metalBatchNumber,
        entityId=b.id,
        title=b.metalBatchNumber,
        subtitle=f"{grade} · {b.potline}",
        status=b.status.value if hasattr(b.status, "value") else str(b.status),
        statusTone=_METAL_TONE.get(
            b.status.value if hasattr(b.status, "value") else str(b.status),
            "neutral",
        ),
        timestamp=b.productionDate,
        href=f"/metal-quality/{b.metalBatchNumber}",
        badges=badges,
    )


def _product_node(b) -> GenealogyNode:
    ptype = b.productType.value if hasattr(b.productType, "value") else str(b.productType)
    badges = [ptype, f"{b.weight:g} {b.uom}"]
    if b.customer:
        badges.append(b.customer)
    return GenealogyNode(
        nodeType=NodeType.PRODUCT_BATCH,
        nodeKey=b.productBatchNumber,
        entityId=b.id,
        title=b.productBatchNumber,
        subtitle=ptype + (f" · {b.customer}" if b.customer else ""),
        status=b.status.value if hasattr(b.status, "value") else str(b.status),
        statusTone=_PRODUCT_TONE.get(
            b.status.value if hasattr(b.status, "value") else str(b.status),
            "neutral",
        ),
        timestamp=b.productionDate,
        href=f"/product-quality/{b.productBatchNumber}",
        badges=badges,
    )


def _certificate_node(c) -> GenealogyNode:
    badges = [c.customer or ""]
    badges = [b for b in badges if b]
    status_val = c.status.value if hasattr(c.status, "value") else str(c.status)
    dispatch_val = c.dispatchStatus.value if hasattr(c.dispatchStatus, "value") else str(c.dispatchStatus)
    if dispatch_val in {DispatchStatus.RELEASED.value, DispatchStatus.APPROVED.value}:
        tone = _DISPATCH_TONE.get(dispatch_val, "success")
    elif dispatch_val in {DispatchStatus.HELD.value, DispatchStatus.REJECTED.value, DispatchStatus.OVERRIDDEN.value}:
        tone = _DISPATCH_TONE.get(dispatch_val, "warning")
    else:
        tone = _CERT_TONE.get(status_val, "neutral")
    return GenealogyNode(
        nodeType=NodeType.CERTIFICATE,
        nodeKey=c.certificateNumber,
        entityId=c.id,
        title=c.certificateNumber,
        subtitle=f"{status_val} · Dispatch {dispatch_val}",
        status=status_val,
        statusTone=tone,
        timestamp=c.issuedAt or c.createdAt,
        href=f"/traceability?certificate={c.certificateNumber}",
        badges=badges,
    )


# ---------------------------------------------------------------------------
# Resolution — find the record for a (nodeType, nodeKey) pair.
# ---------------------------------------------------------------------------
def _resolve(node_type: NodeType, node_key: str):
    if node_type == NodeType.RAW_MATERIAL:
        return db.receipt_by_lot(node_key)
    if node_type == NodeType.PROCESS_QUALIFICATION:
        return db.qualification_by_number(node_key)
    if node_type == NodeType.METAL_BATCH:
        return db.metal_batch_by_number(node_key)
    if node_type == NodeType.PRODUCT_BATCH:
        return db.product_batch_by_number(node_key)
    if node_type == NodeType.CERTIFICATE:
        return db.certificate_by_number(node_key)
    return None


def _node_for(node_type: NodeType, node_key: str) -> Optional[GenealogyNode]:
    rec = _resolve(node_type, node_key)
    if rec is None:
        return None
    if node_type == NodeType.RAW_MATERIAL:
        return _receipt_node(rec)
    if node_type == NodeType.PROCESS_QUALIFICATION:
        return _qualification_node(rec)
    if node_type == NodeType.METAL_BATCH:
        return _metal_node(rec)
    if node_type == NodeType.PRODUCT_BATCH:
        return _product_node(rec)
    if node_type == NodeType.CERTIFICATE:
        return _certificate_node(rec)
    return None


# ---------------------------------------------------------------------------
# Walks the chain starting from any node. Returns the linear journey in
# Step-1 → Step-5 order plus the links between successive nodes.
# ---------------------------------------------------------------------------
def _walk_backwards(start_type: NodeType, start_key: str) -> List[Tuple[NodeType, str]]:
    """Follow upstream pointers from `start` toward Step-1."""
    chain: List[Tuple[NodeType, str]] = [(start_type, start_key)]
    cursor_type, cursor_key = start_type, start_key
    while True:
        rec = _resolve(cursor_type, cursor_key)
        if rec is None:
            break
        if cursor_type == NodeType.CERTIFICATE:
            src = getattr(rec, "productBatchNumber", None)
            if src:
                chain.insert(0, (NodeType.PRODUCT_BATCH, src))
                cursor_type, cursor_key = NodeType.PRODUCT_BATCH, src
                continue
        if cursor_type == NodeType.PRODUCT_BATCH:
            src = getattr(rec, "sourceMetalBatchNumber", None)
            if src:
                chain.insert(0, (NodeType.METAL_BATCH, src))
                cursor_type, cursor_key = NodeType.METAL_BATCH, src
                continue
        if cursor_type == NodeType.METAL_BATCH:
            src = getattr(rec, "sourceQualificationNumber", None)
            if src:
                chain.insert(0, (NodeType.PROCESS_QUALIFICATION, src))
                cursor_type, cursor_key = NodeType.PROCESS_QUALIFICATION, src
                continue
        if cursor_type == NodeType.PROCESS_QUALIFICATION:
            src = getattr(rec, "sourceLotNumber", None)
            if src:
                chain.insert(0, (NodeType.RAW_MATERIAL, src))
                cursor_type, cursor_key = NodeType.RAW_MATERIAL, src
                continue
        break
    return chain


def _walk_forwards(start_type: NodeType, start_key: str) -> List[Tuple[NodeType, str]]:
    """Follow downstream pointers from `start` toward Step-5."""
    forward: List[Tuple[NodeType, str]] = []
    if start_type == NodeType.RAW_MATERIAL:
        for q in db.qualifications.values():
            if getattr(q, "sourceLotNumber", None) == start_key:
                forward.append((NodeType.PROCESS_QUALIFICATION, q.qualificationNumber))
                forward.extend(_walk_forwards(NodeType.PROCESS_QUALIFICATION, q.qualificationNumber))
                break
    elif start_type == NodeType.PROCESS_QUALIFICATION:
        for b in db.metal_batches.values():
            if getattr(b, "sourceQualificationNumber", None) == start_key:
                forward.append((NodeType.METAL_BATCH, b.metalBatchNumber))
                forward.extend(_walk_forwards(NodeType.METAL_BATCH, b.metalBatchNumber))
                break
    elif start_type == NodeType.METAL_BATCH:
        for p in db.product_batches.values():
            if getattr(p, "sourceMetalBatchNumber", None) == start_key:
                forward.append((NodeType.PRODUCT_BATCH, p.productBatchNumber))
                forward.extend(_walk_forwards(NodeType.PRODUCT_BATCH, p.productBatchNumber))
                break
    elif start_type == NodeType.PRODUCT_BATCH:
        for c in db.certificates.values():
            if getattr(c, "productBatchNumber", None) == start_key:
                forward.append((NodeType.CERTIFICATE, c.certificateNumber))
                break
    return forward


def build_chain(node_type: NodeType, node_key: str) -> Optional[GenealogyChain]:
    if _resolve(node_type, node_key) is None:
        return None

    backward = _walk_backwards(node_type, node_key)
    forward = _walk_forwards(node_type, node_key)
    # backward already contains the start node at position [-1]; forward starts
    # downstream of it.
    ordered: List[Tuple[NodeType, str]] = backward + forward

    seen = set()
    deduped: List[Tuple[NodeType, str]] = []
    for nt, nk in ordered:
        if (nt, nk) in seen:
            continue
        seen.add((nt, nk))
        deduped.append((nt, nk))

    nodes: List[GenealogyNode] = []
    for nt, nk in deduped:
        n = _node_for(nt, nk)
        if n is not None:
            nodes.append(n)

    links: List[GenealogyLink] = []
    for prev, nxt in zip(nodes, nodes[1:]):
        links.append(GenealogyLink(
            fromKey=prev.nodeKey, toKey=nxt.nodeKey,
            relation="produced", direction="forward",
        ))

    coverage = len({n.nodeType for n in nodes})
    current_key = node_key
    return GenealogyChain(
        currentKey=current_key,
        nodes=nodes,
        links=links,
        coverage=coverage,
    )


# ---------------------------------------------------------------------------
# Journey timeline — combines the 5-step quality journey with a chronological
# stream of events sourced from the audit framework.
# ---------------------------------------------------------------------------
def _derive_step_status(node: GenealogyNode) -> JourneyStepStatus:
    s = node.status
    if s in {"Approved", "Released", "Issued"}:
        return JourneyStepStatus.COMPLETE
    if s in {"Rejected", "Cancelled"}:
        return JourneyStepStatus.BLOCKED
    if s in {"On Hold"}:
        return JourneyStepStatus.BLOCKED
    if s in {"Pending Sampling"}:
        return JourneyStepStatus.IN_PROGRESS
    if s in {"Pending Testing", "Pending Review", "Under Review", "Downgraded", "Retest", "Draft", "Revised"}:
        return JourneyStepStatus.IN_PROGRESS
    return JourneyStepStatus.IN_PROGRESS


def build_journey(node_type: NodeType, node_key: str) -> Optional[JourneyTimeline]:
    chain = build_chain(node_type, node_key)
    if chain is None:
        return None

    by_step: Dict[JourneyStepKey, GenealogyNode] = {}
    for n in chain.nodes:
        skey, _, _ = _STEP_LABELS[n.nodeType]
        by_step[skey] = n

    steps: List[JourneyStep] = []
    for nt, (skey, order, label) in _STEP_LABELS.items():
        node = by_step.get(skey)
        if node is not None:
            steps.append(JourneyStep(
                key=skey, order=order, label=label,
                status=_derive_step_status(node),
                nodeKey=node.nodeKey, nodeType=node.nodeType,
                timestamp=node.timestamp, href=node.href,
            ))
        else:
            steps.append(JourneyStep(
                key=skey, order=order, label=label,
                status=JourneyStepStatus.PENDING,
            ))

    # Events: audit log entries for every entity in the chain, sorted ascending.
    events: List[JourneyEvent] = []
    node_index = {n.entityId: n for n in chain.nodes}
    for n in chain.nodes:
        entity_types = _audit_entity_types_for(n.nodeType, n.entityId)
        for etype, eid in entity_types:
            for log in audit_fw.list_for(entity_type=etype, entity_id=eid, limit=200):
                events.append(JourneyEvent(
                    timestamp=log.timestamp,
                    actor=log.actor,
                    actorRole=log.actorRole,
                    action=log.action,
                    entityType=log.entityType,
                    entityId=log.entityId,
                    nodeKey=n.nodeKey,
                    nodeType=n.nodeType,
                    notes=log.notes,
                ))
    events.sort(key=lambda e: e.timestamp)

    return JourneyTimeline(
        currentKey=node_key,
        steps=steps,
        events=events,
    )


def _audit_entity_types_for(node_type: NodeType, entity_id: str) -> List[Tuple[str, str]]:
    """Audit entries for a node live under multiple `entityType` strings
    (the root entity plus its child samples/results). Collect them all so the
    timeline shows the full activity for the node."""
    if node_type == NodeType.RAW_MATERIAL:
        out = [("receipt", entity_id)]
        for s in db.samples_for_receipt(entity_id):
            out.append(("sample", s.id))
        for r in db.results_for_receipt(entity_id):
            out.append(("result", r.id))
        return out
    if node_type == NodeType.PROCESS_QUALIFICATION:
        out = [("qualification", entity_id)]
        for s in db.qsamples_for_qualification(entity_id):
            out.append(("qualification-sample", s.id))
        for r in db.qresults_for_qualification(entity_id):
            out.append(("qualification-result", r.id))
        return out
    if node_type == NodeType.METAL_BATCH:
        out = [("metal-batch", entity_id)]
        for s in db.msamples_for_batch(entity_id):
            out.append(("metal-sample", s.id))
        for r in db.mresults_for_batch(entity_id):
            out.append(("metal-result", r.id))
        return out
    if node_type == NodeType.PRODUCT_BATCH:
        out = [("product-batch", entity_id)]
        for s in db.psamples_for_batch(entity_id):
            out.append(("product-sample", s.id))
        for r in db.presults_for_batch(entity_id):
            out.append(("product-result", r.id))
        return out
    if node_type == NodeType.CERTIFICATE:
        return [("certificate", entity_id)]
    return []


# ---------------------------------------------------------------------------
# Search — match across every known entity key with a single substring filter.
# ---------------------------------------------------------------------------
def search(query: str, limit: int = 20) -> List[TraceabilitySearchHit]:
    if not query:
        return []
    q = query.strip().lower()
    hits: List[TraceabilitySearchHit] = []

    for r in db.receipts.values():
        if q in r.lotNumber.lower() or q in r.poNumber.lower() or q in r.vehicleNumber.lower():
            supplier = db.suppliers.get(r.supplierId)
            material = db.materials.get(r.materialId)
            sub = " · ".join(filter(None, [material.name if material else None, supplier.name if supplier else None]))
            hits.append(TraceabilitySearchHit(
                nodeType=NodeType.RAW_MATERIAL, nodeKey=r.lotNumber,
                title=r.lotNumber, subtitle=sub,
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                href=f"/inspection/{r.lotNumber}",
            ))

    for qrec in db.qualifications.values():
        if q in qrec.qualificationNumber.lower() or q in qrec.batchNumber.lower():
            material = db.materials.get(qrec.materialId)
            sub = " · ".join(filter(None, [material.name if material else None,
                                           qrec.consumptionArea.value if hasattr(qrec.consumptionArea, "value") else str(qrec.consumptionArea)]))
            hits.append(TraceabilitySearchHit(
                nodeType=NodeType.PROCESS_QUALIFICATION, nodeKey=qrec.qualificationNumber,
                title=qrec.qualificationNumber, subtitle=sub,
                status=qrec.status.value if hasattr(qrec.status, "value") else str(qrec.status),
                href=f"/qualification/{qrec.qualificationNumber}",
            ))

    for b in db.metal_batches.values():
        if q in b.metalBatchNumber.lower() or q in b.potline.lower():
            grade = b.productGrade.value if hasattr(b.productGrade, "value") else str(b.productGrade)
            hits.append(TraceabilitySearchHit(
                nodeType=NodeType.METAL_BATCH, nodeKey=b.metalBatchNumber,
                title=b.metalBatchNumber, subtitle=f"{grade} · {b.potline}",
                status=b.status.value if hasattr(b.status, "value") else str(b.status),
                href=f"/metal-quality/{b.metalBatchNumber}",
            ))

    for p in db.product_batches.values():
        if (q in p.productBatchNumber.lower()
                or (p.customer and q in p.customer.lower())
                or q in p.productType.value.lower()):
            hits.append(TraceabilitySearchHit(
                nodeType=NodeType.PRODUCT_BATCH, nodeKey=p.productBatchNumber,
                title=p.productBatchNumber,
                subtitle=p.productType.value + (f" · {p.customer}" if p.customer else ""),
                status=p.status.value if hasattr(p.status, "value") else str(p.status),
                href=f"/product-quality/{p.productBatchNumber}",
            ))

    for c in db.certificates.values():
        if (q in c.certificateNumber.lower()
                or q in c.productBatchNumber.lower()
                or (c.customer and q in c.customer.lower())):
            hits.append(TraceabilitySearchHit(
                nodeType=NodeType.CERTIFICATE, nodeKey=c.certificateNumber,
                title=c.certificateNumber,
                subtitle=f"{c.customer} · {c.productBatchNumber}",
                status=c.status.value if hasattr(c.status, "value") else str(c.status),
                href=f"/traceability?certificate={c.certificateNumber}",
            ))

    # Sample / batch / vehicle level matches against children.
    for s in db.samples.values():
        if q in s.sampleId.lower():
            r = db.receipts.get(s.receiptId)
            if r:
                hits.append(TraceabilitySearchHit(
                    nodeType=NodeType.RAW_MATERIAL, nodeKey=r.lotNumber,
                    title=r.lotNumber, subtitle=f"Sample {s.sampleId}",
                    status=r.status.value if hasattr(r.status, "value") else str(r.status),
                    href=f"/inspection/{r.lotNumber}",
                ))

    # Deduplicate on (nodeType, nodeKey)
    seen = set()
    unique: List[TraceabilitySearchHit] = []
    for h in hits:
        k = (h.nodeType, h.nodeKey)
        if k in seen:
            continue
        seen.add(k)
        unique.append(h)

    return unique[:limit]


# ---------------------------------------------------------------------------
# Dashboard — high-level traceability KPIs for the centre page.
# ---------------------------------------------------------------------------
def dashboard() -> TraceabilityDashboard:
    active_lots = len([r for r in db.receipts.values()
                       if r.status.value not in {"Approved", "Rejected"}])
    in_testing = len([r for r in db.receipts.values()
                      if r.status.value in {"Pending Testing", "Pending Sampling"}])
    in_testing += len([q for q in db.qualifications.values()
                       if (q.status.value if hasattr(q.status, "value") else q.status) in {"Pending Testing", "Pending Sampling"}])
    in_testing += len([b for b in db.metal_batches.values()
                       if (b.status.value if hasattr(b.status, "value") else b.status) in {"Pending Testing", "Pending Sampling"}])
    in_testing += len([p for p in db.product_batches.values()
                       if (p.status.value if hasattr(p.status, "value") else p.status) in {"Pending Testing", "Pending Sampling"}])

    awaiting = len([r for r in db.receipts.values()
                    if r.status.value in {"Pending Review", "On Hold"}])
    awaiting += len([q for q in db.qualifications.values()
                     if (q.status.value if hasattr(q.status, "value") else q.status) in {"Under Review", "On Hold"}])
    awaiting += len([b for b in db.metal_batches.values()
                     if (b.status.value if hasattr(b.status, "value") else b.status) in {"Under Review", "On Hold"}])
    awaiting += len([p for p in db.product_batches.values()
                     if (p.status.value if hasattr(p.status, "value") else p.status) in {"Under Review", "On Hold", "Retest"}])

    released = len([r for r in db.receipts.values() if r.status.value == "Approved"])
    released += len([q for q in db.qualifications.values()
                     if (q.status.value if hasattr(q.status, "value") else q.status) == "Released"])
    released += len([b for b in db.metal_batches.values()
                     if (b.status.value if hasattr(b.status, "value") else b.status) == "Released"])
    released += len([p for p in db.product_batches.values()
                     if (p.status.value if hasattr(p.status, "value") else p.status) == "Approved"])

    certs = len([c for c in db.certificates.values()
                 if (c.status.value if hasattr(c.status, "value") else c.status) == "Issued"])

    total = max(len(db.receipts), 1)
    with_chain = 0
    for r in db.receipts.values():
        chain = build_chain(NodeType.RAW_MATERIAL, r.lotNumber)
        if chain and chain.coverage >= 4:
            with_chain += 1
    coverage_pct = int((with_chain / total) * 100)

    return TraceabilityDashboard(
        activeLots=active_lots,
        inTesting=in_testing,
        awaitingApproval=awaiting,
        released=released,
        certificatesGenerated=certs,
        coveragePct=coverage_pct,
    )
