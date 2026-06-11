"""Material Lineage framework.

Sits on top of the genealogy framework. Where genealogy answers "what is the
linear 5-step chain?", lineage answers "what flows directly into and out of
this record, and how is each edge labelled?".

The lineage view is derived from two sources:

1. Implicit edges — the `source*Number` pointer fields each module already
   carries (e.g. `metal_batch.sourceQualificationNumber`). These default to
   `RelationshipType.DIRECT`.
2. Explicit edges — rows in `db.lineage_links`. These can override the implicit
   type (e.g. a sample marked `REPRESENTATIVE`) or describe relationships the
   linear chain cannot express (split lots, blended batches, scrap returns).

The framework is purposely tolerant: missing relations produce empty
`parents`/`children` lists, never an error. The shape is stable for future
multi-parent / multi-child traversal — the UI does not need to be reworked
when, for example, a metal batch starts blending two qualifications.
"""
from __future__ import annotations
import uuid
from typing import Dict, List, Optional, Tuple

from app.frameworks import genealogy as gen
from app.schemas.common import now_iso
from app.schemas.genealogy import GenealogyNode, NodeType
from app.schemas.lineage import (
    LineageEdge,
    LineageLink,
    MaterialLineage,
    RelationshipType,
)
from app.store import db


# ---------------------------------------------------------------------------
# Implicit edge resolution — walks the source* pointer fields each module
# already populates. Returns at most one parent per node type.
# ---------------------------------------------------------------------------
def _implicit_parent(node_type: NodeType, node_key: str) -> Optional[Tuple[NodeType, str]]:
    rec = gen._resolve(node_type, node_key)
    if rec is None:
        return None
    if node_type == NodeType.PROCESS_QUALIFICATION:
        src = getattr(rec, "sourceLotNumber", None)
        if src:
            return (NodeType.RAW_MATERIAL, src)
    if node_type == NodeType.METAL_BATCH:
        src = getattr(rec, "sourceQualificationNumber", None)
        if src:
            return (NodeType.PROCESS_QUALIFICATION, src)
    if node_type == NodeType.PRODUCT_BATCH:
        src = getattr(rec, "sourceMetalBatchNumber", None)
        if src:
            return (NodeType.METAL_BATCH, src)
    if node_type == NodeType.CERTIFICATE:
        src = getattr(rec, "productBatchNumber", None)
        if src:
            return (NodeType.PRODUCT_BATCH, src)
    return None


def _implicit_children(node_type: NodeType, node_key: str) -> List[Tuple[NodeType, str]]:
    out: List[Tuple[NodeType, str]] = []
    if node_type == NodeType.RAW_MATERIAL:
        for q in db.qualifications.values():
            if getattr(q, "sourceLotNumber", None) == node_key:
                out.append((NodeType.PROCESS_QUALIFICATION, q.qualificationNumber))
    elif node_type == NodeType.PROCESS_QUALIFICATION:
        for b in db.metal_batches.values():
            if getattr(b, "sourceQualificationNumber", None) == node_key:
                out.append((NodeType.METAL_BATCH, b.metalBatchNumber))
    elif node_type == NodeType.METAL_BATCH:
        for p in db.product_batches.values():
            if getattr(p, "sourceMetalBatchNumber", None) == node_key:
                out.append((NodeType.PRODUCT_BATCH, p.productBatchNumber))
    elif node_type == NodeType.PRODUCT_BATCH:
        for c in db.certificates.values():
            if getattr(c, "productBatchNumber", None) == node_key:
                out.append((NodeType.CERTIFICATE, c.certificateNumber))
    return out


