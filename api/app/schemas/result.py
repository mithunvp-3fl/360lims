from __future__ import annotations
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class ResultSource(str, Enum):
    INSTRUMENT = "Instrument"
    MANUAL = "Manual"
    FILE_UPLOAD = "File Upload"


class ResultStatus(str, Enum):
    PASS = "Pass"
    FAIL = "Fail"
    WARNING = "Warning"
    PENDING = "Pending"


class ResultValue(BaseModel):
    parameter: str
    value: float
    unit: str
    specMin: Optional[float] = None
    specMax: Optional[float] = None
    status: ResultStatus = ResultStatus.PASS


class Result(BaseModel):
    id: str
    testId: str
    sampleId: str
    source: ResultSource
    values: list[ResultValue] = []
    enteredBy: str
    enteredAt: str
    instrumentCode: Optional[str] = None
    reason: Optional[str] = None  # mandatory for manual entry
    fileName: Optional[str] = None
    overallStatus: ResultStatus = ResultStatus.PASS


class ManualResultCreate(BaseModel):
    testId: str
    values: list[ResultValue]
    reason: str  # mandatory


class InstrumentImportRequest(BaseModel):
    testId: str
    instrumentCode: str


class FileUploadRequest(BaseModel):
    testId: str
    fileName: str


__all__ = [
    "ResultSource",
    "ResultStatus",
    "ResultValue",
    "Result",
    "ManualResultCreate",
    "InstrumentImportRequest",
    "FileUploadRequest",
]
