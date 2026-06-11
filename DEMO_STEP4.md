# Quality360 — Phase 4 Demo Script

End-to-end walkthrough of the **Product Quality Testing** module. Same format as `DEMO_STEP2.md`: every action says **what to click**, **where to look**, **which role to be in**, and gives a **1–2 line brief** so you can narrate.

**Estimated run time:** ~15 minutes for the full script, ~6 minutes for the lightning version (chapters 0, 1, 3, 5).

---

## How Phase 4 connects to Phase 3

Phase 3 (**Metal Quality Control**) answers a process question:

> "Can this **metal** be released for casting?"

Phase 4 (**Product Quality Testing**) answers a release question:

> "Can this **finished product** be approved for customer release?"

The same P1020 pour that came off Potline 03 in Phase 3 becomes the ingot we ship to a customer in Phase 4:

```
   Potline 03 ─┐                                   ┌─► Export Customer
              │  Step 3 — Metal Quality Control     │
              ▼  (MB-2026-001245, 24.5 MT P1020)    │  Step 4 — Product Quality Testing
   Metal Batch → Sample → Analysis → Validation →   →  (PB-2026-000210, Primary Aluminum Ingot)
              QA Review → Release (Released)       Product Batch → Sample → Testing →
                                                   Validation → QA Review → Approval
   Customer Certificate ◄───────────────────────────┘
```

The released metal batch `MB-2026-001245` is the **source metal batch** for the Phase 4 hero record (`PB-2026-000210`, 22.5 MT Primary Aluminum Ingot). The workbench links back to that metal batch with one click, and the genealogy card walks the full four-step chain: `RM → PMQ → MB → PB`.

**What's reused, not rebuilt:**

| Framework | Reused |
|---|---|
| Workbench shell | ✓ Same layout (header → timeline → genealogy → workspace → right rail) |
| Workflow engine | ✓ New definition `product-quality-testing` registered alongside the previous three |
| Audit trail | ✓ Same `audit.record(...)` — entity types `product-batch`, `product-sample`, `product-test`, `product-result` |
| Notification framework | ✓ Same `notif.emit(...)` — events surface in toasts + bell |
| Approval framework | ✓ Same pattern (decision + reason mandatory for Hold/Reject/Retest) |
| Quality Insights | ✓ Engine pattern reused; hero KPI swaps Metal Compliance → **Product Compliance** |
| Genealogy framework | ✓ Same `GenealogyCard`, just extended one node further (PB) |

**What's new (business logic only, per PRD §):**

- New entities — `ProductBatch`, `ProductSample`, `ProductTest`, `ProductResult`, `ProductApproval`
- New status set — `Pending Sampling → Pending Testing → Under Review → Approved / Rejected / On Hold / Retest / Cancelled` (Retest is the new one)
- New decision set — `Approve` / `Hold` / `Reject` / **`Retest`** — Retest preserves the sample, resets the tests, and routes back through the workflow
- New hero KPI — **Product Compliance (0–100)** with **Release Readiness** pill (READY / REVIEW / HOLD / NOT READY)
- New recommendation set — `APPROVE PRODUCT` / `HOLD PRODUCT` / `REJECT PRODUCT` / `RETEST PRODUCT` / `AWAITING DATA`
- Six test categories grouped into four families — Mechanical (UTS), Physical (Hardness, Conductivity, Dimensions & Weight), Metallography (Microstructure Review), Visual (Visual Inspection)
- New product types — Primary Aluminum Ingot, Primary Aluminum Billet

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Sign in as **Priya Menon** (QA Manager — unlocks every Phase 4 action). | You should land on `/dashboard`. |
| 0.5 | Pre-bookmark these tabs: `/metal-quality/MB-2026-001245`, `/product-quality`, `/product-quality/PB-2026-000210`. | Bell icon shows accumulated Phase 1–4 events. |

**Talking point:** "Step 4 is **Product Quality Testing** — the module that decides whether a finished ingot or billet can ship to a customer. Same workbench, same audit, same notifications as Steps 1, 2, 3. The new business logic turns mechanical, physical, metallography, and visual tests into a single Product Compliance score."

---

## Chapter 1 · The hand-off from Step 3 (Role: QA Manager)

