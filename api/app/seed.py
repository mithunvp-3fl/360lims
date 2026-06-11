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
from app.schemas.metal_batch import (
    MetalBatch,
    MetalBatchStatus,
    MetalResult,
    MetalSample,
    MetalTest,
    ProductGrade,
)
from app.schemas.product_batch import (
    ProductBatch,
    ProductBatchStatus,
    ProductResult,
    ProductSample,
    ProductTest,
    ProductType,
)
from app.schemas.certificate import (
    Certificate,
    CertificateStatus,
    CustomerSpec,
    DispatchStatus,
)
from app.frameworks import workflow_engine
from app.frameworks import product_insights as product_fw
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
        # --- Phase 4: Product Quality Testing instruments ---
        Instrument(
            id=_id(), code="UTS-01", name="Zwick Roell Z150",
            type=InstrumentType.OTHER, vendor="Zwick Roell", model="Z150",
            serialNumber="ZR-Z150-2031", status=InstrumentStatus.ONLINE,
            location="Mechanical Lab", lastImportAt=_iso(0, 4),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=22,
            supportedParameters=["UTS", "YieldStrength", "Elongation"],
        ),
        Instrument(
            id=_id(), code="HARD-01", name="Wilson VH3300",
            type=InstrumentType.OTHER, vendor="Wilson", model="VH3300",
            serialNumber="WIL-VH3300-771", status=InstrumentStatus.ONLINE,
            location="Mechanical Lab", lastImportAt=_iso(0, 5),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=28,
            supportedParameters=["Hardness"],
        ),
        Instrument(
            id=_id(), code="MICRO-01", name="Leica DM6 M",
            type=InstrumentType.OTHER, vendor="Leica Microsystems", model="DM6 M",
            serialNumber="LEI-DM6M-115", status=InstrumentStatus.ONLINE,
            location="Metallography Lab", lastImportAt=_iso(0, 6),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=14,
            supportedParameters=["GrainSize", "Phase"],
        ),
        Instrument(
            id=_id(), code="COND-01", name="Foerster Sigmatest",
            type=InstrumentType.OTHER, vendor="Foerster", model="Sigmatest 2.069",
            serialNumber="FOE-ST2069-441", status=InstrumentStatus.ONLINE,
            location="Mechanical Lab", lastImportAt=_iso(0, 7),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=18,
            supportedParameters=["Conductivity"],
        ),
        Instrument(
            id=_id(), code="DIM-01", name="Mitutoyo Crysta-Apex",
            type=InstrumentType.OTHER, vendor="Mitutoyo", model="Crysta-Apex S574",
            serialNumber="MIT-CAS574-9912", status=InstrumentStatus.ONLINE,
            location="Inspection Bay", lastImportAt=_iso(0, 3),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=24,
            supportedParameters=["Length", "Diameter", "Weight"],
        ),
        Instrument(
            id=_id(), code="VIS-INSP", name="Visual Inspection Station",
            type=InstrumentType.OTHER, vendor="In-house", model="VIS-STN-01",
            serialNumber="VIS-STN-2026-01", status=InstrumentStatus.ONLINE,
            location="Inspection Bay", lastImportAt=_iso(0, 2),
            lastHeartbeatAt=_iso(0, 0), importsThisWeek=30,
            supportedParameters=["SurfaceDefects"],
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

    # ====================================================================
    # Phase 3 — Metal Quality Control seed data
    # ====================================================================
    _seed_metal_batches()

    # ====================================================================
    # Phase 4 — Product Quality Testing seed data
    # ====================================================================
    _seed_product_batches()

    # ====================================================================
    # Phase 5 — Certificate & Dispatch seed data
    # ====================================================================
    _seed_certificates()

    # ====================================================================
    # Demo story 2 — fully-approved end-to-end chain (Hindalco export)
    # ====================================================================
    _seed_demo_story_export()


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


# --------------------------------------------------------------------------
# Phase 3 helper: seeds hero metal batch MB-2026-001245 (P1020 · PL-03 · 32MT)
# and sibling batches so the queue, workbench, and Quality Insights panel
# render meaningful data.
# --------------------------------------------------------------------------
def _seed_metal_batches() -> None:
    from app.frameworks import audit, notifications as notif

    hero = MetalBatch(
        id=_id(),
        metalBatchNumber="MB-2026-001245",
        productGrade=ProductGrade.P1020,
        potline="PL-03",
        shift="A",
        productionDate=_iso(0, 6),
        weight=32.0,
        uom="MT",
        operator="Vikram Singh",
        status=MetalBatchStatus.PENDING_REVIEW,
        riskLevel=RiskLevel.LOW,
        assignedTo="Ravi Iyer",
        sourceQualificationNumber="PMQ-2026-001245",
        createdAt=_iso(0, 6),
        createdBy="Vikram Singh",
        notes="Standard tap from PL-03 — shift-A pour ready for chemistry verification.",
    )
    db.metal_batches[hero.id] = hero

    wf = workflow_engine.create_workflow("metal-quality-control", hero.id)
    workflow_engine.complete_through(wf, "validation", "Arjun Patel")
    db.workflows[hero.id] = wf

    hero_sample = MetalSample(
        id=_id(),
        sampleId="MQS-001245-A",
        metalBatchId=hero.id,
        collectionDate=_iso(0, 5),
        collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
        notes="Dip sample taken just before launder transfer.",
    )
    db.metal_samples[hero_sample.id] = hero_sample

    hero_test = MetalTest(
        id=_id(), sampleId=hero_sample.id,
        code="OES", name="OES Chemistry",
        parameters=["Si", "Fe", "Cu", "Mg", "Zn", "Ti", "Mn"],
        instrumentCode="OES-01",
        status=TestStatus.COMPLETED,
        assignedAt=_iso(0, 4),
    )
    db.metal_tests[hero_test.id] = hero_test

    # OES results aligned with the PRD demo numbers (Section 31).
    hero_vals = [
        ("Si", 0.08, (0.00, 0.10)),
        ("Fe", 0.14, (0.00, 0.20)),
        ("Cu", 0.02, (0.00, 0.03)),
        ("Mg", 0.01, (0.00, 0.03)),
        ("Zn", 0.01, (0.00, 0.03)),
        ("Ti", 0.01, (0.00, 0.03)),
        ("Mn", 0.01, (0.00, 0.03)),
    ]
    rid = _id()
    db.metal_results[rid] = MetalResult(
        id=rid, testId=hero_test.id, sampleId=hero_sample.id,
        source=ResultSource.INSTRUMENT,
        values=[
            ResultValue(parameter=p, value=v, unit="%",
                        specMin=lo, specMax=hi, status=ResultStatus.PASS)
            for p, v, (lo, hi) in hero_vals
        ],
        enteredBy="System (Thermo OES-01)",
        enteredAt=_iso(0, 3),
        instrumentCode="OES-01",
        overallStatus=ResultStatus.PASS,
    )

    siblings = [
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001244",
                   productGrade=ProductGrade.P1020, potline="PL-03", shift="C",
                   productionDate=_iso(1, 4), weight=31.5, operator="Anil Kumar",
                   status=MetalBatchStatus.RELEASED, riskLevel=RiskLevel.LOW,
                   assignedTo="Priya Menon", createdAt=_iso(1, 4),
                   createdBy="Anil Kumar",
                   notes="Released — chemistry trend stable."),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001243",
                   productGrade=ProductGrade.P1020, potline="PL-03", shift="B",
                   productionDate=_iso(2, 6), weight=32.2, operator="Vikram Singh",
                   status=MetalBatchStatus.RELEASED, riskLevel=RiskLevel.LOW,
                   assignedTo="Priya Menon", createdAt=_iso(2, 6),
                   createdBy="Vikram Singh"),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001242",
                   productGrade=ProductGrade.P1020, potline="PL-03", shift="A",
                   productionDate=_iso(3, 2), weight=30.8, operator="Anil Kumar",
                   status=MetalBatchStatus.ON_HOLD, riskLevel=RiskLevel.MEDIUM,
                   assignedTo="Ravi Iyer", createdAt=_iso(3, 2),
                   createdBy="Anil Kumar",
                   notes="On hold — Fe near upper limit, recheck ordered."),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001241",
                   productGrade=ProductGrade.P1020, potline="PL-02", shift="A",
                   productionDate=_iso(0, 12), weight=31.0, operator="Suresh Babu",
                   status=MetalBatchStatus.PENDING_TESTING, riskLevel=RiskLevel.LOW,
                   assignedTo="Arjun Patel", createdAt=_iso(0, 12),
                   createdBy="Suresh Babu"),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001240",
                   productGrade=ProductGrade.P0610, potline="PL-01", shift="C",
                   productionDate=_iso(1, 8), weight=28.0, operator="Suresh Babu",
                   status=MetalBatchStatus.PENDING_REVIEW, riskLevel=RiskLevel.LOW,
                   assignedTo="Ravi Iyer", createdAt=_iso(1, 8),
                   createdBy="Suresh Babu"),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001239",
                   productGrade=ProductGrade.P0610, potline="PL-01", shift="B",
                   productionDate=_iso(2, 14), weight=27.5, operator="Anil Kumar",
                   status=MetalBatchStatus.RELEASED, riskLevel=RiskLevel.LOW,
                   assignedTo="Priya Menon", createdAt=_iso(2, 14),
                   createdBy="Anil Kumar"),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001238",
                   productGrade=ProductGrade.PRIMARY_AL, potline="PL-04", shift="A",
                   productionDate=_iso(0, 3), weight=29.0, operator="Vikram Singh",
                   status=MetalBatchStatus.PENDING_SAMPLING, riskLevel=RiskLevel.LOW,
                   assignedTo="Sneha Iyer", createdAt=_iso(0, 3),
                   createdBy="Vikram Singh"),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001237",
                   productGrade=ProductGrade.P1020, potline="PL-02", shift="A",
                   productionDate=_iso(5, 0), weight=30.0, operator="Anil Kumar",
                   status=MetalBatchStatus.REJECTED, riskLevel=RiskLevel.HIGH,
                   assignedTo="Priya Menon", createdAt=_iso(5, 0),
                   createdBy="Anil Kumar",
                   notes="Fe 0.32% — exceeded P1020 tolerance. Re-melted."),
        MetalBatch(id=_id(), metalBatchNumber="MB-2026-001236",
                   productGrade=ProductGrade.P0610, potline="PL-01", shift="A",
                   productionDate=_iso(6, 2), weight=28.5, operator="Suresh Babu",
                   status=MetalBatchStatus.DOWNGRADED, riskLevel=RiskLevel.MEDIUM,
                   assignedTo="Priya Menon", createdAt=_iso(6, 2),
                   createdBy="Suresh Babu",
                   notes="Si edge of spec — downgraded to P1020."),
    ]
    for b in siblings:
        db.metal_batches[b.id] = b
        wfx = workflow_engine.create_workflow("metal-quality-control", b.id)
        stage_map = {
            MetalBatchStatus.PENDING_SAMPLING: "batch",
            MetalBatchStatus.PENDING_TESTING: "sample",
            MetalBatchStatus.PENDING_REVIEW: "validation",
            MetalBatchStatus.RELEASED: "release",
            MetalBatchStatus.DOWNGRADED: "release",
            MetalBatchStatus.ON_HOLD: "review",
            MetalBatchStatus.REJECTED: "review",
            MetalBatchStatus.CANCELLED: "review",
        }
        workflow_engine.complete_through(wfx, stage_map[b.status], b.assignedTo or "Priya Menon")
        db.workflows[b.id] = wfx

    # Backfill released/held PL-03 P1020 siblings with chemistry so the
    # readiness engine and parameter trends have real history to chart.
    history_vals = [
        (siblings[0], [("Si", 0.07), ("Fe", 0.13), ("Cu", 0.02), ("Mg", 0.01),
                       ("Zn", 0.01), ("Ti", 0.01), ("Mn", 0.01)]),
        (siblings[1], [("Si", 0.08), ("Fe", 0.12), ("Cu", 0.02), ("Mg", 0.01),
                       ("Zn", 0.01), ("Ti", 0.01), ("Mn", 0.01)]),
        (siblings[2], [("Si", 0.09), ("Fe", 0.18), ("Cu", 0.02), ("Mg", 0.01),
                       ("Zn", 0.01), ("Ti", 0.01), ("Mn", 0.01)]),
    ]
    grade_specs = {
        "Si": (0.00, 0.10), "Fe": (0.00, 0.20), "Cu": (0.00, 0.03),
        "Mg": (0.00, 0.03), "Zn": (0.00, 0.03), "Ti": (0.00, 0.03),
        "Mn": (0.00, 0.03),
    }
    for sib, vals in history_vals:
        s = MetalSample(
            id=_id(),
            sampleId=f"MQS-{sib.metalBatchNumber.split('-')[-1]}-A",
            metalBatchId=sib.id,
            collectionDate=_iso(2, 1),
            collectedBy="Sneha Iyer",
            status=SampleStatus.COLLECTED,
        )
        db.metal_samples[s.id] = s
        t = MetalTest(
            id=_id(), sampleId=s.id,
            code="OES", name="OES Chemistry",
            parameters=[p for p, _ in vals],
            instrumentCode="OES-01",
            status=TestStatus.COMPLETED,
            assignedAt=_iso(2, 1),
        )
        db.metal_tests[t.id] = t
        status_overall = ResultStatus.PASS
        result_values = []
        for p, v in vals:
            lo, hi = grade_specs[p]
            margin = (hi - lo) * 0.1
            if v < lo or v > hi:
                vstatus = ResultStatus.FAIL
                status_overall = ResultStatus.FAIL
            elif v < lo + margin or v > hi - margin:
                vstatus = ResultStatus.WARNING
                if status_overall == ResultStatus.PASS:
                    status_overall = ResultStatus.WARNING
            else:
                vstatus = ResultStatus.PASS
            result_values.append(ResultValue(
                parameter=p, value=v, unit="%",
                specMin=lo, specMax=hi, status=vstatus,
            ))
        rid_h = _id()
        db.metal_results[rid_h] = MetalResult(
            id=rid_h, testId=t.id, sampleId=s.id,
            source=ResultSource.INSTRUMENT,
            values=result_values,
            enteredBy="System (Thermo OES-01)",
            enteredAt=_iso(2, 1),
            instrumentCode="OES-01",
            overallStatus=status_overall,
        )

    audit.record("Vikram Singh", "Casthouse Operator", "create", "metal-batch",
                 hero.id, None, hero.model_dump())
    audit.record("Sneha Iyer", "Lab Analyst", "create", "metal-sample",
                 hero_sample.id, None, hero_sample.model_dump())
    audit.record("System", "Lab Analyst", "import", "metal-result",
                 list(db.metal_results.values())[0].id, None,
                 {"source": "Instrument", "instrument": "OES-01"})

    notif.emit("Metal batch created successfully",
               f"{hero.metalBatchNumber} created — P1020 on PL-03 (32 MT).",
               entity_type="metal-batch", entity_id=hero.id)
    notif.emit("Sample generated successfully",
               f"Sample {hero_sample.sampleId} drawn for {hero.metalBatchNumber}.",
               entity_type="metal-sample", entity_id=hero_sample.id)
    notif.emit("OES results imported",
               "Si, Fe, Cu, Mg, Zn, Ti, Mn captured from Thermo OES-01.",
               entity_type="metal-batch", entity_id=hero.id)
    notif.emit("Chemistry validation completed",
               f"{hero.metalBatchNumber} ready for QA review — 98/100 compliance.",
               entity_type="metal-batch", entity_id=hero.id)


