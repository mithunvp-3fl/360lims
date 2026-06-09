"""Audit Trail Framework — every mutation funnels through `record()`."""
from __future__ import annotations
import uuid
from typing import Any, Optional, List

from app.schemas.audit import AuditLog
from app.schemas.common import now_iso


_LOG: List[AuditLog] = []


def record(
    actor: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    previous_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    notes: Optional[str] = None,
) -> AuditLog:
    log = AuditLog(
        id=str(uuid.uuid4()),
        actor=actor,
        actorRole=actor_role,
        action=action,
        entityType=entity_type,
        entityId=entity_id,
        previousValue=previous_value,
        newValue=new_value,
        timestamp=now_iso(),
        notes=notes,
    )
    _LOG.append(log)
    return log


def list_for(entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 200) -> List[AuditLog]:
    items = _LOG
    if entity_type:
        items = [a for a in items if a.entityType == entity_type]
    if entity_id:
        items = [a for a in items if a.entityId == entity_id]
    return list(reversed(items))[:limit]


def all_logs(limit: int = 500) -> List[AuditLog]:
    return list(reversed(_LOG))[:limit]
