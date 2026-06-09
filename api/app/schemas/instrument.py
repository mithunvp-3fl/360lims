from __future__ import annotations
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class InstrumentStatus(str, Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    DEGRADED = "Degraded"
    MAINTENANCE = "Maintenance"


class InstrumentType(str, Enum):
    XRF = "XRF"
    OES = "OES"
    CS = "Carbon-Sulphur"
    MOISTURE = "Moisture"
    OTHER = "Other"


class Instrument(BaseModel):
    id: str
    code: str
    name: str
    type: InstrumentType
    vendor: str
    model: str
    serialNumber: str
    status: InstrumentStatus = InstrumentStatus.ONLINE
    location: Optional[str] = None
    lastImportAt: Optional[str] = None
    lastHeartbeatAt: Optional[str] = None
    importsThisWeek: int = 0
    supportedParameters: list[str] = []


__all__ = ["Instrument", "InstrumentStatus", "InstrumentType"]
