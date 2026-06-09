from __future__ import annotations
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel


class StageStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    SKIPPED = "Skipped"


class WorkflowStage(BaseModel):
    key: str
    label: str
    order: int
    status: StageStatus = StageStatus.PENDING
    completedAt: Optional[str] = None
    completedBy: Optional[str] = None


class Workflow(BaseModel):
    id: str
    moduleKey: str
    entityType: str
    entityId: str
    stages: List[WorkflowStage]


__all__ = ["StageStatus", "WorkflowStage", "Workflow"]
