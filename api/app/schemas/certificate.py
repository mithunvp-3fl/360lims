"""Certificate & Dispatch — Phase 5 entities (enterprise hardening).

A `Certificate` is generated from an approved `ProductBatch`. It encodes the
customer-facing quality summary (Certificate of Analysis), tracks dispatch
state, retains an immutable revision history, and surfaces the approval
chain (Generated / Reviewed / Approved / Released).
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .result import ResultStatus


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class CertificateStatus(str, Enum):
    DRAFT = "Draft"
    ISSUED = "Issued"
    REVISED = "Revised"
    CANCELLED = "Cancelled"


class DispatchStatus(str, Enum):
    PENDING = "Pending"
    READY = "Ready"
    APPROVED = "Approved"
    HELD = "Held"
    REJECTED = "Rejected"
    RELEASED = "Released"
    OVERRIDDEN = "Overridden"


class DispatchDecision(str, Enum):
    APPROVE = "Approve"
    HOLD = "Hold"
    REJECT = "Reject"
    OVERRIDE = "Override"
    RELEASE = "Release"


class MarginStatus(str, Enum):
    SAFE = "Safe"        # ≥ 30% of band away from nearest bound
    TIGHT = "Tight"      # < 30% of band but inside
    BREACH = "Breach"    # outside required min/max
    NA = "N/A"           # cannot compute (no bounds or no actual)


# ---------------------------------------------------------------------------
# Customer specification + margin
# ---------------------------------------------------------------------------
class CustomerSpec(BaseModel):
    parameter: str
    unit: str
    requiredMin: Optional[float] = None
    requiredMax: Optional[float] = None
    requiredTarget: Optional[float] = None
    actualValue: Optional[float] = None
    complianceStatus: ResultStatus = ResultStatus.PASS

    # Phase 5 — margin analysis (Phase 5 enhancement PRD §5)
    # marginValue: signed distance to nearest bound (positive = inside, negative = outside)
    # marginPct:   0-100, percentage of band remaining to the closest bound
    # marginStatus: tone label for the UI badge
    marginValue: Optional[float] = None
    marginPct: Optional[float] = None
    marginStatus: MarginStatus = MarginStatus.NA


class CustomerRequirement(BaseModel):
    parameter: str
    min: Optional[float] = None
    max: Optional[float] = None
    target: Optional[float] = None


# ---------------------------------------------------------------------------
# Certificate entity
# ---------------------------------------------------------------------------
class Certificate(BaseModel):
    id: str
    certificateNumber: str            # COA-2026-001245  (or COA-2026-001245-R1 for revisions)
    productBatchNumber: str
    productBatchId: str
    customer: str
    customerSpecs: List[CustomerSpec] = []
    status: CertificateStatus = CertificateStatus.DRAFT
    dispatchStatus: DispatchStatus = DispatchStatus.PENDING

    # Authoring + issuance
    createdAt: str
    createdBy: str
    issuedAt: Optional[str] = None
    issuedBy: Optional[str] = None

    # Visual artifacts (now real encoders behind these on the server)
    qrCodeValue: str
    barcodeValue: str
    digitalSignaturePlaceholder: str = "—"
    notes: Optional[str] = None

    # Phase 5 enhancement — versioning (D1: copy-on-revise)
    version: int = 1
    parentCertificateNumber: Optional[str] = None
    rootCertificateNumber: Optional[str] = None  # the v1 number; same across the chain
    revisionReason: Optional[str] = None

    # Phase 5 enhancement — approval chain identities (D2: explicit fields)
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None
    dispatchApprovedBy: Optional[str] = None
    dispatchApprovedAt: Optional[str] = None
    releasedBy: Optional[str] = None
    releasedAt: Optional[str] = None


class CertificateCreate(BaseModel):
    productBatchNumber: str
    customer: str
    customerRequirements: Optional[List[CustomerRequirement]] = None
    notes: Optional[str] = None


class CertificateReviseCreate(BaseModel):
    revisionReason: str
    customerRequirements: Optional[List[CustomerRequirement]] = None
    notes: Optional[str] = None


class DispatchDecisionCreate(BaseModel):
    decision: DispatchDecision
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Approval record (Phase 11) — one row per dispatch decision
# ---------------------------------------------------------------------------
class DispatchApprovalRecord(BaseModel):
    id: str
    certificateId: str
    certificateNumber: str
    decision: DispatchDecision
    reason: Optional[str] = None
    decidedBy: str
    decidedByRole: str
    decidedAt: str


# ---------------------------------------------------------------------------
# Quality summary (genealogy chain rollup) + traceability card
# ---------------------------------------------------------------------------
class QualityStepSummary(BaseModel):
    label: str
    nodeKey: Optional[str] = None
    nodeType: Optional[str] = None
    status: Optional[str] = None
    compliance: Optional[int] = None
    href: Optional[str] = None


class QualitySummary(BaseModel):
    certificateNumber: str
    productBatchNumber: str
    metalBatchNumber: Optional[str] = None
    qualificationNumber: Optional[str] = None
    rawMaterialLotNumber: Optional[str] = None
    steps: List[QualityStepSummary] = []


# ---------------------------------------------------------------------------
# Events timeline (Phase 12) — merged view of audit + dispatch + tasks
# ---------------------------------------------------------------------------
class CertificateEvent(BaseModel):
    timestamp: str
    actor: str
    actorRole: Optional[str] = None
    action: str                    # internal verb: create | issue | dispatch-approve | revise | task-complete …
    label: str                     # human label for UI
    severity: str = "info"         # info | success | warning | danger
    notes: Optional[str] = None
    relatedId: Optional[str] = None
    relatedType: Optional[str] = None


# ---------------------------------------------------------------------------
# Public verification payload (Phase 14)
# ---------------------------------------------------------------------------
class VerifyPayload(BaseModel):
    certificateNumber: str
    version: int
    customer: str
    productBatchNumber: str
    metalBatchNumber: Optional[str] = None
    qualificationNumber: Optional[str] = None
    rawMaterialLotNumber: Optional[str] = None
    status: CertificateStatus
    dispatchStatus: DispatchStatus
    issuedAt: Optional[str] = None
    issuedBy: Optional[str] = None
    customerComplianceCount: int
    customerComplianceTotal: int
    releaseConfidence: Optional[int] = None
    certificateHealth: Optional[int] = None
    verifiedAt: str
    authentic: bool = True


__all__ = [
    "CertificateStatus",
    "DispatchStatus",
    "DispatchDecision",
    "MarginStatus",
    "CustomerSpec",
    "CustomerRequirement",
    "Certificate",
    "CertificateCreate",
    "CertificateReviseCreate",
    "DispatchDecisionCreate",
    "DispatchApprovalRecord",
    "QualityStepSummary",
    "QualitySummary",
    "CertificateEvent",
    "VerifyPayload",
]
