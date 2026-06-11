"""Traceability Center V2 schemas.

These DTOs back the tabbed Traceability Center page: chain-wide quality events,
unified approval history with rationale, impact analysis, scorecard, summary,
risk panel, related records.

The aggregators that fill these schemas live in
``app/frameworks/traceability_center.py``.
"""
from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

from .genealogy import GenealogyNode, NodeType


# ---------------------------------------------------------------------------
# Quality Events (Phase 5)
# ---------------------------------------------------------------------------
class QualityEventCategory(str, Enum):
    SAMPLING = "Sampling"
    TESTING = "Testing"
    IMPORT = "Import"
    APPROVAL = "Approval"
    RELEASE = "Release"
    CERTIFICATE = "Certificate"
    DISPATCH = "Dispatch"
    OTHER = "Other"


class QualityEventSeverity(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    DANGER = "danger"


class QualityEvent(BaseModel):
    timestamp: str
    category: QualityEventCategory
    severity: QualityEventSeverity = QualityEventSeverity.INFO
    title: str
    actor: str
    actorRole: Optional[str] = None
    nodeType: NodeType
    nodeKey: str
    entityType: str
    entityId: str
    notes: Optional[str] = None


class QualityEventsResponse(BaseModel):
    currentKey: str
    events: List[QualityEvent]


# ---------------------------------------------------------------------------
# Approvals (Phase 6 + Phase 8 rationale)
# ---------------------------------------------------------------------------
class ApprovalRationale(BaseModel):
    """Reusable approval-decision record. One entry per recorded approval
    across the chain. Phase 8 component renders this directly."""
    nodeType: NodeType
    nodeKey: str
    entityType: str
    entityId: str
    decision: str                      # raw verb: Approved, Released, Hold, ...
    decisionTone: str = "info"        # success | warning | danger | info
    approver: str
    approverRole: Optional[str] = None
    decidedAt: str
    reason: Optional[str] = None
    supportingEvidence: List[str] = []
    href: Optional[str] = None


class ApprovalsResponse(BaseModel):
    currentKey: str
    items: List[ApprovalRationale]


# ---------------------------------------------------------------------------
# Quality Summary (Phase 7)
# ---------------------------------------------------------------------------
class ChainQualitySummary(BaseModel):
    """Always-visible status snapshot — sidebar of the Traceability Center."""
    currentKey: str
    overallStatus: str                # Released, In Progress, On Hold, Rejected, ...
    overallStatusTone: str = "info"
    riskLevel: str = "Low"            # Low | Medium | High
    pendingTasks: int = 0
    pendingApprovals: int = 0
    overdueItems: int = 0
    openDeviations: int = 0
    chainCoverage: int = 0            # number of populated steps (0-5)
    lastEventAt: Optional[str] = None
    notes: List[str] = []


# ---------------------------------------------------------------------------
# Quality Scorecard (Phase 9)
# ---------------------------------------------------------------------------
class ScorecardMetric(BaseModel):
    label: str
    score: int                        # 0-100
    tone: str = "info"                # success | warning | danger | info
    detail: Optional[str] = None


class QualityScorecard(BaseModel):
    currentKey: str
    compliance: ScorecardMetric
    traceabilityCoverage: ScorecardMetric
    approvalCoverage: ScorecardMetric
    auditCompleteness: ScorecardMetric
    taskCompletion: ScorecardMetric
    overall: int                      # composite 0-100


# ---------------------------------------------------------------------------
# Impact Analysis (Phase 12)
# ---------------------------------------------------------------------------
class ImpactItem(BaseModel):
    nodeType: NodeType
    nodeKey: str
    title: str
    subtitle: Optional[str] = None
    status: str
    statusTone: str = "neutral"
    href: Optional[str] = None
    relationship: str = "Downstream"  # Downstream | Customer | Certificate | Batch
    distance: int = 1                 # hops from current record


class ImpactAnalysis(BaseModel):
    currentKey: str
    triggerStatus: str                # the trigger record's status
    affected: List[ImpactItem]
    affectedCustomers: List[str] = []
    affectedCertificates: List[str] = []
    summary: str = ""


# ---------------------------------------------------------------------------
# Risk Panel (Phase 13)
# ---------------------------------------------------------------------------
class RiskFinding(BaseModel):
    label: str
    count: int = 0
    severity: str = "info"            # info | warning | danger
    detail: Optional[str] = None
    items: List[str] = []             # human-readable references


class ChainRiskPanel(BaseModel):
    currentKey: str
    riskLevel: str = "Low"
    findings: List[RiskFinding]


# ---------------------------------------------------------------------------
# Related Records (Phase 11)
# ---------------------------------------------------------------------------
class RelatedRecord(BaseModel):
    nodeType: NodeType
    nodeKey: str
    title: str
    subtitle: Optional[str] = None
    status: str
    statusTone: str = "neutral"
    href: Optional[str] = None
    relation: str = "Sibling"         # Parent | Sibling | Child | Peer


class RelatedRecords(BaseModel):
    currentKey: str
    parents: List[RelatedRecord]
    siblings: List[RelatedRecord]
    children: List[RelatedRecord]


__all__ = [
    "QualityEventCategory",
    "QualityEventSeverity",
    "QualityEvent",
    "QualityEventsResponse",
    "ApprovalRationale",
    "ApprovalsResponse",
    "ChainQualitySummary",
    "ScorecardMetric",
    "QualityScorecard",
    "ImpactItem",
    "ImpactAnalysis",
    "RiskFinding",
    "ChainRiskPanel",
    "RelatedRecord",
    "RelatedRecords",
]
