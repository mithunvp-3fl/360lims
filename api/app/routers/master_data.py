from __future__ import annotations
import uuid
from fastapi import APIRouter, HTTPException

from app.schemas.supplier import Supplier, SupplierCreate
from app.schemas.material import Material, MaterialCreate
from app.schemas.instrument import Instrument
from app.schemas.common import RiskLevel
from app.store import db
from app.frameworks import audit, notifications as notif
from app.schemas.notification import NotificationSeverity


router = APIRouter()


# --- Suppliers ---
@router.get("/suppliers", response_model=list[Supplier])
def list_suppliers() -> list[Supplier]:
    return list(db.suppliers.values())


@router.post("/suppliers", response_model=Supplier, status_code=201)
def create_supplier(body: SupplierCreate) -> Supplier:
    sid = str(uuid.uuid4())
    s = Supplier(
        id=sid, code=body.code, name=body.name,
        healthScore=80, riskLevel=RiskLevel.LOW,
        location=body.location, category=body.category,
    )
    db.suppliers[sid] = s
    audit.record("Current User", "Stores Executive", "create", "supplier", sid, None, s.model_dump())
    notif.emit("Supplier Created", f"{s.name} added to master data.", NotificationSeverity.SUCCESS, "supplier", sid)
    return s


# --- Materials ---
@router.get("/materials", response_model=list[Material])
def list_materials() -> list[Material]:
    return list(db.materials.values())


@router.post("/materials", response_model=Material, status_code=201)
def create_material(body: MaterialCreate) -> Material:
    mid = str(uuid.uuid4())
    m = Material(id=mid, **body.model_dump())
    db.materials[mid] = m
    audit.record("Current User", "QA Manager", "create", "material", mid, None, m.model_dump())
    notif.emit("Material Created", f"{m.name} added to master data.", NotificationSeverity.SUCCESS, "material", mid)
    return m


# --- Instruments ---
@router.get("/instruments", response_model=list[Instrument])
def list_instruments() -> list[Instrument]:
    return list(db.instruments.values())


@router.get("/instruments/{instrument_id}", response_model=Instrument)
def get_instrument(instrument_id: str) -> Instrument:
    inst = db.instruments.get(instrument_id)
    if not inst:
        raise HTTPException(404, "Instrument not found")
    return inst