> Goal: prove Phase 4 is a continuation of Phase 3, not a separate app.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 1.1 | Sidebar → **Metal Quality Control**. Open `/metal-quality/MB-2026-001245`. | Left rail, *Quality Operations* group. | "This is Step 3. Metal batch from Potline 03, status Released. Phase 3 said yes — this 24.5 MT of P1020 can go to the casthouse." |
| 1.2 | Scroll to the **Genealogy card** on the workbench. | Mid-page, below the header. | "Step 3 already shows the chain back to the raw lot and the qualification. We're going to push that chain one node further." |
| 1.3 | In the genealogy card, click the **Product Batch** node `PB-2026-000210` (downstream). | Card link → `/product-quality/PB-2026-000210`. | "Same pour, cast as a Primary Aluminum Ingot, now 22.5 MT in finished form." |
| 1.4 | Land on the Product Quality workbench. | Top-right pill should read **Under Review**. | "Workbench for the hero product batch. Same shell as Step 3 — header, timeline, genealogy, workspace, right rail." |
| 1.5 | Point at the **source chip** in the header. | Violet chip reading `← MB-2026-001245`. | "**This is the link back to Step 3.** Click takes you home. Closed loop." |

**Talking point:** "Step 3 said yes-from-process. Step 4 has to say yes-from-product. The metal was good. Does the ingot meet the customer specification?"

---

## Chapter 2 · The Product Batch Queue (Role: QA Manager)

> Goal: prove the queue covers every state and the four operator actions (Create / Open / Clone / Cancel).

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.1 | Sidebar → **Product Quality Testing** → land on `/product-quality`. | Queue titled *Product Quality Testing · Step 4*. | "Phase 4 queue. Every finished batch waiting on a release decision lives here." |
| 2.2 | Look at the **status pills** at the top of the table. | Pills: All · Pending Sampling · Pending Testing · Under Review · Approved · On Hold · Retest · Rejected. | "Eight status filters with counts. **Retest** is the new one — failed parameters can be re-run without losing the sample." |
| 2.3 | Look at the **product type chips** (top-right of the table). | Chips: All types · Ingot · Billet. | "Filter by product type. The mechanical specs are slightly different for billet vs ingot — same engine, different limits." |
| 2.4 | Click **Ingot**. | Chip turns violet. | "Six ingot batches in the view. The billet batches are filtered out." |
| 2.5 | Click **All types** to reset. Then click the **Any risk → Medium** chip. | Risk filter. | "Risk filter pulls amber-flagged batches to the top. `PB-2026-000206` is the on-hold one." |
| 2.6 | Click **All types** + **Any risk**. Use the **search box** — type "Export Customer". | Search box top-right. | "Customer search. Reduces the queue to anything shipping to a single buyer. Helpful for MTC bundling later." |
| 2.7 | Look at the **columns** — Product Batch · Product Type · Weight · Status · Risk · Customer · Created · Action. | Table header. | "Per PRD §8 layout. The source metal batch number appears as a `← MB-…` foot under the product batch number — Phase 3 lineage at a glance." |
| 2.8 | Click the **⋯ menu** on `PB-2026-000210`. | Drop-down. | "Two actions: Clone batch, Cancel. Clone is for repeat pours — same customer, same dimensions, saves form filling." |
| 2.9 | Close the menu. Click **`PB-2026-000210`**. | Product batch link. | "Lands on the workbench." |

---

## Chapter 3 · The Workbench, top to bottom (Role: QA Manager)

> Goal: show the marquee screen for Phase 4 — every step of a finished-product release on one workspace.

### 3.1 · Header

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.1.1 | Look at the header card. | Product batch number in 30px, *Primary Aluminum Ingot* badge, *Under Review* pill, *Low* risk pill, weight 22.5 MT, **violet source chip** `← MB-2026-001245`, customer chip *Export Customer*. | "Product batch, type, status, risk, weight, source metal batch, customer — everything readable from the back of the room." |
| 3.1.2 | Scan the mini-fields under the title. | *Production date*, *Operator* (Vikram Singh), *Assigned to* (Ravi Iyer). | "Operator who poured the ingot, QA engineer who owns the file. Provenance at the top." |
| 3.1.3 | Hover the **View history** button. | Outline button with a clock icon. | "Same audit drawer as Steps 1–3 — every mutation across the product batch, sample, tests, results is one click away." |