# --------------------------------------------------------------------------
# Phase 4 helper: seeds hero product batch PB-2026-000210 (Primary Aluminum
# Ingot, 22.5 MT) and sibling batches so the queue, workbench, and Quality
# Insights panel render meaningful data.
# --------------------------------------------------------------------------
def _seed_product_batches() -> None:
    from app.frameworks import audit, notifications as notif

    hero = ProductBatch(
        id=_id(),
        productBatchNumber="PB-2026-000210",
        productType=ProductType.PRIMARY_ALUMINUM_INGOT,
        weight=22.5,
        uom="MT",
        sourceMetalBatchNumber="MB-2026-001245",
        customer="Export Customer",
        operator="Vikram Singh",
        productionDate=_iso(0, 4),
        status=ProductBatchStatus.PENDING_REVIEW,
        riskLevel=RiskLevel.LOW,
        assignedTo="Ravi Iyer",
        createdAt=_iso(0, 4),
        createdBy="Vikram Singh",
        notes="Hero ingot pour ready for QA review.",
    )
    db.product_batches[hero.id] = hero

    wf = workflow_engine.create_workflow("product-quality-testing", hero.id)
    workflow_engine.complete_through(wf, "validation", "Arjun Patel")
    db.workflows[hero.id] = wf

    hero_sample = ProductSample(
        id=_id(),
        sampleId="PQS-000210-A",
        productBatchId=hero.id,
        collectionDate=_iso(0, 3),
        collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
        notes="Sample collected from ingot mid-section.",
    )
    db.product_samples[hero_sample.id] = hero_sample

    # Hero test plan with PRD §19 demo numbers — all passing.
    hero_test_plan = [
        ("UTS", "Ultimate Tensile Strength", ["UTS", "YieldStrength", "Elongation"],
         "UTS-01", [("UTS", 165.0), ("YieldStrength", 72.0), ("Elongation", 14.5)]),
        ("HARDNESS", "Hardness", ["Hardness"], "HARD-01",
         [("Hardness", 52.0)]),
        ("CONDUCTIVITY", "Conductivity", ["Conductivity"], "COND-01",
         [("Conductivity", 61.0)]),
        ("DIMENSIONS", "Dimensions & Weight", ["Length", "Diameter", "Weight"], "DIM-01",
         [("Length", 710.0), ("Diameter", 100.0), ("Weight", 22.4)]),
        ("METALLOGRAPHY", "Microstructure Review", ["GrainSize", "Phase"], "MICRO-01",
         [("GrainSize", 82.0), ("Phase", 96.8)]),
        ("VISUAL", "Visual Inspection", ["SurfaceDefects"], "VIS-INSP",
         [("SurfaceDefects", 1.0)]),
    ]

    for code, name, params, inst_code, vals in hero_test_plan:
        t = ProductTest(
            id=_id(),
            sampleId=hero_sample.id,
            code=code, name=name, parameters=params,
            instrumentCode=inst_code,
            status=TestStatus.COMPLETED,
            assignedAt=_iso(0, 2),
        )
        db.product_tests[t.id] = t

        rvals = []
        for p, v in vals:
            spec = product_fw.spec_for(ProductType.PRIMARY_ALUMINUM_INGOT, p)
            unit = product_fw.unit_for(p)
            if spec:
                lo, hi, _ = spec
                status_val = product_fw._status_for(v, lo, hi)
            else:
                lo, hi, status_val = None, None, ResultStatus.PASS
            rvals.append(ResultValue(
                parameter=p, value=v,
                unit=unit or "",
                specMin=lo, specMax=hi,
                status=status_val,
            ))
        overall = ResultStatus.PASS
        if any(v.status == ResultStatus.FAIL for v in rvals):
            overall = ResultStatus.FAIL
        elif any(v.status == ResultStatus.WARNING for v in rvals):
            overall = ResultStatus.WARNING

        rid = _id()
        db.product_results[rid] = ProductResult(
            id=rid, testId=t.id, sampleId=hero_sample.id,
            source=ResultSource.INSTRUMENT,
            values=rvals,
            enteredBy=f"System ({inst_code})",
            enteredAt=_iso(0, 1),
            instrumentCode=inst_code,
            overallStatus=overall,
        )

    # Sibling product batches for queue + historical comparisons
    siblings = [
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000209",
                     productType=ProductType.PRIMARY_ALUMINUM_INGOT,
                     weight=22.5, uom="MT",
                     sourceMetalBatchNumber="MB-2026-001244",
                     customer="Export Customer", operator="Anil Kumar",
                     productionDate=_iso(1, 6),
                     status=ProductBatchStatus.APPROVED, riskLevel=RiskLevel.LOW,
                     assignedTo="Priya Menon", createdAt=_iso(1, 6),
                     createdBy="Anil Kumar",
                     notes="Approved — quality trend stable."),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000208",
                     productType=ProductType.PRIMARY_ALUMINUM_INGOT,
                     weight=22.0, uom="MT",
                     sourceMetalBatchNumber="MB-2026-001243",
                     customer="Domestic Client A", operator="Vikram Singh",
                     productionDate=_iso(2, 8),
                     status=ProductBatchStatus.APPROVED, riskLevel=RiskLevel.LOW,
                     assignedTo="Priya Menon", createdAt=_iso(2, 8),
                     createdBy="Vikram Singh"),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000207",
                     productType=ProductType.PRIMARY_ALUMINUM_BILLET,
                     weight=100.0, uom="MT",
                     sourceMetalBatchNumber="MB-2026-001239",
                     customer="Extrusion Co.", operator="Suresh Babu",
                     productionDate=_iso(3, 4),
                     status=ProductBatchStatus.APPROVED, riskLevel=RiskLevel.LOW,
                     assignedTo="Priya Menon", createdAt=_iso(3, 4),
                     createdBy="Suresh Babu"),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000206",
                     productType=ProductType.PRIMARY_ALUMINUM_INGOT,
                     weight=22.5, uom="MT",
                     sourceMetalBatchNumber="MB-2026-001242",
                     customer="Domestic Client B", operator="Anil Kumar",
                     productionDate=_iso(4, 2),
                     status=ProductBatchStatus.ON_HOLD, riskLevel=RiskLevel.MEDIUM,
                     assignedTo="Ravi Iyer", createdAt=_iso(4, 2),
                     createdBy="Anil Kumar",
                     notes="On hold — minor elongation deviation."),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000205",
                     productType=ProductType.PRIMARY_ALUMINUM_BILLET,
                     weight=98.0, uom="MT",
                     sourceMetalBatchNumber=None,
                     customer="Extrusion Co.", operator="Suresh Babu",
                     productionDate=_iso(0, 12),
                     status=ProductBatchStatus.PENDING_TESTING, riskLevel=RiskLevel.LOW,
                     assignedTo="Arjun Patel", createdAt=_iso(0, 12),
                     createdBy="Suresh Babu"),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000204",
                     productType=ProductType.PRIMARY_ALUMINUM_INGOT,
                     weight=23.0, uom="MT",
                     sourceMetalBatchNumber=None,
                     customer="Export Customer", operator="Vikram Singh",
                     productionDate=_iso(0, 6),
                     status=ProductBatchStatus.PENDING_SAMPLING, riskLevel=RiskLevel.LOW,
                     assignedTo="Sneha Iyer", createdAt=_iso(0, 6),
                     createdBy="Vikram Singh"),
        ProductBatch(id=_id(), productBatchNumber="PB-2026-000203",
                     productType=ProductType.PRIMARY_ALUMINUM_INGOT,
                     weight=22.5, uom="MT",
                     sourceMetalBatchNumber="MB-2026-001237",
                     customer="Domestic Client A", operator="Anil Kumar",
                     productionDate=_iso(6, 0),
                     status=ProductBatchStatus.REJECTED, riskLevel=RiskLevel.HIGH,
                     assignedTo="Priya Menon", createdAt=_iso(6, 0),
                     createdBy="Anil Kumar",
                     notes="Rejected — elongation 6.5% below spec."),
    ]
    for b in siblings:
        db.product_batches[b.id] = b
        wfx = workflow_engine.create_workflow("product-quality-testing", b.id)
        stage_map = {
            ProductBatchStatus.PENDING_SAMPLING: "batch",
            ProductBatchStatus.PENDING_TESTING: "sample",
            ProductBatchStatus.PENDING_REVIEW: "validation",
            ProductBatchStatus.APPROVED: "release",
            ProductBatchStatus.ON_HOLD: "review",
            ProductBatchStatus.REJECTED: "review",
            ProductBatchStatus.RETEST: "review",
            ProductBatchStatus.CANCELLED: "review",
        }
        workflow_engine.complete_through(wfx, stage_map[b.status], b.assignedTo or "Priya Menon")
        db.workflows[b.id] = wfx

    # Backfill approved siblings with results to populate historical trends.
    approved_ingot_vals = [
        (siblings[0], ProductType.PRIMARY_ALUMINUM_INGOT, [
            ("UTS", 168.0), ("YieldStrength", 71.0), ("Elongation", 14.0),
            ("Hardness", 53.0), ("Conductivity", 60.8),
            ("Length", 711.0), ("Diameter", 100.5), ("Weight", 22.5),
            ("GrainSize", 80.0), ("Phase", 96.5), ("SurfaceDefects", 1.0),
        ]),
        (siblings[1], ProductType.PRIMARY_ALUMINUM_INGOT, [
            ("UTS", 164.0), ("YieldStrength", 70.0), ("Elongation", 13.8),
            ("Hardness", 51.5), ("Conductivity", 61.1),
            ("Length", 709.0), ("Diameter", 99.5), ("Weight", 22.3),
            ("GrainSize", 81.0), ("Phase", 96.7), ("SurfaceDefects", 1.0),
        ]),
        (siblings[2], ProductType.PRIMARY_ALUMINUM_BILLET, [
            ("UTS", 175.0), ("YieldStrength", 75.0), ("Elongation", 12.0),
            ("Hardness", 56.0), ("Conductivity", 59.0),
            ("Length", 1500.0), ("Diameter", 180.0), ("Weight", 100.0),
            ("GrainSize", 75.0), ("Phase", 96.0), ("SurfaceDefects", 1.0),
        ]),
    ]
    plan_per_type = {
        ProductType.PRIMARY_ALUMINUM_INGOT: [
            ("UTS", "UTS", ["UTS", "YieldStrength", "Elongation"], "UTS-01"),
            ("HARDNESS", "Hardness", ["Hardness"], "HARD-01"),
            ("CONDUCTIVITY", "Conductivity", ["Conductivity"], "COND-01"),
            ("DIMENSIONS", "Dimensions & Weight", ["Length", "Diameter", "Weight"], "DIM-01"),
            ("METALLOGRAPHY", "Microstructure Review", ["GrainSize", "Phase"], "MICRO-01"),
            ("VISUAL", "Visual Inspection", ["SurfaceDefects"], "VIS-INSP"),
        ],
        ProductType.PRIMARY_ALUMINUM_BILLET: [
            ("UTS", "UTS", ["UTS", "YieldStrength", "Elongation"], "UTS-01"),
            ("HARDNESS", "Hardness", ["Hardness"], "HARD-01"),
            ("CONDUCTIVITY", "Conductivity", ["Conductivity"], "COND-01"),
            ("DIMENSIONS", "Dimensions & Weight", ["Length", "Diameter", "Weight"], "DIM-01"),
            ("METALLOGRAPHY", "Microstructure Review", ["GrainSize", "Phase"], "MICRO-01"),
            ("VISUAL", "Visual Inspection", ["SurfaceDefects"], "VIS-INSP"),
        ],
    }

    for sib, ptype, vals in approved_ingot_vals:
        s = ProductSample(
            id=_id(),
            sampleId=f"PQS-{sib.productBatchNumber.split('-')[-1]}-A",
            productBatchId=sib.id,
            collectionDate=_iso(3, 1),
            collectedBy="Sneha Iyer",
            status=SampleStatus.COLLECTED,
        )
        db.product_samples[s.id] = s
        vals_by_param = dict(vals)
        for code, name, params, inst_code in plan_per_type[ptype]:
            t = ProductTest(
                id=_id(), sampleId=s.id,
                code=code, name=name, parameters=params,
                instrumentCode=inst_code,
                status=TestStatus.COMPLETED, assignedAt=_iso(3, 1),
            )
            db.product_tests[t.id] = t
            rvals = []
            overall = ResultStatus.PASS
            for p in params:
                v = vals_by_param.get(p)
                if v is None:
                    continue
                spec = product_fw.spec_for(ptype, p)
                unit = product_fw.unit_for(p)
                if spec:
                    lo, hi, _ = spec
                    status_val = product_fw._status_for(v, lo, hi)
                else:
                    lo, hi, status_val = None, None, ResultStatus.PASS
                if status_val == ResultStatus.FAIL:
                    overall = ResultStatus.FAIL
                elif status_val == ResultStatus.WARNING and overall == ResultStatus.PASS:
                    overall = ResultStatus.WARNING
                rvals.append(ResultValue(
                    parameter=p, value=v,
                    unit=unit or "",
                    specMin=lo, specMax=hi, status=status_val,
                ))
            rid_h = _id()
            db.product_results[rid_h] = ProductResult(
                id=rid_h, testId=t.id, sampleId=s.id,
                source=ResultSource.INSTRUMENT,
                values=rvals,
                enteredBy=f"System ({inst_code})",
                enteredAt=_iso(3, 1),
                instrumentCode=inst_code,
                overallStatus=overall,
            )

    audit.record("Vikram Singh", "Production Operator", "create", "product-batch",
                 hero.id, None, hero.model_dump())
    audit.record("Sneha Iyer", "Lab Analyst", "create", "product-sample",
                 hero_sample.id, None, hero_sample.model_dump())
    audit.record("System", "Lab Analyst", "import", "product-result",
                 list(db.product_results.values())[0].id, None,
                 {"source": "Instrument", "instrument": "UTS-01"})

    notif.emit("Product batch created successfully",
               f"{hero.productBatchNumber} created — Primary Aluminum Ingot (22.5 MT).",
               entity_type="product-batch", entity_id=hero.id)
    notif.emit("Product sample collected",
               f"Sample {hero_sample.sampleId} drawn for {hero.productBatchNumber}.",
               entity_type="product-sample", entity_id=hero_sample.id)
    notif.emit("Mechanical results imported",
               "UTS, YieldStrength, Elongation, Hardness, Conductivity, Dimensions, "
               "Metallography and Visual captured.",
               entity_type="product-batch", entity_id=hero.id)
    notif.emit("Product validation completed",
               f"{hero.productBatchNumber} ready for QA review — 97/100 compliance.",
               entity_type="product-batch", entity_id=hero.id)


