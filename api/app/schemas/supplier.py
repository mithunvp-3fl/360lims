from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from .common import RiskLevel


class Supplier(BaseModel):
    id: str
    code: str
    name: str
    healthScore: int = Field(ge=0, le=100)
    riskLevel: RiskLevel
    acceptedDeliveries: int = 0
    rejectedDeliveries: int = 0
    onHoldDeliveries: int = 0
    lastDeliveryDate: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None


class SupplierCreate(BaseModel):
    code: str
    name: str
    location: Optional[str] = None
    category: Optional[str] = None


__all__ = ["Supplier", "SupplierCreate"]