### 3.2 · Workflow Progress

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.2.1 | Look at the **Workflow progress** card. | Six dots: Product Batch → Sample → Product Testing → Validation → QA Review → Product Approval. Four green ✓, QA Review pulses. | "Same workflow primitive as Phase 1, 2, 3. New stage labels — `Product Batch`, `Product Testing`, `Product Approval`. Engine code is unchanged." |
| 3.2.2 | Point at the timestamps under each completed stage. | "by Arjun Patel · 4h ago" etc. | "Every transition records who and when. Pharma-grade audit." |

### 3.3 · Product Batch Overview

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.3.1 | Scroll into **Product batch overview**. | Three inset cards: *Production*, *Source metal batch*, *Customer*. | "Production metadata, source pour, destination customer. One workspace, no flipping." |
| 3.3.2 | Point at the **Source metal batch** card. | "MB-2026-001245" — clickable link. | "Click and you're back in the Phase 3 workbench. Same closed-loop pattern as Phase 1 ↔ Phase 2." |
| 3.3.3 | Point at the **Customer** card. | "Export Customer" + operator chip. | "Customer chip drives downstream MTC generation in Step 5." |

### 3.4 · Sample Section

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.4.1 | Scroll to **Product sample**. | One sample card: `PQS-000210-A`, Collected, by Sneha Iyer. | "Composite sample from the ingot mid-section. Same role gating as Phase 1 — Sampler and QA Manager can create or recollect." |
| 3.4.2 | Note the **Recollect** button. | Outline button, top-right of the card. | "If a result looks suspect, the Sampler can recollect — old sample discarded, workflow rolls back, all audited." |

### 3.5 · Test Workspace — grouped into four categories

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.5.1 | Look at the **Product test workspace**. | Four category headers: **Mechanical**, **Physical**, **Metallography**, **Visual**. | "**Six tests across four categories.** PRD §11 layout. Mechanical at the top, then Physical, Metallography, Visual." |
| 3.5.2 | Mechanical group. | One row: *Ultimate Tensile Strength* (UTS-01) — UTS, YieldStrength, Elongation. Green Compliant pill. | "One mechanical test, three parameters. UTS 165 MPa, YieldStrength 72 MPa, Elongation 14.5%. All in spec." |
| 3.5.3 | Physical group. | Three rows: *Hardness* (HARD-01), *Conductivity* (COND-01), *Dimensions & Weight* (DIM-01). | "Hardness 52 HB, Conductivity 61 %IACS, Dimensions 710 × 100 mm at 22.4 kg. Three instruments, three rows." |
| 3.5.4 | Metallography group. | One row: *Microstructure Review* (MICRO-01) — GrainSize, Phase. | "GrainSize 82 µm, Phase 96.8%. Captured from the optical microscope file output." |
| 3.5.5 | Visual group. | One row: *Visual Inspection* (VIS-INSP) — SurfaceDefects. | "Visual inspection, one count parameter. SurfaceDefects = 1 — within tolerance." |
| 3.5.6 | Look at each test row's action trio. | Three buttons per row — **Import** (violet), **Manual** (outline), **Upload** (ghost). | "Same three-way capture grammar as Phase 1–3. Instrument import for the bench, manual for offline labs, file upload for parsers." |
| 3.5.7 | Note the entry metadata row. | "Entered by System (UTS-01) · 1h ago" etc. | "Every result is signed by the originating instrument or person. Same provenance model as the rest of the platform." |

