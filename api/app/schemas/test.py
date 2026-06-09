from __future__ import annotations
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class TestStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    FAILED = "Failed"


class Test(BaseModel):
    id: str
    sampleId: str
    code: str  # XRF, OES, CS, MOISTURE
    name: str
    parameters: list[str] = []  # ["Al", "Si", "Fe"] etc
    instrumentCode: Optional[str] = None
    status: TestStatus = TestStatus.PENDING
    assignedAt: Optional[str] = None


class TestCreate(BaseModel):
    sampleId: str
    code: str
    name: str
    parameters: list[str] = []
    instrumentCode: Optional[str] = None


__all__ = ["Test", "TestCreate", "TestStatus"]
