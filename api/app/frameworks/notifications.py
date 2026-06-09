"""Notification Framework — every successful mutation emits a structured event.

The frontend polls `/notifications` and surfaces toast + bell-center entries.
"""
from __future__ import annotations
import uuid
from typing import Any, List, Optional

from app.schemas.notification import Notification, NotificationSeverity
from app.schemas.common import now_iso


_INBOX: List[Notification] = []


def emit(
    title: str,
    message: str,
    severity: NotificationSeverity = NotificationSeverity.INFO,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> Notification:
    n = Notification(
        id=str(uuid.uuid4()),
        title=title,
        message=message,
        severity=severity,
        entityType=entity_type,
        entityId=entity_id,
        createdAt=now_iso(),
        read=False,
        meta=meta,
    )
    _INBOX.append(n)
    return n


def list_all(unread_only: bool = False, limit: int = 50) -> List[Notification]:
    items = list(reversed(_INBOX))
    if unread_only:
        items = [n for n in items if not n.read]
    return items[:limit]


def mark_read(notification_id: str) -> Optional[Notification]:
    for n in _INBOX:
        if n.id == notification_id:
            n.read = True
            return n
    return None


def mark_all_read() -> int:
    count = 0
    for n in _INBOX:
        if not n.read:
            n.read = True
            count += 1
    return count