### 3.6 · Quality Insights — Product Compliance (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.6.1 | Look at the **Quality insights** panel on the right. | Glass card, violet tint, sparkle icon. | "Same panel as Steps 1–3 — but the **hero KPI is different**." |
| 3.6.2 | Point at the **Product Compliance** card at the top. | Large tabular `97` / 100, gauge icon, violet progress bar. | "**Product Compliance — 97 out of 100.** Phase 4 hero metric. Replaces Metal Compliance from Phase 3 because once the metal is released, the question is about the finished part, not the pour." |
| 3.6.3 | Point at the **Release Readiness** pill below the score. | Green pill: **READY**. | "Release Readiness is the secondary signal — READY / REVIEW / HOLD / NOT READY. READY means the test matrix is complete, compliance is high, no fail, no warning." |
| 3.6.4 | Point at the **Recommended action** card. | Green **APPROVE PRODUCT** pill + rationale string. | "**Recommendation: APPROVE PRODUCT.** Rationale: ‘All test parameters comply with Primary Aluminum Ingot specifications. Product is ready for certificate generation.' Same language discipline — no AI word." |
| 3.6.5 | Point at the Risk + Tests-completed tiles. | LOW risk, 6/6 tests. | "Two reads, two seconds." |
| 3.6.6 | Point at **Deviations**. | Count: 0. | "Deviations rolls fail + warning across every parameter. Zero means clean." |
| 3.6.7 | Point at **Key observations**. | "11 of 11 parameters within Primary Aluminum Ingot specification.", parameter-by-parameter lines, plus the roll-up. | "Generated, not canned. Engine writes one observation per parameter plus a roll-up. Business voice." |
| 3.6.8 | Point at **Parameter trends vs history**. | Table: UTS 165 (prev 166, –1), YieldStrength 72 (prev 70.5, +1.5), etc. | "Current vs historical average for the same product type. Drifts of more than 6% turn amber. Right now everything's well-within historical variance." |
| 3.6.9 | Point at **Recent batches**. | List: PB-2026-000209 (Approved, 94), PB-2026-000208 (Approved), PB-2026-000206 (On Hold, 58). | "Historical context. Last on-hold was minor elongation — the engine remembers." |

### 3.7 · Approval Center (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.7.1 | Point at the **Approval center** card below Quality Insights. | **Four big buttons**: green **Approve Product**, amber **Hold Product**, blue **Retest Product**, red **Reject Product**. | "**Four buttons** per PRD §15 — that's the new shape for Phase 4. Hold, Reject, and Retest all require a reason. Approve does not." |
| 3.7.2 | **Don't approve yet** — we'll do it in chapter 4 on a fresh batch to keep the demo state clean. | — | "We'll come back." |

### 3.8 · Genealogy card (4-step chain)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.8.1 | Scroll to the **Genealogy card**. | Card with four chained nodes: **RM → PMQ → MB → PB (current)**. | "Full lineage. Receipt of raw material, qualification for the process, metal batch from the pour, finished product batch. Click any node, jump to that workbench." |
| 3.8.2 | Hover the RM node. | Tooltip: `LOT-2026-0042 · Aluminum Scrap · Approved`. | "Click and you're back in Phase 1." |
| 3.8.3 | Hover the PMQ and MB nodes. | Tooltip: `PMQ-2026-001245 · Released` / `MB-2026-001245 · Released`. | "Same chip primitive everywhere. Genealogy framework is reused, not rewritten." |

### 3.9 · Activity feed + audit drawer

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.9.1 | Point at **Activity feed** (right rail, bottom). | Live pulsing pill, vertical event list. | "Server-pushed stream filtered to this product batch. Same component as Steps 1–3 — different entity type filters." |
| 3.9.2 | Click any event to open the **detail sheet**. | Side sheet opens with full meta — instrument, parameter list, overall status. | "Same detail drawer as Phase 1. The audit grammar is the platform's." |

---

## Chapter 4 · The full lifecycle on a fresh product batch (4 roles)

> Goal: prove the platform end-to-end by playing the parts of all four primary roles. Use `PB-2026-000299` (next number after creation) as the fresh batch.

### 4.1 · Production Operator (Stores Executive) — register a new product batch

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | **Switch role** | Topbar role chip → **Stores Executive**. | Chip text changes. | "Production Operator initiates product batches. In our role mapping that maps to Stores Executive — same person who books in raw materials books out finished product." |
| 4.1.2 | Stores Executive | Sidebar → **Product Quality Testing**. | Left rail. | — |
| 4.1.3 | Stores Executive | Click **+ New Product Batch** (top-right of the queue). | Primary button. | "Dialog opens. Only Stores Executive and QA Manager see this button — role gated." |
| 4.1.4 | Stores Executive | Fill the form: Product type = **Primary Aluminum Billet**, Source metal batch = **MB-2026-001244** (pick a Released batch from the dropdown), Weight = **100**, Customer = **Extrusion Co.**, Operator = **Suresh Babu**. | Two-column grid. | "**Source metal batch is the link back to Step 3** — the dropdown only shows Released metal batches. Notes optional." |
| 4.1.5 | Stores Executive | Click **Create product batch**. | Bottom-right. | "Toast: ‘Product batch created successfully'. Bell increments. We land on the new workbench — `PB-2026-000299`." |
| 4.1.6 | — | Look at the workflow timeline. | First circle (Product Batch) is green; Sample pulses. | "Workflow auto-advanced. The batch is now waiting on a sampler." |

