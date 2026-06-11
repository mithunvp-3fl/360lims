"""Workflow Task / Approval / Escalation schemas.

The platform Workflow Engine sits on top of the existing stage-based
`workflow_engine`. A stage can fan out into N parallel `Task`s; the stage
advances only when its dependency set resolves. Tasks may be ordinary work
items or `Approval` items (a decision task type with a structured outcome).
"""
from __future__ import annotations
from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel


class TaskState(str, Enum):
    NEW = "New"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    WAITING = "Waiting"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    ESCALATED = "Escalated"


class TaskPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class TaskType(str, Enum):
    SAMPLING = "Sampling"
    TESTING = "Testing"
    RESULT_ENTRY = "Result Entry"
    REVIEW = "Review"
    APPROVAL = "Approval"
    DISPATCH = "Dispatch"
    GENERAL = "General"


class AssignmentType(str, Enum):
    USER = "User"
    ROLE = "Role"
    TEAM = "Team"
    QUEUE = "Queue"


class ApprovalDecision(str, Enum):
    APPROVE = "Approve"
    REJECT = "Reject"
    HOLD = "Hold"
    OVERRIDE = "Override"
    ESCALATE = "Escalate"


class TaskComment(BaseModel):
    id: str
    author: str
    authorRole: Optional[str] = None
    body: str
    createdAt: str


class Task(BaseModel):
    id: str

    # What
    title: str
    description: Optional[str] = None
    taskType: TaskType = TaskType.GENERAL
    moduleKey: str                       # incoming-inspection, metal-quality-control, ...
    stageKey: Optional[str] = None       # workflow_engine stage this task belongs to

    # Who
    assignmentType: AssignmentType = AssignmentType.ROLE
    assignedRole: Optional[str] = None   # RoleKey
    assignedTo: Optional[str] = None     # user display name (Phase 1)
    assignedTeam: Optional[str] = None

    # Where in the business graph (for click-through + filtering)
    entityType: Optional[str] = None     # receipt | qualification | metal-batch | product-batch | certificate
    entityId: Optional[str] = None
    recordKey: Optional[str] = None      # user-facing reference (LOT-2026-0042, MB-2026-000789)

    # State
    state: TaskState = TaskState.NEW
    priority: TaskPriority = TaskPriority.MEDIUM
    blockedBy: List[str] = []            # task ids that must complete first

    # SLA (minutes)
    slaTargetMins: Optional[int] = None
    slaWarningMins: Optional[int] = None
    slaEscalationMins: Optional[int] = None

    # Audit
    createdAt: str
    createdBy: Optional[str] = None
    dueAt: Optional[str] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    completedBy: Optional[str] = None

    # Approval outcome (set when taskType=APPROVAL and decision is recorded)
    decision: Optional[ApprovalDecision] = None
    decisionReason: Optional[str] = None

    # Discussion
    comments: List[TaskComment] = []

    # Computed/decorated by the engine on read (not persisted state)
    nextAction: Optional[str] = None     # PRD §15 — surfaced on TaskCard
    isOverdue: bool = False
    isWarning: bool = False
    href: Optional[str] = None           # frontend deep-link


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    taskType: TaskType = TaskType.GENERAL
    moduleKey: str
    stageKey: Optional[str] = None
    assignmentType: AssignmentType = AssignmentType.ROLE
    assignedRole: Optional[str] = None
    assignedTo: Optional[str] = None
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    recordKey: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    blockedBy: List[str] = []
    slaTargetMins: Optional[int] = None
    slaWarningMins: Optional[int] = None
    slaEscalationMins: Optional[int] = None
    dueAt: Optional[str] = None
    nextAction: Optional[str] = None
    href: Optional[str] = None


class TaskUpdate(BaseModel):
    assignedRole: Optional[str] = None
    assignedTo: Optional[str] = None
    priority: Optional[TaskPriority] = None
    state: Optional[TaskState] = None
    dueAt: Optional[str] = None
    nextAction: Optional[str] = None


class TaskCommentCreate(BaseModel):
    body: str


class ApprovalActionRequest(BaseModel):
    decision: ApprovalDecision
    reason: Optional[str] = None


class WorkSummary(BaseModel):
    """Counts used by the dashboard operational strip and the My Work header."""
    role: Optional[str] = None
    myWork: int
    pendingApprovals: int
    overdue: int
    blocked: int
    upcoming: int
    completedToday: int
    teamWork: int
    escalations: int


__all__ = [
    "TaskState",
    "TaskPriority",
    "TaskType",
    "AssignmentType",
    "ApprovalDecision",
    "TaskComment",
    "Task",
    "TaskCreate",
    "TaskUpdate",
    "TaskCommentCreate",
    "ApprovalActionRequest",
    "WorkSummary",
]
