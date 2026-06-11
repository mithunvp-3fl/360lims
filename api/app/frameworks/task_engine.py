"""Workflow Task Engine — parallel tasks, dependencies, SLAs, escalations.

Layers on top of the stage-based `workflow_engine`. A stage can fan out into N
parallel `Task`s; the stage advances only when its dependency set resolves
(PRD §10–11). The engine also evaluates SLA tone (on-time / warning / overdue
/ escalated) on every read so the UI never falls out of sync.

This module is intentionally side-effect-light:
- creating a task records audit + emits a notification
- completing a task records audit + emits a notification
- escalation is *evaluated on read*, not by a background thread — Phase 1 has
  no scheduler. The state column flips to ESCALATED when the read path sees
  the SLA was breached.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional, Tuple

from app.frameworks import audit as audit_fw
from app.frameworks import notifications as notif_fw
from app.schemas.common import now_iso
from app.schemas.notification import NotificationSeverity
from app.schemas.task import (
    ApprovalDecision,
    AssignmentType,
    Task,
    TaskComment,
    TaskCreate,
    TaskPriority,
    TaskState,
    TaskType,
    WorkSummary,
)
from app.store import db


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------
def _parse(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts)
    except ValueError:
        return None


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
def create_task(body: TaskCreate, actor: str = "System", actor_role: str = "System") -> Task:
    tid = str(uuid.uuid4())
    created = _utcnow()
    due_at = body.dueAt
    if not due_at and body.slaTargetMins:
        due_at = _iso(created + timedelta(minutes=body.slaTargetMins))

    # If every blocker is already complete at creation time, the task is
    # immediately ready — don't park it in WAITING.
    unresolved_blockers = [b for b in body.blockedBy if not _is_complete(b)]
    if unresolved_blockers:
        initial_state = TaskState.WAITING
    elif body.assignedRole or body.assignedTo:
        initial_state = TaskState.ASSIGNED
    else:
        initial_state = TaskState.NEW

    task = Task(
        id=tid,
        title=body.title,
        description=body.description,
        taskType=body.taskType,
        moduleKey=body.moduleKey,
        stageKey=body.stageKey,
        assignmentType=body.assignmentType,
        assignedRole=body.assignedRole,
        assignedTo=body.assignedTo,
        entityType=body.entityType,
        entityId=body.entityId,
        recordKey=body.recordKey,
        state=initial_state,
        priority=body.priority,
        blockedBy=list(body.blockedBy),
        slaTargetMins=body.slaTargetMins,
        slaWarningMins=body.slaWarningMins,
        slaEscalationMins=body.slaEscalationMins,
        createdAt=_iso(created),
        createdBy=actor,
        dueAt=due_at,
        nextAction=body.nextAction,
        href=body.href,
    )
    db.tasks[tid] = task
    audit_fw.record(actor, actor_role, "create-task", "task", tid, None, task.model_dump())
    if initial_state != TaskState.WAITING:
        notif_fw.emit(
            "Task assigned",
            f"{body.title}" + (f" — {body.recordKey}" if body.recordKey else ""),
            NotificationSeverity.INFO,
            "task", tid,
            meta={"role": body.assignedRole, "priority": body.priority.value},
        )
    return task


def _unblock_dependents(completed_task_id: str) -> None:
    for t in db.tasks.values():
        if completed_task_id in t.blockedBy and t.state == TaskState.WAITING:
            remaining = [b for b in t.blockedBy if not _is_complete(b)]
            if not remaining:
                t.state = TaskState.ASSIGNED if (t.assignedRole or t.assignedTo) else TaskState.NEW
                notif_fw.emit(
                    "Task unblocked",
                    f"{t.title} is ready to start.",
                    NotificationSeverity.INFO,
                    "task", t.id,
                )


def _is_complete(task_id: str) -> bool:
    t = db.tasks.get(task_id)
    return bool(t and t.state == TaskState.COMPLETED)


def start_task(task_id: str, actor: str, actor_role: str = "System") -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t or t.state == TaskState.COMPLETED:
        return t
    if t.state == TaskState.WAITING:
        return t  # cannot start while blocked
    prev = t.model_dump()
    t.state = TaskState.IN_PROGRESS
    t.startedAt = now_iso()
    audit_fw.record(actor, actor_role, "start-task", "task", t.id, prev, t.model_dump())
    return t


def complete_task(task_id: str, actor: str, actor_role: str = "System",
                  note: Optional[str] = None) -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t or t.state == TaskState.COMPLETED:
        return t
    prev = t.model_dump()
    t.state = TaskState.COMPLETED
    t.completedAt = now_iso()
    t.completedBy = actor
    audit_fw.record(actor, actor_role, "complete-task", "task", t.id, prev, t.model_dump(), notes=note)
    notif_fw.emit(
        "Task completed",
        f"{t.title}" + (f" — {t.recordKey}" if t.recordKey else ""),
        NotificationSeverity.SUCCESS,
        "task", t.id,
    )
    _unblock_dependents(t.id)
    return t


def cancel_task(task_id: str, actor: str, actor_role: str = "System",
                reason: Optional[str] = None) -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t or t.state in (TaskState.COMPLETED, TaskState.CANCELLED):
        return t
    prev = t.model_dump()
    t.state = TaskState.CANCELLED
    t.completedAt = now_iso()
    t.completedBy = actor
    audit_fw.record(actor, actor_role, "cancel-task", "task", t.id, prev, t.model_dump(), notes=reason)
    return t


def escalate_task(task_id: str, actor: str, actor_role: str = "System",
                  reason: Optional[str] = None) -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t or t.state in (TaskState.COMPLETED, TaskState.CANCELLED):
        return t
    prev = t.model_dump()
    t.state = TaskState.ESCALATED
    t.priority = TaskPriority.CRITICAL
    audit_fw.record(actor, actor_role, "escalate-task", "task", t.id, prev, t.model_dump(), notes=reason)
    notif_fw.emit(
        "Task escalated",
        f"{t.title}" + (f" — {t.recordKey}" if t.recordKey else "") + (" · " + reason if reason else ""),
        NotificationSeverity.WARNING,
        "task", t.id,
    )
    return t


def add_comment(task_id: str, body: str, actor: str, actor_role: Optional[str] = None) -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t:
        return None
    c = TaskComment(
        id=str(uuid.uuid4()),
        author=actor,
        authorRole=actor_role,
        body=body,
        createdAt=now_iso(),
    )
    t.comments.append(c)
    return t


def decide_approval(task_id: str, decision: ApprovalDecision, reason: Optional[str],
                    actor: str, actor_role: str = "System") -> Optional[Task]:
    t = db.tasks.get(task_id)
    if not t or t.taskType != TaskType.APPROVAL:
        return None
    prev = t.model_dump()
    t.decision = decision
    t.decisionReason = reason
    t.state = TaskState.COMPLETED
    t.completedAt = now_iso()
    t.completedBy = actor
    audit_fw.record(actor, actor_role, f"approval:{decision.value}", "task", t.id, prev, t.model_dump(), notes=reason)
    severity = {
        ApprovalDecision.APPROVE: NotificationSeverity.SUCCESS,
        ApprovalDecision.REJECT: NotificationSeverity.DANGER,
        ApprovalDecision.HOLD: NotificationSeverity.WARNING,
        ApprovalDecision.OVERRIDE: NotificationSeverity.WARNING,
        ApprovalDecision.ESCALATE: NotificationSeverity.WARNING,
    }.get(decision, NotificationSeverity.INFO)
    notif_fw.emit(
        f"{t.title} — {decision.value}",
        (reason or "") + (f" · {t.recordKey}" if t.recordKey else ""),
        severity,
        "task", t.id,
    )
    _unblock_dependents(t.id)
    return t


# ---------------------------------------------------------------------------
# Read-side decoration — SLA tones, escalation flip, sorting
# ---------------------------------------------------------------------------
def _decorate(task: Task) -> Task:
    """Compute isOverdue / isWarning / state-flip on read."""
    if task.state in (TaskState.COMPLETED, TaskState.CANCELLED):
        return task
    created = _parse(task.createdAt)
    if not created:
        return task
    now = _utcnow()
    age_mins = (now - created).total_seconds() / 60.0
    if task.slaEscalationMins and age_mins >= task.slaEscalationMins and task.state != TaskState.ESCALATED:
        task.state = TaskState.ESCALATED
        task.priority = TaskPriority.CRITICAL
        task.isOverdue = True
    elif task.slaTargetMins and age_mins >= task.slaTargetMins:
        task.isOverdue = True
    elif task.slaWarningMins and age_mins >= task.slaWarningMins:
        task.isWarning = True
    return task


_PRIORITY_ORDER = {
    TaskPriority.CRITICAL: 0,
    TaskPriority.HIGH: 1,
    TaskPriority.MEDIUM: 2,
    TaskPriority.LOW: 3,
}


def _sort_key(t: Task) -> Tuple[int, int, str]:
    overdue_flag = 0 if t.isOverdue else 1
    return (overdue_flag, _PRIORITY_ORDER[t.priority], t.createdAt)


def list_tasks(predicate=None) -> List[Task]:
    out: List[Task] = []
    for t in db.tasks.values():
        d = _decorate(t)
        if predicate and not predicate(d):
            continue
        out.append(d)
    out.sort(key=_sort_key)
    return out


# ---------------------------------------------------------------------------
# Work-queue projections — these are the read APIs the UI consumes.
# ---------------------------------------------------------------------------
_OPEN_STATES = {TaskState.NEW, TaskState.ASSIGNED, TaskState.IN_PROGRESS, TaskState.WAITING, TaskState.ESCALATED}


def my_work(role: str) -> List[Task]:
    """Tasks the current user (by role) should act on."""
    return list_tasks(lambda t: t.assignedRole == role and t.state in _OPEN_STATES)


def team_work(role: str) -> List[Task]:
    """All open tasks in the same role bucket (incl. unassigned in role)."""
    return list_tasks(lambda t: t.assignedRole == role and t.state in _OPEN_STATES)


def pending_approvals(role: Optional[str] = None) -> List[Task]:
    def pred(t: Task) -> bool:
        if t.taskType != TaskType.APPROVAL:
            return False
        if t.state not in _OPEN_STATES:
            return False
        if role and t.assignedRole and t.assignedRole != role:
            return False
        return True
    return list_tasks(pred)


def escalations(role: Optional[str] = None) -> List[Task]:
    def pred(t: Task) -> bool:
        if not (t.state == TaskState.ESCALATED or t.isOverdue):
            return False
        if role and t.assignedRole and t.assignedRole != role:
            return False
        return True
    return list_tasks(pred)


def completed(role: Optional[str] = None, limit: int = 100) -> List[Task]:
    def pred(t: Task) -> bool:
        if t.state != TaskState.COMPLETED:
            return False
        if role and t.assignedRole and t.assignedRole != role:
            return False
        return True
    items = list_tasks(pred)
    items.sort(key=lambda t: t.completedAt or "", reverse=True)
    return items[:limit]


def blocked_records(role: Optional[str] = None) -> List[Task]:
    """Tasks waiting on dependencies — surfaces 'what's blocking the line'."""
    def pred(t: Task) -> bool:
        if t.state != TaskState.WAITING:
            return False
        if role and t.assignedRole and t.assignedRole != role:
            return False
        return True
    return list_tasks(pred)


