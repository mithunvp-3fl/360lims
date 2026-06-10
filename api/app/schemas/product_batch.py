"""Product Quality Testing — Phase 4 entities.

Decides whether a finished product (Ingot, Billet) can be approved for
certificate generation. Keyed by product batch number, product type and
linked upstream to a metal batch.
"""
from __future__ import annotations
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

from .common import RiskLevel
from .result import ResultValue, ResultSource, ResultStatus
from .test import TestStatus
from .sample import SampleStatus


class ProductType(str, Enum):
    PRIMARY_ALUMINUM_INGOT = "Primary Aluminum Ingot"
    PRIMARY_ALUMINUM_BILLET = "Primary Aluminum Billet"


class ProductBatchStatus(str, Enum):
    PENDING_SAMPLING = "Pending Sampling"
    PENDING_TESTING = "Pending Testing"
    PENDING_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    ON_HOLD = "On Hold"
    RETEST = "Retest"
    CANCELLED = "Cancelled"


class ProductDecision(str, Enum):
    APPROVE = "Approve"
    HOLD = "Hold"
    REJECT = "Reject"
    RETEST = "Retest"


# --- Product Batch ---
class ProductBatch(BaseModel):
    id: str
    productBatchNumber: str        # PB-2026-000210
    productType: ProductType
    weight: float                  # MT
    uom: str = "MT"
    sourceMetalBatchNumber: Optional[str] = None
    customer: Optional[str] = None
    status: ProductBatchStatus = ProductBatchStatus.PENDING_SAMPLING
    riskLevel: RiskLevel = RiskLevel.LOW
    operator: Optional[str] = None
    productionDate: str
    assignedTo: Optional[str] = None
    createdAt: str
    createdBy: str
    notes: Optional[str] = None


class ProductBatchCreate(BaseModel):
    productType: ProductType
    weight: float
    sourceMetalBatchNumber: Optional[str] = None
    customer: Optional[str] = None
    operator: Optional[str] = None
    productionDate: Optional[str] = None
    notes: Optional[str] = None


class ProductBatchUpdate(BaseModel):
    productType: Optional[ProductType] = None
    weight: Optional[float] = None
    customer: Optional[str] = None
    operator: Optional[str] = None
    assignedTo: Optional[str] = None
    notes: Optional[str] = None


# --- Sample ---
class ProductSample(BaseModel):
    id: str
    sampleId: str                  # PQS-000210-A
    productBatchId: str
    collectionDate: str
    collectedBy: str
    status: SampleStatus = SampleStatus.COLLECTED
    notes: Optional[str] = None


class ProductSampleCreate(BaseModel):
    collectedBy: Optional[str] = None
    notes: Optional[str] = None


# --- Test ---
class ProductTest(BaseModel):
    id: str
    sampleId: str
    code: str                      # UTS, HARDNESS, CONDUCTIVITY, etc.
    name: str
    parameters: List[str] = []
    instrumentCode: Optional[str] = None
    status: TestStatus = TestStatus.PENDING
    assignedAt: Optional[str] = None


# --- Result ---
class ProductResult(BaseModel):
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


# --- Approval ---
class ProductApproval(BaseModel):
    id: str
    productBatchId: str
    decision: ProductDecision
    reason: Optional[str] = None
    decidedBy: str
    decidedAt: str


class ProductApprovalCreate(BaseModel):
    decision: ProductDecision
    reason: Optional[str] = None


__all__ = [
    "ProductType",
    "ProductBatchStatus",
    "ProductDecision",
    "ProductBatch",
    "ProductBatchCreate",
    "ProductBatchUpdate",
    "ProductSample",
    "ProductSampleCreate",
    "ProductTest",
    "ProductResult",
    "ProductApproval",
    "ProductApprovalCreate",
]
