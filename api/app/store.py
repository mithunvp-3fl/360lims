"""In-memory store. Replaces a database in Phase 1.

Each entity type has a dict keyed by id. The shape mirrors what the SQLAlchemy
models would carry, so swapping to Postgres later is a structural change, not a
contract change.
"""
from __future__ import annotations
from typing import Dict, List

from app.schemas.supplier import Supplier
from app.schemas.material import Material
from app.schemas.receipt import Receipt
from app.schemas.sample import Sample
from app.schemas.test import Test
from app.schemas.result import Result
from app.schemas.approval import Approval
from app.schemas.workflow import Workflow
from app.schemas.instrument import Instrument
from app.schemas.qualification import (
    Qualification,
    QualificationSample,
    QualificationTest,
    QualificationResult,
    QualificationApproval,
)
from app.schemas.metal_batch import (
    MetalBatch,
    MetalSample,
    MetalTest,
    MetalResult,
    MetalApproval,
)
from app.schemas.product_batch import (
    ProductBatch,
    ProductSample,
    ProductTest,
    ProductResult,
    ProductApproval,
)
from app.schemas.certificate import Certificate


class Store:
    def __init__(self) -> None:
        self.suppliers: Dict[str, Supplier] = {}
        self.materials: Dict[str, Material] = {}
        self.receipts: Dict[str, Receipt] = {}
        self.samples: Dict[str, Sample] = {}
        self.tests: Dict[str, Test] = {}
        self.results: Dict[str, Result] = {}
        self.approvals: Dict[str, Approval] = {}
        self.workflows: Dict[str, Workflow] = {}  # keyed by entityId (receiptId or qualificationId)
        self.instruments: Dict[str, Instrument] = {}

        # Phase 2 — Process Material Qualification
        self.qualifications: Dict[str, Qualification] = {}
        self.qualification_samples: Dict[str, QualificationSample] = {}
        self.qualification_tests: Dict[str, QualificationTest] = {}
        self.qualification_results: Dict[str, QualificationResult] = {}
        self.qualification_approvals: Dict[str, QualificationApproval] = {}

        # Phase 3 — Metal Quality Control
        self.metal_batches: Dict[str, MetalBatch] = {}
        self.metal_samples: Dict[str, MetalSample] = {}
        self.metal_tests: Dict[str, MetalTest] = {}
        self.metal_results: Dict[str, MetalResult] = {}
        self.metal_approvals: Dict[str, MetalApproval] = {}

        # Phase 4 — Product Quality Testing
        self.product_batches: Dict[str, ProductBatch] = {}
        self.product_samples: Dict[str, ProductSample] = {}
        self.product_tests: Dict[str, ProductTest] = {}
        self.product_results: Dict[str, ProductResult] = {}
        self.product_approvals: Dict[str, ProductApproval] = {}

        # Phase 5 — Certificate & Dispatch
        self.certificates: Dict[str, Certificate] = {}

    def supplier_by_id(self, sid: str) -> Supplier | None:
        return self.suppliers.get(sid)

    def material_by_id(self, mid: str) -> Material | None:
        return self.materials.get(mid)

    def receipt_by_lot(self, lot: str) -> Receipt | None:
        for r in self.receipts.values():
            if r.lotNumber == lot:
                return r
        return None

    def samples_for_receipt(self, receipt_id: str) -> List[Sample]:
        return [s for s in self.samples.values() if s.receiptId == receipt_id]

    def tests_for_sample(self, sample_id: str) -> List[Test]:
        return [t for t in self.tests.values() if t.sampleId == sample_id]

    def tests_for_receipt(self, receipt_id: str) -> List[Test]:
        sample_ids = {s.id for s in self.samples_for_receipt(receipt_id)}
        return [t for t in self.tests.values() if t.sampleId in sample_ids]

    def results_for_test(self, test_id: str) -> List[Result]:
        return [r for r in self.results.values() if r.testId == test_id]

    def results_for_receipt(self, receipt_id: str) -> List[Result]:
        tests = self.tests_for_receipt(receipt_id)
        tid = {t.id for t in tests}
        return [r for r in self.results.values() if r.testId in tid]

    def approvals_for_receipt(self, receipt_id: str) -> List[Approval]:
        return [a for a in self.approvals.values() if a.receiptId == receipt_id]

    # --- Qualification helpers ---
    def qualification_by_number(self, number: str) -> Qualification | None:
        for q in self.qualifications.values():
            if q.qualificationNumber == number:
                return q
        return None

    def qsamples_for_qualification(self, qualification_id: str) -> List[QualificationSample]:
        return [s for s in self.qualification_samples.values() if s.qualificationId == qualification_id]

    def qtests_for_sample(self, sample_id: str) -> List[QualificationTest]:
        return [t for t in self.qualification_tests.values() if t.sampleId == sample_id]

    def qtests_for_qualification(self, qualification_id: str) -> List[QualificationTest]:
        sids = {s.id for s in self.qsamples_for_qualification(qualification_id)}
        return [t for t in self.qualification_tests.values() if t.sampleId in sids]

    def qresults_for_qualification(self, qualification_id: str) -> List[QualificationResult]:
        tids = {t.id for t in self.qtests_for_qualification(qualification_id)}
        return [r for r in self.qualification_results.values() if r.testId in tids]

    def qapprovals_for_qualification(self, qualification_id: str) -> List[QualificationApproval]:
        return [a for a in self.qualification_approvals.values() if a.qualificationId == qualification_id]

    # --- Metal Batch helpers ---
    def metal_batch_by_number(self, number: str) -> MetalBatch | None:
        for b in self.metal_batches.values():
            if b.metalBatchNumber == number:
                return b
        return None

    def msamples_for_batch(self, metal_batch_id: str) -> List[MetalSample]:
        return [s for s in self.metal_samples.values() if s.metalBatchId == metal_batch_id]

    def mtests_for_sample(self, sample_id: str) -> List[MetalTest]:
        return [t for t in self.metal_tests.values() if t.sampleId == sample_id]

    def mtests_for_batch(self, metal_batch_id: str) -> List[MetalTest]:
        sids = {s.id for s in self.msamples_for_batch(metal_batch_id)}
        return [t for t in self.metal_tests.values() if t.sampleId in sids]

    def mresults_for_batch(self, metal_batch_id: str) -> List[MetalResult]:
        tids = {t.id for t in self.mtests_for_batch(metal_batch_id)}
        return [r for r in self.metal_results.values() if r.testId in tids]

    def mapprovals_for_batch(self, metal_batch_id: str) -> List[MetalApproval]:
        return [a for a in self.metal_approvals.values() if a.metalBatchId == metal_batch_id]

    # --- Product Batch helpers ---
    def product_batch_by_number(self, number: str) -> ProductBatch | None:
        for b in self.product_batches.values():
            if b.productBatchNumber == number:
                return b
        return None

    def psamples_for_batch(self, product_batch_id: str) -> List[ProductSample]:
        return [s for s in self.product_samples.values() if s.productBatchId == product_batch_id]

    def ptests_for_sample(self, sample_id: str) -> List[ProductTest]:
        return [t for t in self.product_tests.values() if t.sampleId == sample_id]

    def ptests_for_batch(self, product_batch_id: str) -> List[ProductTest]:
        sids = {s.id for s in self.psamples_for_batch(product_batch_id)}
        return [t for t in self.product_tests.values() if t.sampleId in sids]

    def presults_for_batch(self, product_batch_id: str) -> List[ProductResult]:
        tids = {t.id for t in self.ptests_for_batch(product_batch_id)}
        return [r for r in self.product_results.values() if r.testId in tids]

    def papprovals_for_batch(self, product_batch_id: str) -> List[ProductApproval]:
        return [a for a in self.product_approvals.values() if a.productBatchId == product_batch_id]

    # --- Certificate helpers ---
    def certificate_by_number(self, number: str) -> Certificate | None:
        for c in self.certificates.values():
            if c.certificateNumber == number:
                return c
        return None


db = Store()
