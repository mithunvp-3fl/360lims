"""Process Material Qualification — Phase 2 entities.

Mirrors the shape of the receipt/sample/test/result quartet from Phase 1 but is
keyed by qualification number and consumption area. Kept separate so Phase 1
endpoints stay untouched.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .result import ResultValue, ResultSource, ResultStatus
from .test import TestStatus
from .sample import SampleStatus


class ConsumptionArea(str, Enum):
    CARBON_PLANT = "Carbon Plant"
    POTLINE = "Potline"
    CASTHOUSE = "Casthouse"
    RND = "R&D"


class QualificationStatus(str, Enum):
    PENDING_SAMPLING = "Pending Sampling"
    PENDING_TESTING = "Pending Testing"
    PENDING_REVIEW = "Under Review"
    RELEASED = "Released"
    REJECTED = "Rejected"
    ON_HOLD = "On Hold"
    CANCELLED = "Cancelled"


class QualificationDecision(str, Enum):
    RELEASE = "Release"
    HOLD = "Hold"
    REJECT = "Reject"


# --- Qualification ---
class Qualification(BaseModel):
    id: str
    qualificationNumber: str        # e.g. PMQ-2026-001245
    materialId: str
    batchNumber: str                # e.g. CC-2026-015
    supplierId: Optional[str] = None  # carried forward from Step-1 receipt
    sourceLotNumber: Optional[str] = None  # link back to inspection lot
    consumptionArea: ConsumptionArea
    quantity: float
    uom: str
    status: QualificationStatus = QualificationStatus.PENDING_SAMPLING
    riskLevel: RiskLevel = RiskLevel.LOW
    assignedTo: Optional[str] = None
    requestedAt: str
    requestedBy: str
    notes: Optional[str] = None


class QualificationCreate(BaseModel):
    materialId: str
    batchNumber: str
    consumptionArea: ConsumptionArea
    quantity: float
    uom: str = "MT"
    supplierId: Optional[str] = None
    sourceLotNumber: Optional[str] = None
    notes: Optional[str] = None


class QualificationUpdate(BaseModel):
    batchNumber: Optional[str] = None
    consumptionArea: Optional[ConsumptionArea] = None
    quantity: Optional[float] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None


# --- Sample (qualification-scoped) ---
class QualificationSample(BaseModel):
    id: str
    sampleId: str                   # PMQS-001245
    qualificationId: str
    collectionDate: str
    collectedBy: str
    status: SampleStatus = SampleStatus.COLLECTED
    notes: Optional[str] = None


class QualificationSampleCreate(BaseModel):
    collectedBy: Optional[str] = None
    notes: Optional[str] = None


# --- Test (qualification-scoped) ---
class QualificationTest(BaseModel):
    id: str
    sampleId: str
    code: str                       # SULPHUR, MOISTURE, DENSITY, AIR_PERM, ELEC_RES, etc.
    name: str
    parameters: List[str] = []
    instrumentCode: Optional[str] = None
    status: TestStatus = TestStatus.PENDING
    assignedAt: Optional[str] = None


# --- Result (qualification-scoped, identical shape to Phase 1) ---
class QualificationResult(BaseModel):
    id: str
    testId: str
    sampleId: str
    source: ResultSource
    values: List[ResultValue] = []
    enteredBy: str
    enteredAt: str
    instrumentCode: Optional[str] = None
    reason: Optional[str] = None
    fileName: Optional[str] = None
    overallStatus: ResultStatus = ResultStatus.PASS


# --- Approval (qualification-scoped) ---
class QualificationApproval(BaseModel):
    id: str
    qualificationId: str
    decision: QualificationDecision
    reason: Optional[str] = None
    decidedBy: str
    decidedAt: str


class QualificationApprovalCreate(BaseModel):
    decision: QualificationDecision
    reason: Optional[str] = None


__all__ = [
    "ConsumptionArea",
    "QualificationStatus",
    "QualificationDecision",
    "Qualification",
    "QualificationCreate",
    "QualificationUpdate",
    "QualificationSample",
    "QualificationSampleCreate",
    "QualificationTest",
    "QualificationResult",
    "QualificationApproval",
    "QualificationApprovalCreate",
]