# ---------------------------------------------------------------------------
# Public builders.
# ---------------------------------------------------------------------------
def build_lineage(node_type: NodeType, node_key: str) -> Optional[MaterialLineage]:
    current_node = gen._node_for(node_type, node_key)
    if current_node is None:
        return None

    parents: List[LineageEdge] = []
    children: List[LineageEdge] = []

    # Implicit (source*) edges first — default to DIRECT.
    implicit_parent = _implicit_parent(node_type, node_key)
    if implicit_parent:
        p_node = gen._node_for(*implicit_parent)
        if p_node:
            parents.append(LineageEdge(node=p_node, relationshipType=RelationshipType.DIRECT))

    for c_type, c_key in _implicit_children(node_type, node_key):
        c_node = gen._node_for(c_type, c_key)
        if c_node:
            children.append(LineageEdge(node=c_node, relationshipType=RelationshipType.DIRECT))

    # Explicit lineage_links override / extend the implicit set.
    seen_parents: Dict[Tuple[NodeType, str], int] = {
        (e.node.nodeType, e.node.nodeKey): i for i, e in enumerate(parents)
    }
    seen_children: Dict[Tuple[NodeType, str], int] = {
        (e.node.nodeType, e.node.nodeKey): i for i, e in enumerate(children)
    }

    for link in db.lineage_links.values():
        # link points INTO current → it's a parent edge.
        if link.toNodeType == node_type and link.toNodeKey == node_key:
            p_node = gen._node_for(link.fromNodeType, link.fromNodeKey)
            if p_node is None:
                continue
            edge = LineageEdge(node=p_node, relationshipType=link.relationshipType)
            key = (link.fromNodeType, link.fromNodeKey)
            if key in seen_parents:
                parents[seen_parents[key]] = edge
            else:
                seen_parents[key] = len(parents)
                parents.append(edge)
        # link points OUT of current → it's a child edge.
        elif link.fromNodeType == node_type and link.fromNodeKey == node_key:
            c_node = gen._node_for(link.toNodeType, link.toNodeKey)
            if c_node is None:
                continue
            edge = LineageEdge(node=c_node, relationshipType=link.relationshipType)
            key = (link.toNodeType, link.toNodeKey)
            if key in seen_children:
                children[seen_children[key]] = edge
            else:
                seen_children[key] = len(children)
                children.append(edge)

    return MaterialLineage(current=current_node, parents=parents, children=children)


# ---------------------------------------------------------------------------
# Edge writers — modules call these instead of inserting into the dict directly
# so the relationship type and audit trail are captured consistently.
# ---------------------------------------------------------------------------
def _record(
    from_type: NodeType, from_key: str,
    to_type: NodeType, to_key: str,
    relationship_type: RelationshipType,
    actor: Optional[str] = None,
    notes: Optional[str] = None,
) -> LineageLink:
    link = LineageLink(
        id=str(uuid.uuid4()),
        fromNodeType=from_type,
        fromNodeKey=from_key,
        toNodeType=to_type,
        toNodeKey=to_key,
        relationshipType=relationship_type,
        createdAt=now_iso(),
        createdBy=actor,
        notes=notes,
    )
    db.lineage_links[link.id] = link
    return link


def link_lot_to_qualification(lot_number: str, qualification_number: str,
                              actor: Optional[str] = None) -> LineageLink:
    return _record(NodeType.RAW_MATERIAL, lot_number,
                   NodeType.PROCESS_QUALIFICATION, qualification_number,
                   RelationshipType.DIRECT, actor=actor)


def link_qualification_to_metal_batch(qualification_number: str, metal_batch_number: str,
                                      actor: Optional[str] = None) -> LineageLink:
    return _record(NodeType.PROCESS_QUALIFICATION, qualification_number,
                   NodeType.METAL_BATCH, metal_batch_number,
                   RelationshipType.DIRECT, actor=actor)


def link_metal_batch_to_product_batch(metal_batch_number: str, product_batch_number: str,
                                      actor: Optional[str] = None) -> LineageLink:
    return _record(NodeType.METAL_BATCH, metal_batch_number,
                   NodeType.PRODUCT_BATCH, product_batch_number,
                   RelationshipType.DIRECT, actor=actor)


def link_product_batch_to_certificate(product_batch_number: str, certificate_number: str,
                                      actor: Optional[str] = None) -> LineageLink:
    return _record(NodeType.PRODUCT_BATCH, product_batch_number,
                   NodeType.CERTIFICATE, certificate_number,
                   RelationshipType.DIRECT, actor=actor)


__all__ = [
    "build_lineage",
    "link_lot_to_qualification",
    "link_qualification_to_metal_batch",
    "link_metal_batch_to_product_batch",
    "link_product_batch_to_certificate",
]
