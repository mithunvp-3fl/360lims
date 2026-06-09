from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class ReceiptStatus(str, Enum):
    PENDING_SAMPLING = "Pending Sampling"
    PENDING_TESTING = "Pending Testing"
    PENDING_REVIEW = "Pending Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    ON_HOLD = "On Hold"


class Actor(BaseModel):
    name: str
    role: str


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


__all__ = ["RiskLevel", "ReceiptStatus", "Actor", "now_iso"]
