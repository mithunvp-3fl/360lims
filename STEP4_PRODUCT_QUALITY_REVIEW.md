# Step 4 — Product Quality Testing: Pre-Implementation Review

You asked for an audit before any code changes. Step 4 is already substantially built (~92% per audit). Below is the deliverable in the structure you requested: gap analysis, reuse analysis, new components, data model changes, implementation plan. **No code will be written until you approve.**

---

## 0. Headline finding

Step 4 is **not greenfield** — it already has queue, workbench, header, overview, sample, test workspace, insights, lineage, lifecycle, approval, activity feed, audit drawer, full router, full seed, and an instrument-simulation flow. The work is **integration alignment**, not a build. The main real gaps are:

1. No **Task Engine** integration anywhere in the module (this is a platform-wide gap, but the spec explicitly demands it here).
2. Missing **View Lineage** queue action + a couple of small UI stubs (Edit button).
3. **Compliance score** is recomputed every read (no stored snapshot) — fine for demo, worth a note.
4. The seeded hero batch links to `MB-2026-001245`, **not** `MB-2026-000789` as the spec scenario states.
5. The workbench imports work via a **product-local** `ProductInstrumentFlow` instead of a shared `<InstrumentImportFlow>` (the canonical CLAUDE.md component name) — naming/reuse drift.

Everything else in the spec already exists.

---

## 1. Gap Analysis — Current vs Required

| Spec requirement | Current state | Gap | Severity |
|---|---|---|---|
| Queue: Product Batch / Type / Metal Batch / Status / Compliance / Created / Assigned / Actions | All columns present except **Metal Batch** and **Compliance Score** as dedicated columns | Add 2 columns | Low |
| Queue actions: Create, Open, Clone, Cancel, **View Lineage** | Has Create, Open, Clone, Cancel | **View Lineage** missing | Low |
| Workbench sections: Header / Lifecycle / Lineage / Overview / Samples / Tests / Insights / Activity / Approval / Audit / **Related Tasks** | All present except **Related Tasks** | Add Related Tasks panel | Med |
| Header: Batch / Type / Metal Batch / Weight / Status / **Product Compliance** | Has all except compliance score badge | Add compliance pill in header | Low |
| Lifecycle Progress — 5 stages | Implemented via `lifecycle-progress-panel.tsx` | None | — |
| Material Lineage — parent/current/child | Implemented via `material-lineage-panel.tsx` | None | — |
| Test types: Mechanical / Physical / Visual / Metallography | All 6 tests seeded (UTS, Hardness, Conductivity, Dimensions, Metallography, Visual) | None | — |
| Instrument simulation: Connecting → Reading → Validating → Successful (~5s) | Implemented in `ProductInstrumentFlow` (6-stage) | Reuse canonical `<InstrumentImportFlow>` name | Low |
| Quality Insights: compliance / risk / recommendation / observations / historical | `product_insights.py` + `ProductInsightsPanel` | None | — |
| Workflow Integration: 6 stages, transitions | Defined in `workflow_engine.py` and updated on approve | None | — |
| **Parallel execution** + dependencies | Tests can run in any order, but no **WAITING → blocking** semantics; QA Review is not formally blocked on test completion | Wire test tasks as `blockedBy` parents for the review task | Med |
| **Role-based tasks** (Production Eng / Lab Analyst / QA Eng / QA Mgr) | UI has `RoleGate`, but no tasks are created in `task_engine` on batch creation | Wire task creation into batch/sample/result/review lifecycle | **High** |
| **My Work integration** | `/work/*` router + queues exist, but Product Quality emits zero tasks | Same as above — emit tasks from `product_batches.py` mutations | **High** |
| Approval Center: Approve / Hold / Reject / Retest with reason | Implemented | None | — |
| Notifications | Emitted on every mutation | None | — |
| Activity Feed | Implemented (`ProductActivityFeed`) | None | — |
| Audit Trail | Every mutation recorded | None | — |
| Hero scenario: `PB-2026-000210` → `MB-2026-000789`, UTS 165 / Hardness 52 / Conductivity 61 / Score 97 | Hero exists but linked to `MB-2026-001245`; demo values are randomized within spec via `_mock_values_for()` | Either update spec to match seed, or update seed to match spec (recommend the latter — pin deterministic values) | Med |

---

## 2. Reuse Analysis — what we keep as-is

Everything below is reused **without modification**:

- `api/app/frameworks/workflow_engine.py` — Step 4 workflow already registered (6 stages).
- `api/app/frameworks/task_engine.py` — full surface ready (create / start / complete / blockedBy / decide_approval / my_work).
- `api/app/frameworks/lineage.py` — already resolves ProductBatch → MetalBatch parent and Certificate children.
- `api/app/frameworks/audit.py` — already called from every mutation in `product_batches.py`.
- `api/app/frameworks/notifications.py` — already emitted from every mutation.
- `api/app/frameworks/product_insights.py` — keep entirely.
- `api/app/routers/work.py` — no changes; we just feed it tasks.
- `web/src/components/genealogy/lifecycle-progress-panel.tsx` — keep.
- `web/src/components/genealogy/material-lineage-panel.tsx` — keep.
- All existing Product Quality components (`product-batch-header.tsx`, `product-batch-overview.tsx`, `product-sample-section.tsx`, `product-test-workspace.tsx`, `product-insights-panel.tsx`, `product-approval-center.tsx`, `product-activity-feed.tsx`, `product-audit-drawer.tsx`) — keep, with small additions noted in §3.
- `web/src/components/work/*` — reused for Related Tasks panel.

