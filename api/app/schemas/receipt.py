from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from .common import ReceiptStatus, RiskLevel


class Receipt(BaseModel):
    id: str
    lotNumber: str
    supplierId: str
    materialId: str
    quantity: float
    uom: str
    vehicleNumber: str
    poNumber: str
    receiptDate: str
    status: ReceiptStatus
    riskLevel: RiskLevel = RiskLevel.LOW
    assignedTo: Optional[str] = None
    createdAt: str
    createdBy: str
    notes: Optional[str] = None


class ReceiptCreate(BaseModel):
    supplierId: str
    materialId: str
    quantity: float
    uom: str = "MT"
    vehicleNumber: str
    poNumber: str
    receiptDate: Optional[str] = None
    notes: Optional[str] = None


class ReceiptUpdate(BaseModel):
    quantity: Optional[float] = None
    vehicleNumber: Optional[str] = None
    poNumber: Optional[str] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None


__all__ = ["Receipt", "ReceiptCreate", "ReceiptUpdate"]
