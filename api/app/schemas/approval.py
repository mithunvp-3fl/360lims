from __future__ import annotations
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class ApprovalDecision(str, Enum):
    APPROVED = "Approved"
    HOLD = "Hold"
    REJECTED = "Rejected"


class Approval(BaseModel):
    id: str
    receiptId: str
    decision: ApprovalDecision
    reason: Optional[str] = None
    decidedBy: str
    decidedAt: str


class ApprovalCreate(BaseModel):
    decision: ApprovalDecision
    reason: Optional[str] = None


__all__ = ["ApprovalDecision", "Approval", "ApprovalCreate"]