### 4.2 · Sampler — draw the product sample

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar → **Sampler**. | The Approve/Hold/Reject/Retest buttons are now disabled with tooltips. | "Notice the gating. Sampler can create samples; cannot decide." |
| 4.2.2 | Sampler | Scroll to **Product sample**, click **Create Sample**. | Primary button. Briefly shows "Generating…" spinner. | "Sample ID `PQS-000299-A` is auto-generated. **Six tests** across four categories are auto-assigned by the workflow engine reading the billet spec — UTS, Hardness, Conductivity, Dimensions & Weight, Microstructure Review, Visual Inspection." |
| 4.2.3 | — | Note the workflow timeline. | Sample circle green; Product Testing pulses. | "Stage 2 of 6 complete." |

### 4.3 · Lab Analyst — capture results three ways across the four categories

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — | "Lab Analyst captures results. Cannot approve, hold, reject, or retest." |
| **Instrument import (Mechanical)** | | | | |
| 4.3.2 | Lab Analyst | On the **Mechanical → UTS** row, click **Import**. | Violet primary button. | "Triggering the Universal Testing Machine UTS-01." |
| 4.3.3 | — | Watch the 6-stage modal. | Connecting → Verifying → Reading → Parsing → Validating → Import Successful. Progress climbs 10 → 25 → 45 → 65 → 85 → 100% over ~5 seconds. | "**Same simulation as Phase 1–3, different instrument.** Per PRD §18 stages and percentages. Every stage is a real failure point in production." |
| 4.3.4 | — | Modal closes; the UTS row populates with three tiles: UTS, YieldStrength, Elongation — all in spec. | Toast: ‘Mechanical results imported'. | "Values are deterministic per (instrument, sample, test). In production these come from the device driver." |
| **Instrument import (Physical)** | | | | |
| 4.3.5 | Lab Analyst | On the **Physical → Conductivity** row, click **Import**. | One click. | "COND-01 — eddy-current conductivity meter. Same 6-stage flow." |
| **Manual entry (Visual)** | | | | |
| 4.3.6 | Lab Analyst | On the **Visual → Visual Inspection** row, click **Manual**. | Outline button. | "Visual is almost always manual — mandatory reason field per the result framework." |
| 4.3.7 | Lab Analyst | Reason: **Visual inspection by analyst**. SurfaceDefects = **1**. Click **Save entry**. | — | "Reason audited. The decision can always be traced back to who looked at the ingot." |
| **File upload (Metallography)** | | | | |
| 4.3.8 | Lab Analyst | On the **Metallography → Microstructure Review** row, click **Upload**. | Ghost button. | — |
| 4.3.9 | Lab Analyst | Drop any PDF or image into the drop zone. | 3-step parser: File uploaded → Extracting values → Validation complete. | "PDF, CSV, Excel, microscope export — same extraction grammar as Phase 1." |
| **Round out the matrix** | | | | |
| 4.3.10 | Lab Analyst | Repeat Import on **Hardness** (HARD-01) and **Dimensions & Weight** (DIM-01). | One click each. | "Four categories, six tests, three capture modes demonstrated. All on the same workspace." |
| 4.3.11 | — | All six tests show green Compliant pills. | Workflow: Validation pulses then completes; toast: ‘Product validation completed'. | "Last test completes, workflow advances to QA Review. Bell ticks over." |

### 4.4 · Product Compliance updates in real time

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.4.1 | Look at the **Quality insights** panel (right rail). | Product Compliance climbs as you import (60 → 78 → 91 → 97). | "The Product Compliance engine recomputes on every result. Watch the score climb." |
| 4.4.2 | Point at **Release Readiness**. | Pill flips from REVIEW → READY when the last test lands. | "Readiness is the secondary signal — flips to READY only when the matrix is full, compliance ≥ 90, and no fail/warning." |
| 4.4.3 | Point at the **Recommended action** card. | Flips to green **APPROVE PRODUCT** with rationale. | "Recommendation flipped. Rationale string is regenerated — it now reads ‘Product is ready for certificate generation'." |
| 4.4.4 | Point at the **Observations** bullets. | Updated count and per-parameter lines. | "Six observations, one per parameter, plus the roll-up. All generated from the data above." |

