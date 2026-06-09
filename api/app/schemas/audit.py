from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel


class AuditLog(BaseModel):
    id: str
    actor: str
    actorRole: str
    action: str
    entityType: str
    entityId: str
    previousValue: Optional[Any] = None
    newValue: Optional[Any] = None
    timestamp: str
    notes: Optional[str] = None


__all__ = ["AuditLog"]
