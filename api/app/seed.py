"""Seed demo data so the app boots into a meaningful state.

Hero scenario: LOT-2026-0042, Aluminum Scrap from ABC Metals, ready for review.
Plus a handful of other lots at various stages.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import List

from app.schemas.common import RiskLevel, ReceiptStatus, now_iso
from app.schemas.supplier import Supplier
from app.schemas.material import Material, Specification
from app.schemas.receipt import Receipt
from app.schemas.sample import Sample, SampleStatus
from app.schemas.test import Test, TestStatus
from app.schemas.result import Result, ResultSource, ResultStatus, ResultValue
from app.schemas.instrument import Instrument, InstrumentStatus, InstrumentType
from app.frameworks import workflow_engine
from app.store import db


def _id() -> str:
    return str(uuid.uuid4())


def _iso(days_ago: int = 0, hours_ago: int = 0) -> str:
    return (datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)).isoformat() + "Z"


def seed() -> None:
    if db.suppliers:
        return  # already seeded

    # --- Suppliers ---
    suppliers = [
        Supplier(id=_id(), code="SUP-ABC", name="ABC Metals", healthScore=87,
                 riskLevel=RiskLevel.LOW, acceptedDeliveries=142, rejectedDeliveries=3,
                 onHoldDeliveries=8, lastDeliveryDate=_iso(2), location="Bhiwadi, IN",
                 category="Aluminum"),
        Supplier(id=_id(), code="SUP-PSR", name="Premium Scrap Resources", healthScore=74,
                 riskLevel=RiskLevel.MEDIUM, acceptedDeliveries=89, rejectedDeliveries=11,
                 onHoldDeliveries=14, lastDeliveryDate=_iso(5), location="Jamshedpur, IN",
                 category="Mixed scrap"),
        Supplier(id=_id(), code="SUP-GAT", name="Global Alloy Traders", healthScore=92,
                 riskLevel=RiskLevel.LOW, acceptedDeliveries=210, rejectedDeliveries=2,
                 onHoldDeliveries=4, lastDeliveryDate=_iso(1), location="Singapore",
                 category="Primary metals"),
        Supplier(id=_id(), code="SUP-NSI", name="Northern Smelters Inc.", healthScore=63,
                 riskLevel=RiskLevel.HIGH, acceptedDeliveries=47, rejectedDeliveries=16,
                 onHoldDeliveries=12, lastDeliveryDate=_iso(9), location="Raipur, IN",
                 category="Aluminum"),
    ]
    for s in suppliers:
        db.suppliers[s.id] = s
    abc, psr, gat, nsi = suppliers

    # --- Materials ---
    materials = [
        Material(
            id=_id(), code="MAT-ALSCR", name="Aluminum Scrap", category="Non-ferrous",
            uom="MT",
            specifications=[
                Specification(parameter="Al", unit="%", minValue=95.0, maxValue=99.5, targetValue=98.0),
                Specification(parameter="Si", unit="%", minValue=0.0, maxValue=2.5, targetValue=0.8),
                Specification(parameter="Fe", unit="%", minValue=0.0, maxValue=1.0, targetValue=0.3),
                Specification(parameter="Cu", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.1),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=1.0, targetValue=0.3),
            ],
            requiredTests=["XRF", "OES", "MOISTURE"],
        ),
        Material(
            id=_id(), code="MAT-PRAL", name="Primary Aluminum", category="Non-ferrous", uom="MT",
            specifications=[
                Specification(parameter="Al", unit="%", minValue=99.5, maxValue=99.95, targetValue=99.7),
                Specification(parameter="Si", unit="%", minValue=0.0, maxValue=0.1, targetValue=0.04),
                Specification(parameter="Fe", unit="%", minValue=0.0, maxValue=0.2, targetValue=0.08),
            ],
            requiredTests=["XRF", "OES"],
        ),
        Material(
            id=_id(), code="MAT-SIME", name="Silicon Metal", category="Non-ferrous", uom="MT",
            specifications=[
                Specification(parameter="Si", unit="%", minValue=98.5, maxValue=99.9, targetValue=99.2),
                Specification(parameter="Fe", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.2),
                Specification(parameter="Ca", unit="%", minValue=0.0, maxValue=0.3, targetValue=0.1),
            ],
            requiredTests=["XRF"],
        ),
        Material(
            id=_id(), code="MAT-CCOK", name="Calcined Coke", category="Carbon", uom="MT",
            specifications=[
                Specification(parameter="Carbon", unit="%", minValue=98.0, maxValue=99.5, targetValue=98.8),
                Specification(parameter="Sulphur", unit="%", minValue=0.0, maxValue=3.0, targetValue=1.8),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.2),
            ],
            requiredTests=["CS", "MOISTURE"],
        ),
    ]
    for m in materials:
        db.materials[m.id] = m
    al_scrap, pr_al, si_metal, c_coke = materials

    # --- Instruments ---
    instruments = [
        Instrument(
            id=_id(), code="OES-01", name="Thermo OES-01",
            type=InstrumentType.OES, vendor="Thermo Fisher", model="ARL iSpark 8860",
            serialNumber="TF-8860-21044", status=InstrumentStatus.ONLINE,
            location="Lab 1 — Spectroscopy", lastImportAt=_iso(0, 3),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=42,
            supportedParameters=["Al", "Si", "Fe", "Cu", "Mg", "Mn", "Zn", "Ti"],
        ),
        Instrument(
            id=_id(), code="XRF-01", name="Panalytical XRF-01",
            type=InstrumentType.XRF, vendor="Malvern Panalytical", model="Epsilon 4",
            serialNumber="MP-EP4-0091", status=InstrumentStatus.ONLINE,
            location="Lab 1 — Spectroscopy", lastImportAt=_iso(0, 1),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=58,
            supportedParameters=["Al", "Si", "Fe", "Cu", "Ca", "Ti"],
        ),
        Instrument(
            id=_id(), code="CS-01", name="LECO CS-01",
            type=InstrumentType.CS, vendor="LECO", model="CS744",
            serialNumber="LECO-CS744-1187", status=InstrumentStatus.ONLINE,
            location="Lab 2 — Combustion", lastImportAt=_iso(0, 6),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=24,
            supportedParameters=["Carbon", "Sulphur"],
        ),
        Instrument(
            id=_id(), code="MOIST-01", name="Moisture-01",
            type=InstrumentType.MOISTURE, vendor="Sartorius", model="MA-37",
            serialNumber="SAR-MA37-440", status=InstrumentStatus.DEGRADED,
            location="Lab 2 — Combustion", lastImportAt=_iso(0, 12),
            lastHeartbeatAt=_iso(0, 1), importsThisWeek=18,
            supportedParameters=["Moisture"],
        ),
    ]
    for inst in instruments:
        db.instruments[inst.id] = inst

    # --- Receipts ---
    hero_receipt = Receipt(
        id=_id(), lotNumber="LOT-2026-0042", supplierId=abc.id, materialId=al_scrap.id,
        quantity=24.5, uom="MT", vehicleNumber="HR-55-AB-4421", poNumber="PO-2026-118",
        receiptDate=_iso(0, 8), status=ReceiptStatus.PENDING_REVIEW, riskLevel=RiskLevel.LOW,
        assignedTo="Priya Menon", createdAt=_iso(0, 8), createdBy="Rohit Sharma",
        notes="Standard delivery, weighbridge ticket attached.",
    )
    db.receipts[hero_receipt.id] = hero_receipt

    other_receipts = [
        Receipt(id=_id(), lotNumber="LOT-2026-0041", supplierId=gat.id, materialId=pr_al.id,
                quantity=18.0, uom="MT", vehicleNumber="MH-12-CD-7720", poNumber="PO-2026-117",
                receiptDate=_iso(0, 14), status=ReceiptStatus.PENDING_TESTING, riskLevel=RiskLevel.LOW,
                assignedTo="Aditya Rao", createdAt=_iso(0, 14), createdBy="Rohit Sharma"),
        Receipt(id=_id(), lotNumber="LOT-2026-0040", supplierId=psr.id, materialId=al_scrap.id,
                quantity=22.0, uom="MT", vehicleNumber="DL-3C-AX-1102", poNumber="PO-2026-116",
                receiptDate=_iso(1), status=ReceiptStatus.PENDING_SAMPLING, riskLevel=RiskLevel.MEDIUM,
                assignedTo="Sneha Iyer", createdAt=_iso(1), createdBy="Rohit Sharma"),
        Receipt(id=_id(), lotNumber="LOT-2026-0039", supplierId=nsi.id, materialId=c_coke.id,
                quantity=30.0, uom="MT", vehicleNumber="CG-04-FE-3398", poNumber="PO-2026-115",
                receiptDate=_iso(1, 6), status=ReceiptStatus.ON_HOLD, riskLevel=RiskLevel.HIGH,
                assignedTo="Priya Menon", createdAt=_iso(1, 6), createdBy="Rohit Sharma",
                notes="Sulphur above threshold on first read — recollect ordered."),
        Receipt(id=_id(), lotNumber="LOT-2026-0038", supplierId=gat.id, materialId=si_metal.id,
                quantity=12.0, uom="MT", vehicleNumber="TN-09-BG-2244", poNumber="PO-2026-114",
                receiptDate=_iso(2), status=ReceiptStatus.APPROVED, riskLevel=RiskLevel.LOW,
                assignedTo="Aditya Rao", createdAt=_iso(2), createdBy="Rohit Sharma"),
        Receipt(id=_id(), lotNumber="LOT-2026-0037", supplierId=psr.id, materialId=al_scrap.id,
                quantity=26.5, uom="MT", vehicleNumber="HR-72-AC-9981", poNumber="PO-2026-113",
                receiptDate=_iso(3), status=ReceiptStatus.REJECTED, riskLevel=RiskLevel.HIGH,
                assignedTo="Priya Menon", createdAt=_iso(3), createdBy="Rohit Sharma",
                notes="Iron above 1.5%, supplier notified."),
        Receipt(id=_id(), lotNumber="LOT-2026-0036", supplierId=abc.id, materialId=al_scrap.id,
                quantity=24.0, uom="MT", vehicleNumber="HR-55-AB-1010", poNumber="PO-2026-112",
                receiptDate=_iso(4), status=ReceiptStatus.APPROVED, riskLevel=RiskLevel.LOW,
                assignedTo="Aditya Rao", createdAt=_iso(4), createdBy="Rohit Sharma"),
        Receipt(id=_id(), lotNumber="LOT-2026-0035", supplierId=abc.id, materialId=al_scrap.id,
                quantity=23.5, uom="MT", vehicleNumber="HR-55-AB-7711", poNumber="PO-2026-111",
                receiptDate=_iso(6), status=ReceiptStatus.APPROVED, riskLevel=RiskLevel.LOW,
                assignedTo="Aditya Rao", createdAt=_iso(6), createdBy="Rohit Sharma"),
        Receipt(id=_id(), lotNumber="LOT-2026-0034", supplierId=abc.id, materialId=al_scrap.id,
                quantity=22.5, uom="MT", vehicleNumber="HR-55-AB-4490", poNumber="PO-2026-110",
                receiptDate=_iso(9), status=ReceiptStatus.APPROVED, riskLevel=RiskLevel.LOW,
                assignedTo="Aditya Rao", createdAt=_iso(9), createdBy="Rohit Sharma"),
    ]
    for r in other_receipts:
        db.receipts[r.id] = r

    # --- Workflows ---
    for r in db.receipts.values():
        wf = workflow_engine.create_workflow("incoming-inspection", r.id)
        if r.status == ReceiptStatus.PENDING_SAMPLING:
            workflow_engine.complete_through(wf, "receipt", "Rohit Sharma")
        elif r.status == ReceiptStatus.PENDING_TESTING:
            workflow_engine.complete_through(wf, "sample", "Sneha Iyer")
        elif r.status == ReceiptStatus.PENDING_REVIEW:
            workflow_engine.complete_through(wf, "validation", "Aditya Rao")
        elif r.status == ReceiptStatus.APPROVED:
            workflow_engine.complete_through(wf, "release", "Priya Menon")
        elif r.status == ReceiptStatus.REJECTED:
            workflow_engine.complete_through(wf, "review", "Priya Menon")
        elif r.status == ReceiptStatus.ON_HOLD:
            workflow_engine.complete_through(wf, "validation", "Priya Menon")
        db.workflows[r.id] = wf

    # --- Sample + tests + results for the hero receipt ---
    hero_sample = Sample(
        id=_id(), sampleId="SMP-2026-0042-A", receiptId=hero_receipt.id,
        collectionDate=_iso(0, 7), collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED, notes="Composite from 5 sub-lots.",
    )
    db.samples[hero_sample.id] = hero_sample

    test_specs = [
        ("XRF", "XRF Chemistry", ["Al", "Si", "Fe", "Cu"], "XRF-01"),
        ("OES", "OES Chemistry", ["Al", "Si", "Fe", "Mg", "Mn", "Zn"], "OES-01"),
        ("MOISTURE", "Moisture", ["Moisture"], "MOIST-01"),
    ]
    hero_tests: List[Test] = []
    for code, name, params, inst_code in test_specs:
        t = Test(id=_id(), sampleId=hero_sample.id, code=code, name=name,
                 parameters=params, instrumentCode=inst_code,
                 status=TestStatus.COMPLETED, assignedAt=_iso(0, 6))
        db.tests[t.id] = t
        hero_tests.append(t)

    # populate results for hero tests
    def _result_status(value: float, lo: float, hi: float) -> ResultStatus:
        if value < lo or value > hi:
            return ResultStatus.FAIL
        margin = (hi - lo) * 0.1
        if value < lo + margin or value > hi - margin:
            return ResultStatus.WARNING
        return ResultStatus.PASS

    al_specs = {s.parameter: s for s in al_scrap.specifications}

    xrf_values = [
        ResultValue(parameter="Al", value=98.12, unit="%",
                    specMin=al_specs["Al"].minValue, specMax=al_specs["Al"].maxValue,
                    status=_result_status(98.12, 95.0, 99.5)),
        ResultValue(parameter="Si", value=0.71, unit="%",
                    specMin=al_specs["Si"].minValue, specMax=al_specs["Si"].maxValue,
                    status=_result_status(0.71, 0.0, 2.5)),
        ResultValue(parameter="Fe", value=0.34, unit="%",
                    specMin=al_specs["Fe"].minValue, specMax=al_specs["Fe"].maxValue,
                    status=_result_status(0.34, 0.0, 1.0)),
        ResultValue(parameter="Cu", value=0.09, unit="%",
                    specMin=al_specs["Cu"].minValue, specMax=al_specs["Cu"].maxValue,
                    status=_result_status(0.09, 0.0, 0.5)),
    ]
    db.results[_id()] = Result(
        id=_id(), testId=hero_tests[0].id, sampleId=hero_sample.id,
        source=ResultSource.INSTRUMENT, values=xrf_values,
        enteredBy="System (Panalytical XRF-01)", enteredAt=_iso(0, 5),
        instrumentCode="XRF-01", overallStatus=ResultStatus.PASS,
    )

    oes_values = [
        ResultValue(parameter="Al", value=98.18, unit="%", specMin=95.0, specMax=99.5, status=ResultStatus.PASS),
        ResultValue(parameter="Si", value=0.74, unit="%", specMin=0.0, specMax=2.5, status=ResultStatus.PASS),
        ResultValue(parameter="Fe", value=0.36, unit="%", specMin=0.0, specMax=1.0, status=ResultStatus.PASS),
        ResultValue(parameter="Mg", value=0.21, unit="%", specMin=0.0, specMax=1.0, status=ResultStatus.PASS),
        ResultValue(parameter="Mn", value=0.08, unit="%", specMin=0.0, specMax=1.0, status=ResultStatus.PASS),
        ResultValue(parameter="Zn", value=0.04, unit="%", specMin=0.0, specMax=1.0, status=ResultStatus.PASS),
    ]
    db.results[_id()] = Result(
        id=_id(), testId=hero_tests[1].id, sampleId=hero_sample.id,
        source=ResultSource.INSTRUMENT, values=oes_values,
        enteredBy="System (Thermo OES-01)", enteredAt=_iso(0, 4),
        instrumentCode="OES-01", overallStatus=ResultStatus.PASS,
    )

    moist_values = [
        ResultValue(parameter="Moisture", value=0.41, unit="%", specMin=0.0, specMax=1.0,
                    status=_result_status(0.41, 0.0, 1.0)),
    ]
    db.results[_id()] = Result(
        id=_id(), testId=hero_tests[2].id, sampleId=hero_sample.id,
        source=ResultSource.MANUAL, values=moist_values,
        enteredBy="Aditya Rao", enteredAt=_iso(0, 3),
        reason="External Lab",
        overallStatus=ResultStatus.PASS,
    )

    # ---- For the rejected lot 0037, populate a fail so historical lookups are real ----
    rejected = db.receipt_by_lot("LOT-2026-0037")
    if rejected:
        rs = Sample(id=_id(), sampleId="SMP-2026-0037-A", receiptId=rejected.id,
                    collectionDate=_iso(3, 2), collectedBy="Sneha Iyer",
                    status=SampleStatus.COLLECTED)
        db.samples[rs.id] = rs
        rt = Test(id=_id(), sampleId=rs.id, code="XRF", name="XRF Chemistry",
                  parameters=["Al", "Si", "Fe"], instrumentCode="XRF-01",
                  status=TestStatus.COMPLETED, assignedAt=_iso(3, 1))
        db.tests[rt.id] = rt
        rvals = [
            ResultValue(parameter="Al", value=94.2, unit="%", specMin=95.0, specMax=99.5, status=ResultStatus.FAIL),
            ResultValue(parameter="Si", value=1.9, unit="%", specMin=0.0, specMax=2.5, status=ResultStatus.PASS),
            ResultValue(parameter="Fe", value=1.5, unit="%", specMin=0.0, specMax=1.0, status=ResultStatus.FAIL),
        ]
        db.results[_id()] = Result(
            id=_id(), testId=rt.id, sampleId=rs.id, source=ResultSource.INSTRUMENT,
            values=rvals, enteredBy="System (Panalytical XRF-01)",
            enteredAt=_iso(3, 1), instrumentCode="XRF-01",
            overallStatus=ResultStatus.FAIL,
        )

    # --- Seed audit + notification history so the bell isn't empty ---
    from app.frameworks import audit, notifications as notif
    audit.record("Rohit Sharma", "Stores Executive", "create", "receipt",
                 hero_receipt.id, None, hero_receipt.model_dump())
    audit.record("Sneha Iyer", "Sampler", "create", "sample",
                 hero_sample.id, None, hero_sample.model_dump())
    audit.record("System", "Lab Analyst", "import", "result",
                 hero_tests[0].id, None, {"source": "Instrument", "instrument": "XRF-01"})

    notif.emit("Receipt Created", f"Lot {hero_receipt.lotNumber} created from ABC Metals.", entity_type="receipt", entity_id=hero_receipt.id)
    notif.emit("Sample Created", f"Sample {hero_sample.sampleId} collected for {hero_receipt.lotNumber}.", entity_type="sample", entity_id=hero_sample.id)
    notif.emit("Results Imported", f"XRF results imported from Panalytical XRF-01.", entity_type="result", entity_id=hero_tests[0].id)
    notif.emit("Validation Completed", f"All parameters compliant for {hero_receipt.lotNumber}.", entity_type="receipt", entity_id=hero_receipt.id)