### 4.5 · QA Manager — approve the product

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.5.1 | **Switch role** | Role chip → **QA Manager**. | — | "Only QA Manager can approve or reject. QA Engineer can hold and retest." |
| 4.5.2 | QA Manager | Scroll to **Approval center**. Click **Approve Product**. | Big green button. | "Confirmation modal — ‘Product will be approved for customer release.' Reason optional on approve, mandatory on hold/reject/retest." |
| 4.5.3 | QA Manager | Click **Confirm approval**. | — | "Toast: ‘Product approved for release'. Bell increments. Workflow advances to Product Approval. The batch is now releasable for MTC generation." |
| 4.5.4 | — | Look at the workflow timeline. | All six circles green. | "Product Batch → Sample → Product Testing → Validation → QA Review → Product Approval. Full lifecycle in one workspace." |

### 4.6 · The audit pays off

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.6.1 | Click **View history** (top-right of header). | Side sheet opens. | "Read down the list: product batch created (Stores Executive), sample created (Sampler), four instrument imports + one manual + one file upload (Lab Analyst), validation completed (system), approve decision (QA Manager)." |
| 4.6.2 | Click **▸ View change** on any entry. | Field-level or parameter-level diff. | "Same auditor-ready diff as Phase 1. Aerospace, automotive, food — passes the regulator test." |
| 4.6.3 | — | Close the drawer. | — | "Every role's footprint is recorded. Every reason is preserved." |

### 4.7 · Bonus — what Retest does

| # | Action | What to call out |
|---|---|
| 4.7.1 | Mention briefly without clicking. | "If the lab analyst gets a borderline read and wants to re-run a parameter — say a UTS that came in at 142 MPa, just inside the lower bound — the QA engineer clicks **Retest Product**, picks a reason, and the workflow flips to Retest status. **Sample lineage is preserved**, the tests reset to Pending, and the lab can re-import without recreating the sample. That's the new state Phase 4 introduced." |

---

## Chapter 5 · The framework angle — same shell, fourth question (Role: any)

> Goal: 60-second close — why Phase 4 took weeks instead of months.

| # | Talking point | What to show |
|---|---|---|
| 5.1 | "The product workbench is the **metal workbench** with one section group swapped." | Toggle between `/metal-quality/MB-2026-001245` and `/product-quality/PB-2026-000210` — show the layout (header → timeline → genealogy → workspace → right rail) is identical. |
| 5.2 | "Workflow engine, audit, notifications — **registered, not rewritten**." | Optional: open `api/app/frameworks/workflow_engine.py` for 5 seconds — show `register(PRODUCT_QUALITY_TESTING)` as the fourth line below the first three modules. |
| 5.3 | "Quality Insights is a pattern, not a single panel — Phase 1 surfaces Supplier Health, Phase 2 surfaces Process Readiness, Phase 3 surfaces Metal Compliance, Phase 4 surfaces **Product Compliance** plus Release Readiness. Right-rail composition adapts; engine surface doesn't." | Sidebar → flip between the four workbenches, point at the right-rail KPI name change. |
| 5.4 | "Genealogy framework now walks **RM → PMQ → MB → PB** — four nodes, same component. Adding **MTC & Dispatch** (Step 5) is one more node." | Point at the Genealogy card on the Phase 4 workbench. |
| 5.5 | "Same audit drawer, same activity feed, same instrument simulation — proven on four modules now, ready for the next two." | Click the bell to show the cross-module notification stream. |

---

## Quick reference · Roles & permissions (Phase 4)

| Role | Can do | Cannot do |
|---|---|---|
| **Stores Executive** *(Production Operator)* | Create / edit / clone product batch | Sample, capture results, decide |
| **Sampler** | Create / recollect product samples | Create batch, capture results, decide |
| **Lab Analyst** | Capture product results (instrument / manual / upload) | Create batch, sample, decide |
| **QA Engineer** | Edit batch, **Hold**, **Retest** | Approve, Reject |
| **QA Manager** *(also Dispatch Executive)* | All actions + **Approve** + **Reject** + override | (super-role) |
| **Viewer** | Read only | Anything that mutates |

Permissions: `product-batch:create`, `product-batch:edit`, `product-batch:approve`, `product-batch:hold`, `product-batch:reject`, `product-batch:retest`.

