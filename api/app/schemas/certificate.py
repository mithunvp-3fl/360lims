"""Certificate & Dispatch — Phase 5 entities.

A `Certificate` is generated from an approved `ProductBatch`. It encodes the
customer-facing quality summary (Certificate of Analysis), and tracks dispatch
state from PENDING through RELEASED.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .result import ResultStatus


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


class CustomerSpec(BaseModel):
    parameter: str
    unit: str
    requiredMin: Optional[float] = None
    requiredMax: Optional[float] = None
    requiredTarget: Optional[float] = None
    actualValue: Optional[float] = None
    complianceStatus: ResultStatus = ResultStatus.PASS


class CustomerRequirement(BaseModel):
    parameter: str
    min: Optional[float] = None
    max: Optional[float] = None
    target: Optional[float] = None


class Certificate(BaseModel):
    id: str
    certificateNumber: str            # COA-2026-001245
    productBatchNumber: str
    productBatchId: str
    customer: str
    customerSpecs: List[CustomerSpec] = []
    status: CertificateStatus = CertificateStatus.DRAFT
    dispatchStatus: DispatchStatus = DispatchStatus.PENDING
    issuedAt: Optional[str] = None
    issuedBy: Optional[str] = None
    createdAt: str
    createdBy: str
    qrCodeValue: str
    barcodeValue: str
    digitalSignaturePlaceholder: str = "—"
    notes: Optional[str] = None


class CertificateCreate(BaseModel):
    productBatchNumber: str
    customer: str
    customerRequirements: Optional[List[CustomerRequirement]] = None
    notes: Optional[str] = None


class DispatchDecisionCreate(BaseModel):
    decision: DispatchDecision
    reason: Optional[str] = None


# --- Quality Summary (genealogy chain rollup) ---
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


__all__ = [
    "CertificateStatus",
    "DispatchStatus",
    "DispatchDecision",
    "CustomerSpec",
    "CustomerRequirement",
    "Certificate",
    "CertificateCreate",
    "DispatchDecisionCreate",
    "QualityStepSummary",
    "QualitySummary",
]
