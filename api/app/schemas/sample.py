from __future__ import annotations
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class SampleStatus(str, Enum):
    COLLECTED = "Collected"
    RECOLLECTED = "Recollected"
    DISCARDED = "Discarded"


class Sample(BaseModel):
    id: str
    sampleId: str
    receiptId: str
    collectionDate: str
    collectedBy: str
    status: SampleStatus = SampleStatus.COLLECTED
    notes: Optional[str] = None


class SampleCreate(BaseModel):
    receiptId: str
    collectedBy: Optional[str] = None
    notes: Optional[str] = None


__all__ = ["Sample", "SampleCreate", "SampleStatus"]