---

## 3. New Components / Additions

Strictly **enhancements**, no new modules.

**Frontend**
1. `web/src/components/product-quality/product-related-tasks-panel.tsx` — new panel reading `/work/tasks` filtered by `entityType=product-batch&entityId={batchId}`. Mirrors any existing tasks-by-entity component if one exists (otherwise small new component, ~80 LOC).
2. `web/src/components/product-quality/product-queue-lineage-action.tsx` — small dropdown item triggering a side drawer that renders `<MaterialLineagePanel />` for the row's batch. No new framework.
3. **Edit** small touches:
   - `product-batch-header.tsx`: add compliance score pill (use existing insights query result) + wire Edit button to existing PATCH endpoint.
   - `product-quality/page.tsx`: add Metal Batch + Compliance columns, add View Lineage dropdown item.

**Backend**
4. `api/app/routers/product_batches.py` — call `task_engine.create_task(...)` from:
   - `POST /product-batches` → Production Engineer task: "Request Testing"
   - `POST /product-batches/{n}/samples` → Lab Analyst tasks (one per test type, with `blockedBy=[]`)
   - `POST /product-results/*` (any source) → complete the matching test task
   - When all test tasks complete → create QA Engineer review task → on review complete → create QA Manager approval task
   - All tasks tagged `moduleKey="product-quality"`, `entityType="product-batch"`, `entityId=batch.id`, `recordKey=productBatchNumber`, `href="/product-quality/{number}"`
5. Optional: persist `complianceScore` on ProductBatch on every result write (so header / queue can render without a per-row insights round-trip). Pure additive field.

**Seed**
6. Pin `PB-2026-000210` deterministic values: UTS 165 MPa, Hardness 52 HB, Conductivity 61% IACS, compliance 97/100; link to `MB-2026-000789` (or update spec — pick one in §5).

**No new frameworks. No new pages. No new stores.**

---

## 4. Data Model Changes

Minimal and purely additive:

- `ProductBatch` schema (`api/app/schemas/product_batch.py`):
  - `complianceScore: Optional[int] = None` *(snapshot of latest insights computation; recomputed on every result write)*
  - No other changes.
- `Task` schema — **no change** (already supports `moduleKey`, `entityType`, `entityId`, `recordKey`, `blockedBy`, `assignedRole`).
- Store (`api/app/store.py`) — **no change** (tasks dict already exists).

No breaking changes. Existing API contracts unchanged.

---

## 5. Implementation Plan

Sequenced so each step is independently testable and the demo never breaks.

**Step A — Seed alignment (15 min)**
- Decide: align seed to spec hero (`MB-2026-000789`, UTS 165 / Hardness 52 / Cond 61 / score 97) or align spec to seed. Recommend updating seed to match spec for demo-script fidelity.
- Replace `_mock_values_for()` for `PB-2026-000210` only with deterministic anchor values.

**Step B — Task Engine integration in `product_batches.py` (1–1.5 hr)**
- Add `task_engine.create_task(...)` calls at: batch create, sample create, per-test, on result import (completes task), when all tests complete (creates review task), on approval decision.
- Use `blockedBy` to chain: review task `blockedBy = [test_task_ids]`; approval task `blockedBy = [review_task_id]`.
- Roles: `Production Engineer`, `Lab Analyst`, `QA Engineer`, `QA Manager`.
- Hook tests in via existing pytest setup.

**Step C — Persisted complianceScore (30 min)**
- Add field on schema, default `None`.
- After each `record_result` and on approval transitions, call `product_insights.compute()` once and stash `.complianceScore`.
- Header + queue column read this directly.

**Step D — Frontend additions (1.5–2 hr)**
- Queue: add Metal Batch column, Compliance column, View Lineage row action (opens drawer with `<MaterialLineagePanel />`).
- Workbench: add `<ProductRelatedTasksPanel />` in the right rail under Activity Feed.
- Header: add compliance pill; wire Edit button (open existing form dialog) — small.

**Step E — Demo walkthrough QA (30 min)**
- Open `PB-2026-000210`, verify: lineage shows MB-2026-000789 → PB-2026-000210, lifecycle highlights "Product Quality", insights renders 97, related tasks panel shows the review/approval task, approve flow emits notification + completes workflow.

**Estimated total: ~4–5 hours of focused work.** Zero refactors. Zero new frameworks. No risk of breaking other modules — every change is either additive (new fields, new task calls, new UI panel) or local to product-quality files.

---

## Waiting for approval

Reply with one of:
- **"Approved, proceed"** — I'll execute Steps A–E.
- **"Approved with changes: …"** — list what to adjust.
- **"Not yet, expand X"** — I'll go deeper on any section.

I will not start implementation until you confirm.
