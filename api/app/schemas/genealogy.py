"""Quality Genealogy & Traceability — shared schemas.

The genealogy framework treats every traceable thing as a `GenealogyNode` and
every link between two nodes as a `GenealogyLink`. The router returns a
`GenealogyChain` (the linear journey) plus a `JourneyTimeline` (chronological
events). The same schema is used for forward and backward traversal — direction
is encoded on the link, not the node.
"""
from __future__ import annotations
from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel


class NodeType(str, Enum):
    RAW_MATERIAL = "raw-material"               # Step 1 — Incoming Material Inspection (Receipt)
    PROCESS_QUALIFICATION = "process-qualification"  # Step 2 — Process Material Qualification
    METAL_BATCH = "metal-batch"                 # Step 3 — Metal Quality Control
    PRODUCT_BATCH = "product-batch"             # Step 4 — Product Quality Testing
    CERTIFICATE = "certificate"                 # Step 5 — Certificate & Dispatch


class JourneyStepKey(str, Enum):
    STEP_1 = "step-1"
    STEP_2 = "step-2"
    STEP_3 = "step-3"
    STEP_4 = "step-4"
    STEP_5 = "step-5"


class JourneyStepStatus(str, Enum):
    COMPLETE = "Complete"
    IN_PROGRESS = "In Progress"
    PENDING = "Pending"
    BLOCKED = "Blocked"
    SKIPPED = "Skipped"


class GenealogyNode(BaseModel):
    nodeType: NodeType
    nodeKey: str            # canonical reference users type or scan
    entityId: str           # internal id (uuid)
    title: str              # e.g. "LOT-2026-0042"
    subtitle: Optional[str] = None  # e.g. "Aluminum Scrap · ABC Metals"
    status: str             # raw module status string (Approved, Released, …)
    statusTone: str = "neutral"     # success | warning | danger | info | accent | neutral
    timestamp: Optional[str] = None
    href: Optional[str] = None      # frontend path
    badges: List[str] = []          # supplier, grade, quantity etc.


class GenealogyLink(BaseModel):
    fromKey: str
    toKey: str
    relation: str = "produced"      # produced | consumed | certified | released
    direction: str = "forward"


class GenealogyChain(BaseModel):
    """The complete chain a node belongs to, regardless of where the user entered.

    `currentKey` marks the node the request was rooted on so the UI can
    highlight it.
    """
    currentKey: str
    nodes: List[GenealogyNode]
    links: List[GenealogyLink]
    coverage: int                   # number of steps with a node present (0-5)


class JourneyStep(BaseModel):
    key: JourneyStepKey
    order: int
    label: str
    status: JourneyStepStatus
    nodeKey: Optional[str] = None
    nodeType: Optional[NodeType] = None
    timestamp: Optional[str] = None
    href: Optional[str] = None


class JourneyEvent(BaseModel):
    timestamp: str
    actor: str
    actorRole: Optional[str] = None
    action: str
    entityType: str
    entityId: str
    nodeKey: Optional[str] = None
    nodeType: Optional[NodeType] = None
    notes: Optional[str] = None


class JourneyTimeline(BaseModel):
    currentKey: str
    steps: List[JourneyStep]
    events: List[JourneyEvent]


# --- Search ---
class TraceabilitySearchHit(BaseModel):
    nodeType: NodeType
    nodeKey: str
    title: str
    subtitle: Optional[str] = None
    status: str
    href: Optional[str] = None


# --- Dashboard ---
class TraceabilityDashboard(BaseModel):
    activeLots: int
    inTesting: int
    awaitingApproval: int
    released: int
    certificatesGenerated: int
    coveragePct: int                # share of lots that have a complete chain to step-5


__all__ = [
    "NodeType",
    "JourneyStepKey",
    "JourneyStepStatus",
    "GenealogyNode",
    "GenealogyLink",
    "GenealogyChain",
    "JourneyStep",
    "JourneyEvent",
    "JourneyTimeline",
    "TraceabilitySearchHit",
    "TraceabilityDashboard",
]
