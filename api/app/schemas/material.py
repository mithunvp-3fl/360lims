from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel


class Specification(BaseModel):
    parameter: str
    unit: str
    minValue: Optional[float] = None
    maxValue: Optional[float] = None
    targetValue: Optional[float] = None


class Material(BaseModel):
    id: str
    code: str
    name: str
    category: str
    uom: str  # MT, KG, L, etc
    specifications: List[Specification] = []
    requiredTests: List[str] = []  # test codes


class MaterialCreate(BaseModel):
    code: str
    name: str
    category: str
    uom: str
    specifications: List[Specification] = []
    requiredTests: List[str] = []


__all__ = ["Specification", "Material", "MaterialCreate"]
