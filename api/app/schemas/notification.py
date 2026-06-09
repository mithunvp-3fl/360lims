from __future__ import annotations
from typing import Any, Optional
from enum import Enum
from pydantic import BaseModel


class NotificationSeverity(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    DANGER = "danger"


class Notification(BaseModel):
    id: str
    title: str
    message: str
    severity: NotificationSeverity
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    createdAt: str
    read: bool = False
    meta: Optional[dict[str, Any]] = None  # source-specific context surfaced in detail drawer


__all__ = ["Notification", "NotificationSeverity"]
