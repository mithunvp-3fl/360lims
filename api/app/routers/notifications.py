from __future__ import annotations
from fastapi import APIRouter

from app.schemas.notification import Notification
from app.frameworks import notifications as notif


router = APIRouter()


@router.get("/notifications", response_model=list[Notification])
def list_notifications(unread_only: bool = False, limit: int = 50) -> list[Notification]:
    return notif.list_all(unread_only=unread_only, limit=limit)


@router.post("/notifications/{notification_id}/read", response_model=Notification | None)
def mark_read(notification_id: str):
    return notif.mark_read(notification_id)


@router.post("/notifications/read-all")
def read_all() -> dict:
    count = notif.mark_all_read()
    return {"updated": count}