def upcoming(role: Optional[str] = None, limit: int = 25) -> List[Task]:
    """Open tasks with a future due date (or no SLA yet) — 'next on deck'."""
    def pred(t: Task) -> bool:
        if t.state not in _OPEN_STATES:
            return False
        if role and t.assignedRole and t.assignedRole != role:
            return False
        return not t.isOverdue
    items = list_tasks(pred)
    return items[:limit]


def summary(role: Optional[str] = None) -> WorkSummary:
    decorated = [_decorate(t) for t in db.tasks.values()]
    def in_role(t: Task) -> bool:
        return (role is None) or (t.assignedRole == role)
    today = _utcnow().date().isoformat()
    return WorkSummary(
        role=role,
        myWork=sum(1 for t in decorated if in_role(t) and t.state in _OPEN_STATES),
        pendingApprovals=sum(1 for t in decorated if in_role(t) and t.taskType == TaskType.APPROVAL and t.state in _OPEN_STATES),
        overdue=sum(1 for t in decorated if in_role(t) and t.isOverdue and t.state in _OPEN_STATES),
        blocked=sum(1 for t in decorated if in_role(t) and t.state == TaskState.WAITING),
        upcoming=sum(1 for t in decorated if in_role(t) and t.state in _OPEN_STATES and not t.isOverdue),
        completedToday=sum(1 for t in decorated if in_role(t) and t.state == TaskState.COMPLETED and (t.completedAt or "").startswith(today)),
        teamWork=sum(1 for t in decorated if t.assignedRole and (role is None or t.assignedRole == role) and t.state in _OPEN_STATES),
        escalations=sum(1 for t in decorated if in_role(t) and t.state == TaskState.ESCALATED),
    )


__all__ = [
    "create_task",
    "start_task",
    "complete_task",
    "cancel_task",
    "escalate_task",
    "decide_approval",
    "add_comment",
    "my_work",
    "team_work",
    "pending_approvals",
    "escalations",
    "completed",
    "blocked_records",
    "upcoming",
    "summary",
    "list_tasks",
]
