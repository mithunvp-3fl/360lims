"""My Workspace API — role-based work queues, approvals, escalations.

This is the surface the PRD §13 "New Menu" pages consume. The same task engine
backs the Phase 9 operational dashboard strip via `/work/summary`.
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.frameworks import task_engine
from app.schemas.task import (
    ApprovalActionRequest,
    Task,
    TaskCommentCreate,
    TaskCreate,
    TaskUpdate,
    WorkSummary,
)


router = APIRouter()


# ---------------------------------------------------------------------------
# Queue projections
# ---------------------------------------------------------------------------
@router.get("/work/summary", response_model=WorkSummary)
def get_summary(role: Optional[str] = Query(None)) -> WorkSummary:
    return task_engine.summary(role)


@router.get("/work/my", response_model=List[Task])
def get_my_work(role: str = Query(...)) -> List[Task]:
    return task_engine.my_work(role)


@router.get("/work/team", response_model=List[Task])
def get_team_work(role: str = Query(...)) -> List[Task]:
    return task_engine.team_work(role)


@router.get("/work/approvals", response_model=List[Task])
def get_pending_approvals(role: Optional[str] = Query(None)) -> List[Task]:
    return task_engine.pending_approvals(role)


@router.get("/work/escalations", response_model=List[Task])
def get_escalations(role: Optional[str] = Query(None)) -> List[Task]:
    return task_engine.escalations(role)


@router.get("/work/completed", response_model=List[Task])
def get_completed(role: Optional[str] = Query(None), limit: int = 100) -> List[Task]:
    return task_engine.completed(role, limit=limit)


@router.get("/work/blocked", response_model=List[Task])
def get_blocked(role: Optional[str] = Query(None)) -> List[Task]:
    return task_engine.blocked_records(role)


@router.get("/work/upcoming", response_model=List[Task])
def get_upcoming(role: Optional[str] = Query(None), limit: int = 25) -> List[Task]:
    return task_engine.upcoming(role, limit=limit)


# ---------------------------------------------------------------------------
# Task list filtered by business entity — reusable across modules.
# Used by the Related Tasks panel on every workbench.
# ---------------------------------------------------------------------------
@router.get("/work/tasks", response_model=List[Task])
def list_tasks_for_entity(
    entityType: Optional[str] = Query(None),
    entityId: Optional[str] = Query(None),
    recordKey: Optional[str] = Query(None),
    moduleKey: Optional[str] = Query(None),
) -> List[Task]:
    def pred(t):
        if entityType and t.entityType != entityType:
            return False
        if entityId and t.entityId != entityId:
            return False
        if recordKey and t.recordKey != recordKey:
            return False
        if moduleKey and t.moduleKey != moduleKey:
            return False
        return True
    return task_engine.list_tasks(pred)


# ---------------------------------------------------------------------------
# Single-task verbs
# ---------------------------------------------------------------------------
@router.post("/work/tasks", response_model=Task, status_code=201)
def create_task(body: TaskCreate) -> Task:
    return task_engine.create_task(body, actor="Current User")


@router.get("/work/tasks/{task_id}", response_model=Task)
def get_task(task_id: str) -> Task:
    items = task_engine.list_tasks(lambda t: t.id == task_id)
    if not items:
        raise HTTPException(404, "Task not found")
    return items[0]


@router.patch("/work/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, body: TaskUpdate) -> Task:
    from app.store import db
    t = db.tasks.get(task_id)
    if not t:
        raise HTTPException(404, "Task not found")
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(t, k, v)
    return t


@router.post("/work/tasks/{task_id}/start", response_model=Task)
def start_task(task_id: str) -> Task:
    t = task_engine.start_task(task_id, actor="Current User")
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/work/tasks/{task_id}/complete", response_model=Task)
def complete_task(task_id: str) -> Task:
    t = task_engine.complete_task(task_id, actor="Current User")
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/work/tasks/{task_id}/cancel", response_model=Task)
def cancel_task(task_id: str) -> Task:
    t = task_engine.cancel_task(task_id, actor="Current User")
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/work/tasks/{task_id}/escalate", response_model=Task)
def escalate_task(task_id: str, reason: Optional[str] = None) -> Task:
    t = task_engine.escalate_task(task_id, actor="Current User", reason=reason)
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/work/tasks/{task_id}/decide", response_model=Task)
def decide_approval(task_id: str, body: ApprovalActionRequest) -> Task:
    t = task_engine.decide_approval(task_id, body.decision, body.reason, actor="Current User")
    if not t:
        raise HTTPException(404, "Approval task not found")
    return t


@router.post("/work/tasks/{task_id}/comments", response_model=Task)
def comment_task(task_id: str, body: TaskCommentCreate) -> Task:
    t = task_engine.add_comment(task_id, body.body, actor="Current User")
    if not t:
        raise HTTPException(404, "Task not found")
    return t
