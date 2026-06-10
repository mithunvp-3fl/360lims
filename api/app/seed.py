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
from app.schemas.qualification import (
    ConsumptionArea,
    Qualification,
    QualificationApproval,
    QualificationDecision,
    QualificationResult,
    QualificationSample,
    QualificationStatus,
    QualificationTest,
)
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
                Specification(parameter="Sulphur", unit="%", minValue=0.0, maxValue=3.0, targetValue=1.25),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.35),
                Specification(parameter="Density", unit="g/cc", minValue=1.95, maxValue=2.15, targetValue=2.08),
                Specification(parameter="Air Permeability", unit="nPm", minValue=10.0, maxValue=20.0, targetValue=14.5),
                Specification(parameter="Electrical Resistance", unit="µΩm", minValue=40.0, maxValue=70.0, targetValue=52.0),
            ],
            requiredTests=["CS", "MOISTURE", "SULPHUR", "DENSITY", "AIR_PERM", "ELEC_RES"],
        ),
        Material(
            id=_id(), code="MAT-CTPI", name="Coal Tar Pitch", category="Carbon", uom="MT",
            specifications=[
                Specification(parameter="Softening Point", unit="°C", minValue=105.0, maxValue=120.0, targetValue=110.0),
                Specification(parameter="Density", unit="g/cc", minValue=1.28, maxValue=1.34, targetValue=1.31),
                Specification(parameter="Viscosity", unit="cP", minValue=180.0, maxValue=260.0, targetValue=220.0),
            ],
            requiredTests=["SOFTENING_POINT", "DENSITY", "VISCOSITY"],
        ),
        Material(
            id=_id(), code="MAT-CRYO", name="Cryolite", category="Bath", uom="MT",
            specifications=[
                Specification(parameter="Fluoride", unit="%", minValue=53.0, maxValue=56.0, targetValue=54.3),
                Specification(parameter="AlF3", unit="%", minValue=11.0, maxValue=14.0, targetValue=12.5),
                Specification(parameter="CaF2", unit="%", minValue=2.0, maxValue=5.0, targetValue=3.5),
                Specification(parameter="NaF", unit="%", minValue=28.0, maxValue=33.0, targetValue=30.0),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.2),
            ],
            requiredTests=["FLUORIDE", "COMPOSITION", "MOISTURE"],
        ),
        Material(
            id=_id(), code="MAT-ALF3", name="Aluminum Fluoride", category="Bath", uom="MT",
            specifications=[
                Specification(parameter="AlF3", unit="%", minValue=92.0, maxValue=96.0, targetValue=94.0),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.18),
            ],
            requiredTests=["COMPOSITION", "MOISTURE"],
        ),
        Material(
            id=_id(), code="MAT-BATH", name="Bath Material", category="Bath", uom="MT",
            specifications=[
                Specification(parameter="Cryolite Ratio", unit="", minValue=2.1, maxValue=2.5, targetValue=2.3),
                Specification(parameter="Alumina Phase", unit="%", minValue=2.0, maxValue=6.0, targetValue=4.0),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.5, targetValue=0.2),
            ],
            requiredTests=["COMPOSITION", "PHASE", "MOISTURE"],
        ),
        Material(
            id=_id(), code="MAT-CADD", name="Carbon Additive", category="Carbon", uom="MT",
            specifications=[
                Specification(parameter="Carbon", unit="%", minValue=97.0, maxValue=99.0, targetValue=98.2),
                Specification(parameter="Sulphur", unit="%", minValue=0.0, maxValue=1.5, targetValue=0.8),
            ],
            requiredTests=["CS", "SULPHUR"],
        ),
        Material(
            id=_id(), code="MAT-PCOK", name="Pet Coke", category="Carbon", uom="MT",
            specifications=[
                Specification(parameter="Sulphur", unit="%", minValue=0.0, maxValue=3.5, targetValue=2.4),
                Specification(parameter="Moisture", unit="%", minValue=0.0, maxValue=0.8, targetValue=0.4),
                Specification(parameter="Density", unit="g/cc", minValue=1.85, maxValue=2.05, targetValue=1.96),
            ],
            requiredTests=["SULPHUR", "MOISTURE", "DENSITY"],
        ),
    ]
    for m in materials:
        db.materials[m.id] = m
    al_scrap, pr_al, si_metal, c_coke, ctpi, cryolite, alf3, bath_mat, c_additive, pet_coke = materials

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
        # --- Phase 2: Process Qualification instruments ---
        Instrument(
            id=_id(), code="CSA-01", name="Carbon Sulphur Analyzer 01",
            type=InstrumentType.CS, vendor="Eltra", model="CS-2000",
            serialNumber="ELT-CS2K-9912", status=InstrumentStatus.ONLINE,
            location="Carbon Lab", lastImportAt=_iso(0, 2),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=31,
            supportedParameters=["Carbon", "Sulphur"],
        ),
        Instrument(
            id=_id(), code="MA-01", name="Moisture Analyzer 01",
            type=InstrumentType.MOISTURE, vendor="Mettler Toledo", model="HE73",
            serialNumber="MT-HE73-2204", status=InstrumentStatus.ONLINE,
            location="Carbon Lab", lastImportAt=_iso(0, 1),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=27,
            supportedParameters=["Moisture"],
        ),
        Instrument(
            id=_id(), code="PYC-01", name="Pycnometer 01",
            type=InstrumentType.OTHER, vendor="Micromeritics", model="AccuPyc II",
            serialNumber="MM-APYC2-118", status=InstrumentStatus.ONLINE,
            location="Carbon Lab", lastImportAt=_iso(0, 3),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=22,
            supportedParameters=["Density"],
        ),
        Instrument(
            id=_id(), code="APA-01", name="Air Permeability Analyzer 01",
            type=InstrumentType.OTHER, vendor="R&B Instruments", model="AP-300",
            serialNumber="RB-AP300-074", status=InstrumentStatus.ONLINE,
            location="Carbon Lab", lastImportAt=_iso(0, 4),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=19,
            supportedParameters=["Air Permeability"],
        ),
        Instrument(
            id=_id(), code="ERA-01", name="Electrical Resistance Analyzer 01",
            type=InstrumentType.OTHER, vendor="Ametek", model="EL-300",
            serialNumber="AM-EL300-512", status=InstrumentStatus.ONLINE,
            location="Carbon Lab", lastImportAt=_iso(0, 5),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=17,
            supportedParameters=["Electrical Resistance"],
        ),
        Instrument(
            id=_id(), code="SPT-01", name="Softening Point Tester 01",
            type=InstrumentType.OTHER, vendor="Anton Paar", model="SP-5",
            serialNumber="AP-SP5-9981", status=InstrumentStatus.ONLINE,
            location="Pitch Lab", lastImportAt=_iso(1, 3),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=12,
            supportedParameters=["Softening Point"],
        ),
        Instrument(
            id=_id(), code="VIS-01", name="Viscometer 01",
            type=InstrumentType.OTHER, vendor="Brookfield", model="DV-3T",
            serialNumber="BF-DV3T-441", status=InstrumentStatus.ONLINE,
            location="Pitch Lab", lastImportAt=_iso(1, 4),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=10,
            supportedParameters=["Viscosity"],
        ),
        Instrument(
            id=_id(), code="XRD-01", name="Panalytical XRD-01",
            type=InstrumentType.OTHER, vendor="Malvern Panalytical", model="Aeris",
            serialNumber="MP-AER-2210", status=InstrumentStatus.ONLINE,
            location="Bath Lab", lastImportAt=_iso(0, 6),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=15,
            supportedParameters=["Crystallinity", "Cryolite Ratio", "Alumina Phase"],
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
    _rid = _id()
    db.results[_rid] = Result(
        id=_rid, testId=hero_tests[0].id, sampleId=hero_sample.id,
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
    _rid = _id()
    db.results[_rid] = Result(
        id=_rid, testId=hero_tests[1].id, sampleId=hero_sample.id,
        source=ResultSource.INSTRUMENT, values=oes_values,
        enteredBy="System (Thermo OES-01)", enteredAt=_iso(0, 4),
        instrumentCode="OES-01", overallStatus=ResultStatus.PASS,
    )

    moist_values = [
        ResultValue(parameter="Moisture", value=0.41, unit="%", specMin=0.0, specMax=1.0,
                    status=_result_status(0.41, 0.0, 1.0)),
    ]
    _rid = _id()
    db.results[_rid] = Result(
        id=_rid, testId=hero_tests[2].id, sampleId=hero_sample.id,
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
        _rrid = _id()
        db.results[_rrid] = Result(
            id=_rrid, testId=rt.id, sampleId=rs.id, source=ResultSource.INSTRUMENT,
            values=rvals, enteredBy="System (Panalytical XRF-01)",
            enteredAt=_iso(3, 1), instrumentCode="XRF-01",
            overallStatus=ResultStatus.FAIL,
        )

    # --- Backfill simple results on past ABC Aluminum Scrap lots so parameter
    # trends in Quality Insights have something to average against. ---
    for past_lot, sample_seq, xrf_vals, days in [
        ("LOT-2026-0036", "A", [("Al", 98.05), ("Si", 0.68), ("Fe", 0.31), ("Cu", 0.10)], 4),
        ("LOT-2026-0035", "A", [("Al", 98.21), ("Si", 0.65), ("Fe", 0.29), ("Cu", 0.08)], 6),
        ("LOT-2026-0034", "A", [("Al", 97.98), ("Si", 0.74), ("Fe", 0.36), ("Cu", 0.11)], 9),
    ]:
        past = db.receipt_by_lot(past_lot)
        if not past:
            continue
        ps = Sample(id=_id(), sampleId=past_lot.replace("LOT-", "SMP-") + f"-{sample_seq}",
                    receiptId=past.id, collectionDate=_iso(days, 2),
                    collectedBy="Sneha Iyer", status=SampleStatus.COLLECTED)
        db.samples[ps.id] = ps
        pt = Test(id=_id(), sampleId=ps.id, code="XRF", name="XRF Chemistry",
                  parameters=[p for p, _ in xrf_vals], instrumentCode="XRF-01",
                  status=TestStatus.COMPLETED, assignedAt=_iso(days, 1))
        db.tests[pt.id] = pt
        pvals = [
            ResultValue(parameter=p, value=v, unit="%", specMin=al_specs.get(p, type("S",(),{"minValue":None})()).minValue if p in al_specs else None,
                        specMax=al_specs.get(p, type("S",(),{"maxValue":None})()).maxValue if p in al_specs else None,
                        status=ResultStatus.PASS)
            for p, v in xrf_vals
        ]
        _prid = _id()
        db.results[_prid] = Result(
            id=_prid, testId=pt.id, sampleId=ps.id, source=ResultSource.INSTRUMENT,
            values=pvals, enteredBy="System (Panalytical XRF-01)",
            enteredAt=_iso(days, 1), instrumentCode="XRF-01",
            overallStatus=ResultStatus.PASS,
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

    # ====================================================================
    # Phase 2 — Process Material Qualification seed data
    # ====================================================================
    _seed_qualifications(c_coke, ctpi, cryolite, bath_mat, alf3, pet_coke, abc, gat)


# --------------------------------------------------------------------------
# Phase 2 helper: seeds the hero qualification PMQ-2026-001245 and sibling
# batches so the queue, workbench, and Process Readiness panel are populated.
# --------------------------------------------------------------------------
def _seed_qualifications(c_coke, ctpi, cryolite, bath_mat, alf3, pet_coke, abc, gat) -> None:
    from app.frameworks import audit, notifications as notif

    # Hero qualification — Calcined Coke for Carbon Plant, all tests done,
    # process readiness ~91 (matches the PRD demo).
    hero = Qualification(
        id=_id(),
        qualificationNumber="PMQ-2026-001245",
        materialId=c_coke.id,
        batchNumber="CC-2026-015",
        supplierId=abc.id,
        sourceLotNumber="LOT-2026-0042",
        consumptionArea=ConsumptionArea.CARBON_PLANT,
        quantity=24.5,
        uom="MT",
        status=QualificationStatus.PENDING_REVIEW,
        riskLevel=RiskLevel.LOW,
        assignedTo="Ravi Iyer",
        requestedAt=_iso(0, 9),
        requestedBy="Aditya Rao",
        notes="Carbon Plant qualification for batch CC-2026-015. Source receipt LOT-2026-0042.",
    )
    db.qualifications[hero.id] = hero

    wf = workflow_engine.create_workflow("process-material-qualification", hero.id)
    workflow_engine.complete_through(wf, "validation", "Arjun Patel")
    db.workflows[hero.id] = wf

    hero_sample = QualificationSample(
        id=_id(),
        sampleId="PMQS-001245-A",
        qualificationId=hero.id,
        collectionDate=_iso(0, 8),
        collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
        notes="Composite sample from 4 bags.",
    )
    db.qualification_samples[hero_sample.id] = hero_sample

    # Tests + results matching PRD section 19 demo numbers.
    test_plan = [
        ("SULPHUR", "Sulphur", ["Sulphur"], "CSA-01", [("Sulphur", 1.25)]),
        ("MOISTURE", "Moisture", ["Moisture"], "MA-01", [("Moisture", 0.35)]),
        ("DENSITY", "Density", ["Density"], "PYC-01", [("Density", 2.08)]),
        ("AIR_PERM", "Air Permeability", ["Air Permeability"], "APA-01", [("Air Permeability", 14.5)]),
        ("ELEC_RES", "Electrical Resistance", ["Electrical Resistance"], "ERA-01", [("Electrical Resistance", 52.0)]),
    ]
    coke_specs = {s.parameter: s for s in c_coke.specifications}

    for code, name, params, inst_code, vals in test_plan:
        t = QualificationTest(
            id=_id(),
            sampleId=hero_sample.id,
            code=code, name=name, parameters=params,
            instrumentCode=inst_code,
            status=TestStatus.COMPLETED,
            assignedAt=_iso(0, 7),
        )
        db.qualification_tests[t.id] = t

        result_values: List = []
        for p, v in vals:
            spec = coke_specs.get(p)
            result_values.append(ResultValue(
                parameter=p, value=v,
                unit=spec.unit if spec else "%",
                specMin=spec.minValue if spec else None,
                specMax=spec.maxValue if spec else None,
                status=ResultStatus.PASS,
            ))
        rid = _id()
        db.qualification_results[rid] = QualificationResult(
            id=rid, testId=t.id, sampleId=hero_sample.id,
            source=ResultSource.INSTRUMENT,
            values=result_values,
            enteredBy=f"System ({inst_code})",
            enteredAt=_iso(0, 5),
            instrumentCode=inst_code,
            overallStatus=ResultStatus.PASS,
        )

    # --- Sibling qualifications so historical comparison / queue feel real ---
    sibling_qualifications = [
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001244",
                      materialId=c_coke.id, batchNumber="CC-2026-014",
                      supplierId=abc.id,
                      consumptionArea=ConsumptionArea.CARBON_PLANT,
                      quantity=22.0, uom="MT",
                      status=QualificationStatus.RELEASED,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Priya Menon",
                      requestedAt=_iso(2, 4), requestedBy="Aditya Rao",
                      notes="Released — chemistry trend stable."),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001243",
                      materialId=c_coke.id, batchNumber="CC-2026-013",
                      supplierId=abc.id,
                      consumptionArea=ConsumptionArea.CARBON_PLANT,
                      quantity=24.0, uom="MT",
                      status=QualificationStatus.RELEASED,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Priya Menon",
                      requestedAt=_iso(5, 2), requestedBy="Aditya Rao"),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001242",
                      materialId=c_coke.id, batchNumber="CC-2026-012",
                      supplierId=abc.id,
                      consumptionArea=ConsumptionArea.CARBON_PLANT,
                      quantity=23.0, uom="MT",
                      status=QualificationStatus.ON_HOLD,
                      riskLevel=RiskLevel.MEDIUM,
                      assignedTo="Ravi Iyer",
                      requestedAt=_iso(7, 0), requestedBy="Aditya Rao",
                      notes="On hold — sulphur near upper limit, recollect ordered."),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001241",
                      materialId=ctpi.id, batchNumber="CTP-2026-008",
                      supplierId=gat.id,
                      consumptionArea=ConsumptionArea.CARBON_PLANT,
                      quantity=18.0, uom="MT",
                      status=QualificationStatus.PENDING_TESTING,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Arjun Patel",
                      requestedAt=_iso(0, 16), requestedBy="Aditya Rao"),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001240",
                      materialId=cryolite.id, batchNumber="CRY-2026-022",
                      supplierId=gat.id,
                      consumptionArea=ConsumptionArea.POTLINE,
                      quantity=15.0, uom="MT",
                      status=QualificationStatus.PENDING_REVIEW,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Ravi Iyer",
                      requestedAt=_iso(1, 6), requestedBy="Aditya Rao"),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001239",
                      materialId=bath_mat.id, batchNumber="BTH-2026-019",
                      supplierId=gat.id,
                      consumptionArea=ConsumptionArea.POTLINE,
                      quantity=12.5, uom="MT",
                      status=QualificationStatus.RELEASED,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Priya Menon",
                      requestedAt=_iso(3, 8), requestedBy="Aditya Rao"),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001238",
                      materialId=alf3.id, batchNumber="ALF-2026-011",
                      supplierId=gat.id,
                      consumptionArea=ConsumptionArea.POTLINE,
                      quantity=10.0, uom="MT",
                      status=QualificationStatus.PENDING_SAMPLING,
                      riskLevel=RiskLevel.LOW,
                      assignedTo="Sneha Iyer",
                      requestedAt=_iso(0, 4), requestedBy="Aditya Rao"),
        Qualification(id=_id(), qualificationNumber="PMQ-2026-001237",
                      materialId=pet_coke.id, batchNumber="PC-2026-031",
                      supplierId=abc.id,
                      consumptionArea=ConsumptionArea.CARBON_PLANT,
                      quantity=20.0, uom="MT",
                      status=QualificationStatus.REJECTED,
                      riskLevel=RiskLevel.HIGH,
                      assignedTo="Priya Menon",
                      requestedAt=_iso(8, 0), requestedBy="Aditya Rao",
                      notes="Sulphur 3.6% — exceeds Carbon Plant tolerance."),
    ]
    for q in sibling_qualifications:
        db.qualifications[q.id] = q
        wfx = workflow_engine.create_workflow("process-material-qualification", q.id)
        stage_map = {
            QualificationStatus.PENDING_SAMPLING: "request",
            QualificationStatus.PENDING_TESTING: "sample",
            QualificationStatus.PENDING_REVIEW: "validation",
            QualificationStatus.RELEASED: "release",
            QualificationStatus.ON_HOLD: "review",
            QualificationStatus.REJECTED: "review",
            QualificationStatus.CANCELLED: "review",
        }
        workflow_engine.complete_through(wfx, stage_map[q.status], q.assignedTo or "Priya Menon")
        db.workflows[q.id] = wfx

    # Backfill released/held siblings with sample + results so the readiness
    # engine can compute trends and historical comparisons.
    for sibling, vals in [
        (sibling_qualifications[0], [("Sulphur", 1.18), ("Moisture", 0.32), ("Density", 2.07)]),
        (sibling_qualifications[1], [("Sulphur", 1.15), ("Moisture", 0.30), ("Density", 2.06)]),
        (sibling_qualifications[2], [("Sulphur", 2.7), ("Moisture", 0.38), ("Density", 2.04)]),
    ]:
        s = QualificationSample(
            id=_id(),
            sampleId=f"PMQS-{sibling.qualificationNumber.split('-')[-1]}-A",
            qualificationId=sibling.id,
            collectionDate=_iso(2, 1),
            collectedBy="Sneha Iyer",
            status=SampleStatus.COLLECTED,
        )
        db.qualification_samples[s.id] = s
        for p, v in vals:
            code = {"Sulphur": "SULPHUR", "Moisture": "MOISTURE", "Density": "DENSITY"}[p]
            t = QualificationTest(
                id=_id(), sampleId=s.id,
                code=code, name=p, parameters=[p],
                instrumentCode={"SULPHUR": "CSA-01", "MOISTURE": "MA-01", "DENSITY": "PYC-01"}[code],
                status=TestStatus.COMPLETED, assignedAt=_iso(2, 1),
            )
            db.qualification_tests[t.id] = t
            spec = coke_specs.get(p)
            status_val = ResultStatus.WARNING if (p == "Sulphur" and v > 2.5) else ResultStatus.PASS
            rid = _id()
            db.qualification_results[rid] = QualificationResult(
                id=rid, testId=t.id, sampleId=s.id,
                source=ResultSource.INSTRUMENT,
                values=[ResultValue(
                    parameter=p, value=v,
                    unit=spec.unit if spec else "%",
                    specMin=spec.minValue if spec else None,
                    specMax=spec.maxValue if spec else None,
                    status=status_val,
                )],
                enteredBy=f"System ({t.instrumentCode})",
                enteredAt=_iso(2, 1),
                instrumentCode=t.instrumentCode,
                overallStatus=status_val,
            )

    # --- Audit + notifications for the hero so the feed reads naturally ---
    audit.record("Aditya Rao", "Process Engineer", "create", "qualification",
                 hero.id, None, hero.model_dump())
    audit.record("Sneha Iyer", "Sampler", "create", "qualification-sample",
                 hero_sample.id, None, hero_sample.model_dump())
    audit.record("System", "Lab Analyst", "import", "qualification-result",
                 list(db.qualification_results.values())[0].id, None,
                 {"source": "Instrument", "instrument": "CSA-01"})

    notif.emit("Qualification created successfully",
               f"{hero.qualificationNumber} created for {hero.batchNumber} → Carbon Plant.",
               entity_type="qualification", entity_id=hero.id)
    notif.emit("Sample generated successfully",
               f"Sample {hero_sample.sampleId} drawn for {hero.qualificationNumber}.",
               entity_type="qualification-sample", entity_id=hero_sample.id)
    notif.emit("Results imported successfully",
               "Sulphur, Moisture, Density, Air Permeability, Electrical Resistance captured.",
               entity_type="qualification", entity_id=hero.id)
    notif.emit("Process readiness recalculated",
               f"{hero.qualificationNumber} ready for QA review — 91/100.",
               entity_type="qualification", entity_id=hero.id)