# --------------------------------------------------------------------------
# Phase 5 helper: seeds hero certificate COA-2026-001245 and siblings.
# --------------------------------------------------------------------------
def _seed_certificates() -> None:
    from app.frameworks import audit, notifications as notif

    hero_pb = db.product_batch_by_number("PB-2026-000210")
    if not hero_pb:
        return  # safety

    # Build customer specs from hero product batch results (one per parameter).
    hero_specs: List[CustomerSpec] = []
    seen: set[str] = set()
    for r in db.presults_for_batch(hero_pb.id):
        for v in r.values:
            if v.parameter in seen:
                continue
            seen.add(v.parameter)
            hero_specs.append(CustomerSpec(
                parameter=v.parameter,
                unit=v.unit or "",
                requiredMin=v.specMin,
                requiredMax=v.specMax,
                requiredTarget=None,
                actualValue=v.value,
                complianceStatus=v.status,
            ))

    hero_cert_number = "COA-2026-001245"
    hero_cert = Certificate(
        id=_id(),
        certificateNumber=hero_cert_number,
        productBatchNumber=hero_pb.productBatchNumber,
        productBatchId=hero_pb.id,
        customer="Export Customer",
        customerSpecs=hero_specs,
        status=CertificateStatus.ISSUED,
        dispatchStatus=DispatchStatus.READY,
        issuedAt=_iso(0, 2),
        issuedBy="Priya Menon",
        createdAt=_iso(0, 3),
        createdBy="Aditya Rao",
        qrCodeValue=hero_cert_number,
        barcodeValue=hero_cert_number,
        notes="Issued for export shipment.",
    )
    db.certificates[hero_cert.id] = hero_cert

    # Sibling certificates linked to approved product batches.
    approved_pbs = [b for b in db.product_batches.values()
                    if b.status == ProductBatchStatus.APPROVED]

    sibling_specs = [
        # (status, dispatchStatus, customer, notes)
        (CertificateStatus.ISSUED, DispatchStatus.RELEASED, "Export Customer", "Released for shipment."),
        (CertificateStatus.ISSUED, DispatchStatus.HELD, "Domestic Client A", "Held — customer documentation pending."),
        (CertificateStatus.DRAFT, DispatchStatus.PENDING, "Extrusion Co.", "Draft — awaiting QA sign-off."),
        (CertificateStatus.CANCELLED, DispatchStatus.PENDING, "Domestic Client B", "Cancelled — customer order withdrawn."),
    ]

    cert_seq = 1244
    for (st, ds, cust, note), pb in zip(sibling_specs, approved_pbs):
        cert_seq -= 1
        sibling_number = f"COA-2026-{cert_seq:06d}"
        specs: List[CustomerSpec] = []
        seen2: set[str] = set()
        for r in db.presults_for_batch(pb.id):
            for v in r.values:
                if v.parameter in seen2:
                    continue
                seen2.add(v.parameter)
                specs.append(CustomerSpec(
                    parameter=v.parameter,
                    unit=v.unit or "",
                    requiredMin=v.specMin,
                    requiredMax=v.specMax,
                    actualValue=v.value,
                    complianceStatus=v.status,
                ))
        sibling = Certificate(
            id=_id(),
            certificateNumber=sibling_number,
            productBatchNumber=pb.productBatchNumber,
            productBatchId=pb.id,
            customer=cust,
            customerSpecs=specs,
            status=st,
            dispatchStatus=ds,
            issuedAt=_iso(2, 0) if st == CertificateStatus.ISSUED else None,
            issuedBy="Priya Menon" if st == CertificateStatus.ISSUED else None,
            createdAt=_iso(3, 0),
            createdBy="Aditya Rao",
            qrCodeValue=sibling_number,
            barcodeValue=sibling_number,
            notes=note,
        )
        db.certificates[sibling.id] = sibling

    audit.record("Aditya Rao", "QA Engineer", "create", "certificate",
                 hero_cert.id, None, hero_cert.model_dump())
    audit.record("Priya Menon", "QA Manager", "issue", "certificate",
                 hero_cert.id, None, {"issuedBy": "Priya Menon"})

    notif.emit("Certificate generated",
               f"{hero_cert.certificateNumber} generated for {hero_pb.productBatchNumber} → Export Customer.",
               entity_type="certificate", entity_id=hero_cert.id)
    notif.emit("Certificate issued",
               f"{hero_cert.certificateNumber} issued for {hero_pb.productBatchNumber}.",
               entity_type="certificate", entity_id=hero_cert.id)


