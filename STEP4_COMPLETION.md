# Step 4 — Product Quality Testing: Implementation Completion Report

**Branch:** `main`
**Hero record:** `PB-2026-000210` → `MB-2026-000789`
**Status:** Production-ready for Phase 1 demo (in-memory store). See §C for the production readiness assessment.

---

## A. Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION (Next.js 14)                       │
│                                                                          │
│  /product-quality                  /product-quality/[productBatchNumber] │
│  ───────────────────               ──────────────────────────────────── │
│  Queue page                        Workbench page                        │
│   • Product Batch                   • ProductBatchHeader  ← compliance   │
│   • Product Type                       pill (97/100)                     │
│   • Metal Batch  (NEW)              • WorkflowTimeline                   │
│   • Status                          • GenealogyCard                      │
│   • Compliance  (NEW)               ┌─ Left col ─────────────────────┐   │
│   • Risk / Customer                 │ Overview                       │   │
│   • View lineage (NEW row action)   │ Sample management              │   │
│   • Clone / Cancel                  │ Test workspace (6 tests)       │   │
│                                     └────────────────────────────────┘   │
│                                     ┌─ Right rail (sticky) ──────────┐   │
│  Side drawer (NEW)                  │ Quality Insights (97/100)     │   │
│   • MaterialLineagePanel embedded   │ Lifecycle Progress (5 stages) │   │
│                                     │ Material Lineage              │   │
│                                     │ Related Tasks ← NEW reusable   │   │
│                                     │ Approval Center                │   │
│                                     │ Activity Feed                  │   │
│                                     └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  REST (Next React Query)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API (FastAPI)                               │
│                                                                          │
│  /api/v1/product-batches/*           /api/v1/work/*                       │
│   ├─ POST                       ┌──► /work/tasks?recordKey=... (NEW)     │
│   │   └─ emits Lab Analyst     │     /work/my, /team, /approvals…       │
│   │      "Collect sample" task ─┘                                        │
│   ├─ POST /samples                                                       │
│   │   └─ emits 6× Lab Analyst Testing tasks (PARALLEL)                   │
│   │   └─ emits QA Engineer Review task   blockedBy=[5 mandatory]         │
│   │   └─ emits QA Manager Approval task  blockedBy=[review]              │
│   ├─ POST /product-results/{instrument-import,manual,file-upload}        │
│   │   └─ completes matching Testing task                                 │
│   │   └─ refreshes batch.complianceScore  (snapshot)                     │
│   ├─ POST /approvals (Approve/Hold/Reject/Retest)                        │
│   │   └─ completes Review task                                           │
│   │   └─ decides Approval task                                           │
│   │   └─ refreshes batch.complianceScore                                 │
│   └─ GET /insights — recomputes + persists score                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM FRAMEWORKS                             │
│                       (consumed — none duplicated)                       │
│                                                                          │
│  workflow_engine     stage machine (batch→sample→testing→validation→     │
│                                      review→release)                     │
│  task_engine         create / start / complete / blockedBy / decide      │
│  lineage             implicit edges (sourceMetalBatchNumber)             │
│  product_insights    PRODUCT_SPECS, compute(), spec_for()                │
│  audit               record(actor, role, action, entity, prev, new)      │
│  notifications       emit(title, message, severity, entity)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        IN-MEMORY STORE (db)                              │
│                                                                          │
│  product_batches (+ complianceScore field, NEW)                          │
│  product_samples / product_tests / product_results / product_approvals   │
│  workflows / tasks / audit_logs / notifications / lineage_links          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Task-chain state machine (PB-2026-000210)

```
PRODUCTION ENGINEER          LAB ANALYST                 QA ENGINEER         QA MANAGER
─────────────────────        ──────────────────────      ──────────────      ─────────────
[Create Product Batch]
        │
        ▼  (audit only)
                        ┌─►  Collect product sample
                        │           │
                        │   POST /samples
                        │           │
                        │           ▼
                        │   ┌─────────────────────────────────┐
                        │   │   PARALLEL EXECUTION (6 tasks)  │
                        │   │                                 │
                        │   │   UTS         ◀── mandatory     │
                        │   │   Hardness    ◀── mandatory     │
                        │   │   Conductivity◀── mandatory     │
                        │   │   Metallography◀─ mandatory     │
                        │   │   Visual      ◀── mandatory     │
                        │   │   Dimensions  (non-blocking)    │
                        │   └─────────────────────────────────┘
                        │           │
                        │   POST /product-results/* (each test)
                        │           │
                        └───────────┘
                                    │  ALL 5 mandatory ✓
                                    ▼
                                         Review product compliance
                                                  │
                                         POST /work/tasks/{id}/complete
                                                  │
                                                  ▼
                                                          Approve product batch
                                                                   │
                                         POST /product-batches/{n}/approvals
                                                                   │
                                                                   ▼
                                                              [Approved / Hold /
                                                               Reject / Retest]
```

---

## B. Step 4 Completion Report

### B.1 Required behaviour matrix

| Requirement | Implementation | Verified |
|---|---|---|
| Material Lineage = lineage, not workflow | `MaterialLineagePanel` shows `Parents / Current / Children` with `ArrowUp`/`ArrowDown` only; lifecycle progression is rendered separately by `LifecycleProgressPanel` | API: `MB-2026-000789` → `PB-2026-000210` → `COA-2026-001245` |
| Reusable RelatedTasksPanel | `web/src/components/work/related-tasks-panel.tsx` — props `{ recordKey, moduleKey?, title?, limitPerGroup?, readonly? }`. Step 5 can drop it into the certificate workbench with one line. | Embedded in product-quality workbench |
| Role-based task chain (PE / LA / QA E / QA M) | Production Engineer audited on create; Lab Analyst owns sampling + 6 test tasks; QA Engineer owns review; QA Manager owns approval | Hero batch shows full chain; e2e create→sample→result→approval verified |
| Parallel test execution | 6 testing tasks emitted with `blockedBy=[]` between siblings; all start as `Assigned` simultaneously | Verified: 6 tasks Assigned after sample creation |
| QA Review blocked until mandatory tests done | Review task `blockedBy = [UTS, Hardness, Conductivity, Metallography, Visual]`; auto-unblocks on last completion via `_unblock_dependents` | Verified: review starts `Waiting`, flips to `Assigned` when 5 mandatory tasks complete |
| Compliance score in Queue / Header / Insights | `ProductBatch.complianceScore: Optional[int]` — snapshot from `product_insights.compute()`. Queue column, header pill, insights hero KPI all read same field | Hero displays `97/100` everywhere; recomputes deterministically across reads/mutations |
| Hero demo numbers | `PB-2026-000210` → `MB-2026-000789`, UTS 165, Hardness 52, Conductivity 61, Compliance 97 | API output confirmed |
| Reuse all frameworks | No new framework code. `workflow_engine`, `task_engine`, `lineage`, `audit`, `notifications`, `product_insights` all consumed unchanged (except one bug-fix — see §B.3). | — |

### B.2 Files changed

**Backend**
- `api/app/schemas/product_batch.py` — added `complianceScore: Optional[int]`
- `api/app/routers/product_batches.py` — 6 helper functions + 5 lifecycle hooks (sampling task emit, test/review/approval chain emit, test-task completion on result, review+approval completion on decide, compliance snapshot refresh); insight endpoint refactored to use shared `_compute_insight` helper
- `api/app/routers/work.py` — added `GET /work/tasks` filter endpoint (`entityType`, `entityId`, `recordKey`, `moduleKey`)
- `api/app/frameworks/task_engine.py` — fixed one bug: a task created with already-completed blockers now starts in `Assigned`, not `Waiting`
- `api/app/seed.py` — pinned hero source to `MB-2026-000789`, set hero `complianceScore=97`, backfilled sibling compliance scores, added Step 4 task chain seed
- `api/app/schemas/{metal_batch,task}.py` — comment-only example refresh (MB-2026-000789)

**Frontend**
- `web/src/components/work/related-tasks-panel.tsx` (NEW) — reusable panel, will be dropped into Step 5
- `web/src/lib/queries.ts` — `useTasksForEntity`, `useTasksForRecord` hooks
- `web/src/lib/types.ts` — `ProductBatch.complianceScore?: number | null`
- `web/src/app/product-quality/page.tsx` — Metal Batch column, Compliance column (`ComplianceCell` with tone-coded badge + bar), View Lineage row action, side `Sheet` drawer embedding `<MaterialLineagePanel/>`
- `web/src/app/product-quality/[productBatchNumber]/page.tsx` — `<RelatedTasksPanel/>` mounted in right rail
- `web/src/components/product-quality/product-batch-header.tsx` — compliance pill with tone tiering (≥90 success / ≥75 info / ≥60 warning / else danger)
- `web/src/components/shell/sidebar.tsx`, `web/src/app/traceability/page.tsx` — MB number references updated

### B.3 One incidental fix outside Step 4

`task_engine.create_task()` used to return `state=Waiting` whenever `blockedBy` was non-empty, even if every blocker was already complete. Reproducible only when a task is created *after* its blockers finish (e.g. seeding the hero in PENDING_REVIEW state, or rerunning a workflow against historical data). The fix filters `blockedBy` to only unresolved tasks at creation time. No call-sites needed updates.

### B.4 Verified end-to-end paths

```
1. CREATE   POST /api/v1/product-batches
            → 201 + Sampling task Assigned to Lab Analyst
2. SAMPLE   POST /api/v1/product-batches/{n}/samples
            → 6 Testing tasks Assigned (parallel)
            → Review task Waiting (blocked by 5 mandatory)
            → Approval task Waiting (blocked by Review)
3. IMPORT   POST /api/v1/product-results/instrument-import
            → Test task auto-completes
            → complianceScore snapshot refreshes
4. APPROVE  POST /api/v1/product-batches/{n}/approvals
            → status=Approved
            → Review task Completed
            → Approval task Completed with decision=Approve
            → workflow advanced to release stage
5. INSIGHT  GET  /api/v1/product-batches/PB-2026-000210/insights
            → productCompliance=97
            → recommendation=APPROVE PRODUCT
            → releaseReadiness=READY
6. LINEAGE  GET  /api/v1/traceability/product-batch/PB-2026-000210/lineage
            → parents: metal-batch MB-2026-000789
            → children: certificate COA-2026-001245
```

---

## C. Production Readiness Assessment

| Criterion | Status | Notes |
|---|---|---|
| **Demo-readiness** | ✅ READY | All hero numbers match the spec exactly; the workbench tells a coherent story end-to-end. |
| **Framework reuse** | ✅ CLEAN | Zero duplicate frameworks. `RelatedTasksPanel` is generic and ready for Step 5. |
| **Functional coverage** (Phase 1) | ✅ COMPLETE | Every checkbox in §B.1 verified. |
| **Schema stability** | ✅ STABLE | One additive field (`complianceScore?`). No breaking changes. Postgres migration when we move off in-memory store is a single `ALTER TABLE product_batches ADD COLUMN compliance_score INT NULL`. |
| **Test coverage** | ⚠️ MANUAL | End-to-end paths verified via `TestClient` smoke scripts in this session. **Recommended before Step 5:** convert §B.4 into `tests/test_product_batches.py` pytest cases. Existing modules (`metal_batches`, `qualifications`) appear to use the same pattern. |
| **Role enforcement** | ⚠️ UI-ONLY | `RoleGate` gates buttons; the API does not yet reject requests by role. This matches the current state of other modules. Phase 2 (auth) work, not Step 4. |
| **Persistence** | ⚠️ IN-MEMORY | Phase 1 constraint per `CLAUDE.md` — all state lost on restart. Production needs SQLAlchemy + Postgres + Alembic; the schema surface is stable for that swap. |
| **Frontend type safety** | ✅ ALIGNED | `ProductBatch.complianceScore?` mirrors backend `Optional[int]`. |
| **Real-time updates** | ⚠️ POLLING | Notifications poll at 30 s; production wants SSE/WebSocket. Matches platform-wide gap. |
| **Hardcoded actor** | ⚠️ `Current User` | Every mutation records actor as `"Current User"` until auth lands. Consistent with the rest of the codebase. |
| **Material lineage rendering** | ✅ LINEAGE, NOT WORKFLOW | `MaterialLineagePanel` exposes parents / current / children only; lifecycle progress is rendered by a separate panel. |
| **Parallel + blocked semantics** | ✅ ENFORCED | Sibling test tasks have no inter-dependencies; QA review and approval enforce the dependency chain. |

### Verdict

**Step 4 is production-ready for the Phase 1 (in-memory) demo and is the correct foundation for Step 5.**

Recommended (non-blocking) follow-ups before Step 5 lands:
1. Lift the §B.4 smoke checks into pytest under `api/tests/test_product_batches.py`.
2. Drop `<RelatedTasksPanel recordKey={...} moduleKey="certificates" />` into the certificate workbench when Step 5 begins — that single line is all the new module needs to consume the task framework.
3. When auth lands, harden role enforcement at the router layer (POST `/approvals` currently accepts any caller).

No work in §C is a blocker for moving on to Step 5.
