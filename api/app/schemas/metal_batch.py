"""Metal Quality Control — Phase 3 entities.

Mirrors the qualification quartet but is keyed by metal batch number, product
grade and potline. Decides whether molten aluminum can be released for casting.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .result import ResultValue, ResultSource, ResultStatus
from .test import TestStatus
from .sample import SampleStatus


class ProductGrade(str, Enum):
    P1020 = "P1020"
    P0610 = "P0610"
    PRIMARY_AL = "Primary Aluminum"


class MetalBatchStatus(str, Enum):
    PENDING_SAMPLING = "Pending Sampling"
    PENDING_TESTING = "Pending Testing"
    PENDING_REVIEW = "Under Review"
    RELEASED = "Released"
    REJECTED = "Rejected"
    ON_HOLD = "On Hold"
    DOWNGRADED = "Downgraded"
    CANCELLED = "Cancelled"


class MetalBatchDecision(str, Enum):
    RELEASE = "Release"
    HOLD = "Hold"
    REJECT = "Reject"
    DOWNGRADE = "Downgrade"


# --- Metal Batch ---
class MetalBatch(BaseModel):
    id: str
    metalBatchNumber: str       # e.g. MB-2026-000789
    productGrade: ProductGrade
    potline: str                # e.g. PL-03
    shift: Optional[str] = None
    productionDate: str
    weight: float               # MT
    uom: str = "MT"
    operator: Optional[str] = None
    status: MetalBatchStatus = MetalBatchStatus.PENDING_SAMPLING
    riskLevel: RiskLevel = RiskLevel.LOW
    assignedTo: Optional[str] = None
    sourceQualificationNumber: Optional[str] = None  # Step 2 → Step 3 genealogy link
    createdAt: str
    createdBy: str
    notes: Optional[str] = None


class MetalBatchCreate(BaseModel):
    productGrade: ProductGrade
    potline: str
    weight: float
    shift: Optional[str] = None
    operator: Optional[str] = None
    productionDate: Optional[str] = None
    sourceQualificationNumber: Optional[str] = None
    notes: Optional[str] = None


class MetalBatchUpdate(BaseModel):
    productGrade: Optional[ProductGrade] = None
    potline: Optional[str] = None
    weight: Optional[float] = None
    shift: Optional[str] = None
    operator: Optional[str] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None


# --- Sample (metal-batch-scoped) ---
class MetalSample(BaseModel):
    id: str
    sampleId: str                  # MQS-001245-A
    metalBatchId: str
    collectionDate: str
    collectedBy: str
    status: SampleStatus = SampleStatus.COLLECTED
    notes: Optional[str] = None


class MetalSampleCreate(BaseModel):
    collectedBy: Optional[str] = None
    notes: Optional[str] = None


# --- Test (metal-batch-scoped) ---
class MetalTest(BaseModel):
    id: str
    sampleId: str
    code: str                      # OES, OXYGEN
    name: str
    parameters: List[str] = []
    instrumentCode: Optional[str] = None
    status: TestStatus = TestStatus.PENDING
    assignedAt: Optional[str] = None


# --- Result (metal-batch-scoped) ---
class MetalResult(BaseModel):
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


# --- Approval (metal-batch-scoped) ---
class MetalApproval(BaseModel):
    id: str
    metalBatchId: str
    decision: MetalBatchDecision
    reason: Optional[str] = None
    targetGrade: Optional[ProductGrade] = None   # used for Downgrade decisions
    decidedBy: str
    decidedAt: str


class MetalApprovalCreate(BaseModel):
    decision: MetalBatchDecision
    reason: Optional[str] = None
    targetGrade: Optional[ProductGrade] = None


# --- Chemistry Correction Advisor ---
class ChemistryCorrection(BaseModel):
    parameter: str
    currentValue: float
    targetValue: float
    delta: float
    additionMaterial: str
    additionKg: float
    expectedAfter: float
    rationale: str
    unit: str = "%"


__all__ = [
    "ProductGrade",
    "MetalBatchStatus",
    "MetalBatchDecision",
    "MetalBatch",
    "MetalBatchCreate",
    "MetalBatchUpdate",
    "MetalSample",
    "MetalSampleCreate",
    "MetalTest",
    "MetalResult",
    "MetalApproval",
    "MetalApprovalCreate",
    "ChemistryCorrection",
]
