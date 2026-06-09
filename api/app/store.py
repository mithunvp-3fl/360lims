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


class Store:
    def __init__(self) -> None:
        self.suppliers: Dict[str, Supplier] = {}
        self.materials: Dict[str, Material] = {}
        self.receipts: Dict[str, Receipt] = {}
        self.samples: Dict[str, Sample] = {}
        self.tests: Dict[str, Test] = {}
        self.results: Dict[str, Result] = {}
        self.approvals: Dict[str, Approval] = {}
        self.workflows: Dict[str, Workflow] = {}  # keyed by entityId (receiptId)
        self.instruments: Dict[str, Instrument] = {}

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


db = Store()