# --------------------------------------------------------------------------
# Demo story 2: a fresh end-to-end chain at the final released / approved /
# dispatched state. Complements the existing PMQ-001245 / MB-001245 /
# PB-000210 / COA-001245 chain which sits at "pending review" so demos can
# show both an active work-in-progress chain and a completed happy path.
#
# Storyline: 50 MT Primary Aluminum delivery from Global Alloy Traders is
# qualified for the Casthouse (PMQ-2026-001260), cast as P1020 on Potline 04
# (MB-2026-001260), billeted (PB-2026-000225), and certified for export to
# Hindalco International (COA-2026-001260).
# --------------------------------------------------------------------------
def _seed_demo_story_export() -> None:
    from app.frameworks import audit, notifications as notif

    gat = next((s for s in db.suppliers.values() if s.code == "SUP-GAT"), None)
    pr_al = next((m for m in db.materials.values() if m.code == "MAT-PRAL"), None)
    if not gat or not pr_al:
        return

    # ---------- Step 1: Receipt (APPROVED) ----------
    receipt_id = _id()
    receipt = Receipt(
        id=receipt_id, lotNumber="LOT-2026-0050",
        supplierId=gat.id, materialId=pr_al.id,
        quantity=50.0, uom="MT",
        vehicleNumber="MH-12-CD-9001", poNumber="PO-2026-200",
        receiptDate=_iso(10, 4), status=ReceiptStatus.APPROVED,
        riskLevel=RiskLevel.LOW,
        assignedTo="Aditya Rao", createdAt=_iso(10, 4),
        createdBy="Rohit Sharma",
        notes="Export-grade Primary Aluminum — demo story chain for Hindalco.",
    )
    db.receipts[receipt_id] = receipt
    wf1 = workflow_engine.create_workflow("incoming-inspection", receipt_id)
    workflow_engine.complete_through(wf1, "release", "Priya Menon")
    db.workflows[receipt_id] = wf1

    smp = Sample(
        id=_id(), sampleId="SMP-2026-0050-A", receiptId=receipt_id,
        collectionDate=_iso(10, 3), collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
        notes="Composite from 5 sub-lots.",
    )
    db.samples[smp.id] = smp

    al_specs = {sp.parameter: sp for sp in pr_al.specifications}
    xrf_test = Test(
        id=_id(), sampleId=smp.id, code="XRF", name="XRF Chemistry",
        parameters=["Al", "Si", "Fe"], instrumentCode="XRF-01",
        status=TestStatus.COMPLETED, assignedAt=_iso(10, 2),
    )
    db.tests[xrf_test.id] = xrf_test
    rid_xrf = _id()
    db.results[rid_xrf] = Result(
        id=rid_xrf, testId=xrf_test.id, sampleId=smp.id,
        source=ResultSource.INSTRUMENT,
        values=[
            ResultValue(parameter="Al", value=99.72, unit="%",
                        specMin=al_specs["Al"].minValue,
                        specMax=al_specs["Al"].maxValue,
                        status=ResultStatus.PASS),
            ResultValue(parameter="Si", value=0.05, unit="%",
                        specMin=al_specs["Si"].minValue,
                        specMax=al_specs["Si"].maxValue,
                        status=ResultStatus.PASS),
            ResultValue(parameter="Fe", value=0.09, unit="%",
                        specMin=al_specs["Fe"].minValue,
                        specMax=al_specs["Fe"].maxValue,
                        status=ResultStatus.PASS),
        ],
        enteredBy="System (Panalytical XRF-01)", enteredAt=_iso(10, 2),
        instrumentCode="XRF-01", overallStatus=ResultStatus.PASS,
    )

    # ---------- Step 2: Qualification (RELEASED) ----------
    qual_id = _id()
    qual = Qualification(
        id=qual_id, qualificationNumber="PMQ-2026-001260",
        materialId=pr_al.id, batchNumber="PAL-2026-018",
        supplierId=gat.id, sourceLotNumber="LOT-2026-0050",
        consumptionArea=ConsumptionArea.CASTHOUSE,
        quantity=50.0, uom="MT",
        status=QualificationStatus.RELEASED, riskLevel=RiskLevel.LOW,
        assignedTo="Priya Menon",
        requestedAt=_iso(8, 6), requestedBy="Aditya Rao",
        notes="Casthouse qualification for export-grade ingot/billet pour.",
    )
    db.qualifications[qual_id] = qual
    wf2 = workflow_engine.create_workflow("process-material-qualification", qual_id)
    workflow_engine.complete_through(wf2, "release", "Priya Menon")
    db.workflows[qual_id] = wf2

    q_sample = QualificationSample(
        id=_id(), sampleId="PMQS-001260-A", qualificationId=qual_id,
        collectionDate=_iso(8, 5), collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
    )
    db.qualification_samples[q_sample.id] = q_sample

    q_test = QualificationTest(
        id=_id(), sampleId=q_sample.id,
        code="XRF", name="XRF Chemistry",
        parameters=["Al", "Si", "Fe"], instrumentCode="XRF-01",
        status=TestStatus.COMPLETED, assignedAt=_iso(8, 4),
    )
    db.qualification_tests[q_test.id] = q_test
    qrid = _id()
    db.qualification_results[qrid] = QualificationResult(
        id=qrid, testId=q_test.id, sampleId=q_sample.id,
        source=ResultSource.INSTRUMENT,
        values=[
            ResultValue(parameter="Al", value=99.74, unit="%",
                        specMin=99.5, specMax=99.95, status=ResultStatus.PASS),
            ResultValue(parameter="Si", value=0.04, unit="%",
                        specMin=0.0, specMax=0.1, status=ResultStatus.PASS),
            ResultValue(parameter="Fe", value=0.08, unit="%",
                        specMin=0.0, specMax=0.2, status=ResultStatus.PASS),
        ],
        enteredBy="System (Panalytical XRF-01)", enteredAt=_iso(8, 3),
        instrumentCode="XRF-01", overallStatus=ResultStatus.PASS,
    )

    # ---------- Step 3: Metal Batch (RELEASED) ----------
    mb_id = _id()
    mb = MetalBatch(
        id=mb_id, metalBatchNumber="MB-2026-001260",
        productGrade=ProductGrade.P1020, potline="PL-04", shift="A",
        productionDate=_iso(6, 6), weight=35.0, uom="MT",
        operator="Vikram Singh",
        status=MetalBatchStatus.RELEASED, riskLevel=RiskLevel.LOW,
        assignedTo="Priya Menon",
        sourceQualificationNumber="PMQ-2026-001260",
        createdAt=_iso(6, 6), createdBy="Vikram Singh",
        notes="Tap from PL-04 — released for billet casting.",
    )
    db.metal_batches[mb_id] = mb
    wf3 = workflow_engine.create_workflow("metal-quality-control", mb_id)
    workflow_engine.complete_through(wf3, "release", "Priya Menon")
    db.workflows[mb_id] = wf3

    m_sample = MetalSample(
        id=_id(), sampleId="MQS-001260-A", metalBatchId=mb_id,
        collectionDate=_iso(6, 5), collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
    )
    db.metal_samples[m_sample.id] = m_sample

    m_test = MetalTest(
        id=_id(), sampleId=m_sample.id,
        code="OES", name="OES Chemistry",
        parameters=["Si", "Fe", "Cu", "Mg", "Zn", "Ti", "Mn"],
        instrumentCode="OES-01",
        status=TestStatus.COMPLETED, assignedAt=_iso(6, 4),
    )
    db.metal_tests[m_test.id] = m_test
    mrid = _id()
    db.metal_results[mrid] = MetalResult(
        id=mrid, testId=m_test.id, sampleId=m_sample.id,
        source=ResultSource.INSTRUMENT,
        values=[
            ResultValue(parameter="Si", value=0.07, unit="%",
                        specMin=0.0, specMax=0.10, status=ResultStatus.PASS),
            ResultValue(parameter="Fe", value=0.13, unit="%",
                        specMin=0.0, specMax=0.20, status=ResultStatus.PASS),
            ResultValue(parameter="Cu", value=0.02, unit="%",
                        specMin=0.0, specMax=0.03, status=ResultStatus.PASS),
            ResultValue(parameter="Mg", value=0.01, unit="%",
                        specMin=0.0, specMax=0.03, status=ResultStatus.PASS),
            ResultValue(parameter="Zn", value=0.01, unit="%",
                        specMin=0.0, specMax=0.03, status=ResultStatus.PASS),
            ResultValue(parameter="Ti", value=0.01, unit="%",
                        specMin=0.0, specMax=0.03, status=ResultStatus.PASS),
            ResultValue(parameter="Mn", value=0.01, unit="%",
                        specMin=0.0, specMax=0.03, status=ResultStatus.PASS),
        ],
        enteredBy="System (Thermo OES-01)", enteredAt=_iso(6, 3),
        instrumentCode="OES-01", overallStatus=ResultStatus.PASS,
    )

    # ---------- Step 4: Product Batch (APPROVED) ----------
    pb_id = _id()
    pb = ProductBatch(
        id=pb_id, productBatchNumber="PB-2026-000225",
        productType=ProductType.PRIMARY_ALUMINUM_BILLET,
        weight=100.0, uom="MT",
        sourceMetalBatchNumber="MB-2026-001260",
        customer="Hindalco International",
        operator="Vikram Singh",
        productionDate=_iso(4, 6),
        status=ProductBatchStatus.APPROVED, riskLevel=RiskLevel.LOW,
        assignedTo="Priya Menon",
        createdAt=_iso(4, 6), createdBy="Vikram Singh",
        notes="Billet cast for Hindalco export shipment.",
    )
    db.product_batches[pb_id] = pb
    wf4 = workflow_engine.create_workflow("product-quality-testing", pb_id)
    workflow_engine.complete_through(wf4, "release", "Priya Menon")
    db.workflows[pb_id] = wf4

    p_sample = ProductSample(
        id=_id(), sampleId="PQS-000225-A", productBatchId=pb_id,
        collectionDate=_iso(4, 5), collectedBy="Sneha Iyer",
        status=SampleStatus.COLLECTED,
        notes="Billet sample drawn from cross-section.",
    )
    db.product_samples[p_sample.id] = p_sample

    billet_test_plan = [
        ("UTS", "Ultimate Tensile Strength", ["UTS", "YieldStrength", "Elongation"],
         "UTS-01", [("UTS", 178.0), ("YieldStrength", 76.0), ("Elongation", 12.5)]),
        ("HARDNESS", "Hardness", ["Hardness"], "HARD-01",
         [("Hardness", 56.0)]),
        ("CONDUCTIVITY", "Conductivity", ["Conductivity"], "COND-01",
         [("Conductivity", 59.5)]),
        ("DIMENSIONS", "Dimensions & Weight", ["Length", "Diameter", "Weight"],
         "DIM-01", [("Length", 1500.0), ("Diameter", 180.0), ("Weight", 100.0)]),
        ("METALLOGRAPHY", "Microstructure Review", ["GrainSize", "Phase"],
         "MICRO-01", [("GrainSize", 78.0), ("Phase", 96.4)]),
        ("VISUAL", "Visual Inspection", ["SurfaceDefects"], "VIS-INSP",
         [("SurfaceDefects", 1.0)]),
    ]
    for code, name, params, inst_code, vals in billet_test_plan:
        t = ProductTest(
            id=_id(), sampleId=p_sample.id,
            code=code, name=name, parameters=params,
            instrumentCode=inst_code,
            status=TestStatus.COMPLETED, assignedAt=_iso(4, 4),
        )
        db.product_tests[t.id] = t
        rvals = []
        overall = ResultStatus.PASS
        for p, v in vals:
            spec = product_fw.spec_for(ProductType.PRIMARY_ALUMINUM_BILLET, p)
            unit = product_fw.unit_for(p)
            if spec:
                lo, hi, _ = spec
                status_val = product_fw._status_for(v, lo, hi)
            else:
                lo, hi, status_val = None, None, ResultStatus.PASS
            if status_val == ResultStatus.FAIL:
                overall = ResultStatus.FAIL
            elif status_val == ResultStatus.WARNING and overall == ResultStatus.PASS:
                overall = ResultStatus.WARNING
            rvals.append(ResultValue(
                parameter=p, value=v, unit=unit or "",
                specMin=lo, specMax=hi, status=status_val,
            ))
        prid = _id()
        db.product_results[prid] = ProductResult(
            id=prid, testId=t.id, sampleId=p_sample.id,
            source=ResultSource.INSTRUMENT,
            values=rvals,
            enteredBy=f"System ({inst_code})",
            enteredAt=_iso(4, 3),
            instrumentCode=inst_code,
            overallStatus=overall,
        )

    # ---------- Step 5: Certificate (ISSUED + RELEASED) ----------
    specs: List[CustomerSpec] = []
    seen: set[str] = set()
    for r in db.presults_for_batch(pb_id):
        for v in r.values:
            if v.parameter in seen:
                continue
            seen.add(v.parameter)
            specs.append(CustomerSpec(
                parameter=v.parameter,
                unit=v.unit or "",
                requiredMin=v.specMin,
                requiredMax=v.specMax,
                actualValue=v.value,
                complianceStatus=v.status,
            ))
    cert_number = "COA-2026-001260"
    cert_id = _id()
    cert = Certificate(
        id=cert_id, certificateNumber=cert_number,
        productBatchNumber="PB-2026-000225", productBatchId=pb_id,
        customer="Hindalco International",
        customerSpecs=specs,
        status=CertificateStatus.ISSUED,
        dispatchStatus=DispatchStatus.RELEASED,
        issuedAt=_iso(2, 4), issuedBy="Priya Menon",
        createdAt=_iso(2, 6), createdBy="Aditya Rao",
        qrCodeValue=cert_number, barcodeValue=cert_number,
        notes="Issued and dispatched — full happy-path demo chain.",
    )
    db.certificates[cert_id] = cert

    # ---------- Audit + notification breadcrumbs ----------
    audit.record("Rohit Sharma", "Stores Executive", "create", "receipt",
                 receipt_id, None, receipt.model_dump())
    audit.record("Priya Menon", "QA Manager", "approve", "receipt",
                 receipt_id, None, receipt.model_dump())
    audit.record("Aditya Rao", "Process Engineer", "create", "qualification",
                 qual_id, None, qual.model_dump())
    audit.record("Priya Menon", "QA Manager", "release", "qualification",
                 qual_id, None, qual.model_dump())
    audit.record("Vikram Singh", "Casthouse Operator", "create", "metal-batch",
                 mb_id, None, mb.model_dump())
    audit.record("Priya Menon", "QA Manager", "release", "metal-batch",
                 mb_id, None, mb.model_dump())
    audit.record("Vikram Singh", "Production Operator", "create", "product-batch",
                 pb_id, None, pb.model_dump())
    audit.record("Priya Menon", "QA Manager", "approve", "product-batch",
                 pb_id, None, pb.model_dump())
    audit.record("Aditya Rao", "QA Engineer", "create", "certificate",
                 cert_id, None, cert.model_dump())
    audit.record("Priya Menon", "QA Manager", "issue", "certificate",
                 cert_id, None, {"issuedBy": "Priya Menon"})
    audit.record("Priya Menon", "QA Manager", "dispatch-release", "certificate",
                 cert_id, None, {"dispatchStatus": "Released"})

    notif.emit("Demo chain released for export",
               "End-to-end demo chain LOT-2026-0050 → COA-2026-001260 dispatched to Hindalco International.",
               entity_type="certificate", entity_id=cert_id)

