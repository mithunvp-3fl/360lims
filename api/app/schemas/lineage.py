"""Material Lineage schemas.

Lineage is the typed-relationship view over genealogy. Where `GenealogyChain`
walks the linear 5-step journey, `MaterialLineage` answers a different question:
"for this record, what are its direct parents, what is it, and what does it
produce?" — with each edge labelled by relationship type so downstream modules
(scrap blending, split lots, by-products) can render themselves correctly.

The Phase 1 surface returns one level up and one level down. The schema is
already shaped for future multi-parent / multi-child traversal so the UI does
not need a second pass.
"""
from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

from .genealogy import GenealogyNode, NodeType


class RelationshipType(str, Enum):
    DIRECT = "Direct"                  # 1:1 lineage (default for the linear chain)
    REPRESENTATIVE = "Representative"  # sample-of, witness-batch, retain
    DERIVED = "Derived"                # produced from but transformed
    CONSUMED_BY = "Consumed By"        # this record was an input to the related one
    PRODUCED_BY = "Produced By"        # the related record is an output of this one


class LineageLink(BaseModel):
    id: str
    fromNodeType: NodeType
    fromNodeKey: str
    toNodeType: NodeType
    toNodeKey: str
    relationshipType: RelationshipType = RelationshipType.DIRECT
    createdAt: str
    createdBy: Optional[str] = None
    notes: Optional[str] = None


class LineageEdge(BaseModel):
    """A neighbour node + the relationship that connects it to `current`."""
    node: GenealogyNode
    relationshipType: RelationshipType


class MaterialLineage(BaseModel):
    current: GenealogyNode
    parents: List[LineageEdge]
    children: List[LineageEdge]


__all__ = [
    "RelationshipType",
    "LineageLink",
    "LineageEdge",
    "MaterialLineage",
]