> Phase 4 introduces no new `RoleKey` values. The PRD's *Production Engineer* maps to **`stores-executive`** (the operator who books finished product onto the floor) and *Dispatch Executive* maps to **`qa-manager`** (the role allowed to clear the batch for shipment). Every disabled button has a tooltip explaining *why* — hover any greyed-out button to demonstrate.

---

## Quick reference · Hero data (Phase 4)

- **Hero product batch:** `PB-2026-000210` — Primary Aluminum Ingot, 22.5 MT, customer **Export Customer**, operator **Vikram Singh**, sourced from **`MB-2026-001245`** (Phase 3 hero), assigned to Ravi Iyer, status **Under Review**.
- **PRD §19 demo numbers** (matched in seed):

| Parameter | Value | Unit |
|---|---|---|
| UTS | 165 | MPa |
| YieldStrength | 72 | MPa |
| Elongation | 14.5 | % |
| Hardness | 52 | HB |
| Conductivity | 61 | %IACS |
| Length | 710 | mm |
| Diameter | 100 | mm |
| Weight | 22.4 | kg |
| GrainSize | 82 | µm |
| Phase | 96.8 | % |
| SurfaceDefects | 1 | count |

- **Hero scores:** Product Compliance **97/100** (seeded engine value), Risk **Low**, Recommendation **APPROVE PRODUCT**, Release Readiness **READY**.
- **Sibling product batches** (for historical comparison + queue depth):

| Number | Type | Status | Customer | Notes |
|---|---|---|---|---|
| PB-2026-000209 | Primary Aluminum Ingot | Approved | Export Customer | Quality trend stable |
| PB-2026-000208 | Primary Aluminum Ingot | Approved | Domestic Client A | — |
| PB-2026-000207 | Primary Aluminum Billet | Approved | Extrusion Co. | — |
| PB-2026-000206 | Primary Aluminum Ingot | On Hold | Domestic Client B | Minor elongation deviation |
| PB-2026-000205 | Primary Aluminum Billet | Pending Testing | Extrusion Co. | — |
| PB-2026-000204 | Primary Aluminum Ingot | Pending Sampling | Export Customer | — |
| PB-2026-000203 | Primary Aluminum Ingot | Rejected | Domestic Client A | Elongation 6.5% below spec |

- **Phase 4 instruments:** **UTS-01** (Universal Testing Machine), **HARD-01** (Hardness Tester), **MICRO-01** (Optical Microscope), **COND-01** (Conductivity Meter), **DIM-01** (Dimensions & Weight Station), **VIS-INSP** (Visual Inspection bench).
- **Test categories:** Mechanical (UTS) · Physical (Hardness, Conductivity, Dimensions & Weight) · Metallography (Microstructure Review) · Visual (Visual Inspection).

---

## Quick reference · Reset between demos

The store is in-memory. **Restart the `uvicorn` process** (Ctrl+C in Window A, re-run `uvicorn app.main:app --reload --port 8000`) and Phase 1, 2, 3, and 4 seed data refresh together. The frontend reconnects automatically within ~4 seconds.

---

## Lightning version (6 minutes)

If you only have 6 minutes:

1. **The hand-off** (60s) — `/metal-quality/MB-2026-001245` (Released) → click the PB node in the genealogy card → `/product-quality/PB-2026-000210`. "Same pour, cast as an ingot, fourth question."
2. **Workbench tour** (90s) — header (source chip + customer chip), workflow timeline (Product Batch → Product Approval), right-rail walk-through focused on **Product Compliance 97/100** and the green **APPROVE PRODUCT** recommendation. Show the **Release Readiness READY** pill.
3. **Test Workspace at a glance** (45s) — point at the four category headers (Mechanical, Physical, Metallography, Visual), six tests, each row with Import / Manual / Upload trio.
4. **Instrument import on a fresh batch** (90s) — create `PB-2026-000299` (Primary Aluminum Billet, MB-2026-001244, Extrusion Co.), switch to Sampler → Create Sample, switch to Lab Analyst → Import UTS (narrate the 6-stage flow), watch Product Compliance climb.
5. **Approve** (45s) — switch to QA Manager → **Approve Product** → Confirm. Workflow finishes, toast: "Product approved for release".
6. **Framework close** (30s) — "Same workbench, fourth question. Genealogy now walks RM → PMQ → MB → PB. Step 5 — MTC & Dispatch — is one more node and one more workflow definition."
