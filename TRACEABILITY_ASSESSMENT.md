# Quality360 — Traceability & Genealogy Architecture Assessment

**Date:** 2026-06-11
**Scope:** read-only audit. No code changes were made.
**Method:** schema, store, router, framework, and UI inspection. File paths and line numbers are cited verbatim.

---

## TASK 1 — Implementation inventory

Genealogy-bearing entities live across `api/app/schemas/` and `api/app/store.py`. The platform has no junction tables and no consumption-record entity.

| # | Entity | File | Purpose | PK | Upstream link field | Downstream link field | Status |
|---|---|---|---|---|---|---|---|
| 1 | **Receipt** (Raw Material Lot) | `api/app/schemas/receipt.py:7` | Incoming material at the gate | `id` (uuid); business key `lotNumber` | none — chain root | none stored on entity | Implemented |
| 2 | **Sample** (receipt-scoped) | `api/app/schemas/sample.py:13` | Sample drawn against a receipt | `id`; business key `sampleId` | `receiptId` | none | Implemented |
| 3 | **Test / Result / Approval** (receipt-scoped) | `schemas/test.py`, `schemas/result.py`, `schemas/approval.py` | Sample → tests → results → decision | `id` | `sampleId` / `testId` / `receiptId` | none | Implemented |
| 4 | **Qualification** (Process Material Qualification) | `api/app/schemas/qualification.py:42` | "Yes-from-process" decision for a consumption area | `id`; business key `qualificationNumber` | **`sourceLotNumber: Optional[str]`** (free-text) | none stored on entity | Implemented |
| 5 | **QualificationSample / Test / Result / Approval** | `schemas/qualification.py:80,96,108,123` | Same quartet, qualification-scoped | `id` | `qualificationId` etc. | none | Implemented |
| 6 | **MetalBatch** (Metal Quality Control) | `api/app/schemas/metal_batch.py:42` | "Yes-from-casting" decision per heat | `id`; business key `metalBatchNumber` | **`sourceQualificationNumber: Optional[str]`** | none stored on entity | Implemented (link broken in live create — see Task 7) |
| 7 | **MetalSample / Test / Result / Approval** | `schemas/metal_batch.py:83-138` | Same quartet, metal-scoped | `id` | `metalBatchId` etc. | none | Implemented |
| 8 | **ProductBatch** (Product Quality Testing) | `api/app/schemas/product_batch.py:42` | "Yes-from-product" decision | `id`; business key `productBatchNumber` | **`sourceMetalBatchNumber: Optional[str]`** | none stored | Implemented |
| 9 | **ProductSample / Test / Result / Approval** | `schemas/product_batch.py:80-129` | Same quartet, product-scoped | `id` | `productBatchId` etc. | none | Implemented |
| 10 | **Certificate** | `api/app/schemas/certificate.py:57` | Customer-facing CoA + dispatch state | `id`; business key `certificateNumber` | **`productBatchNumber: str` (required)** + `productBatchId` | none | Implemented |
| 11 | **GenealogyNode / Link / Chain** (DTOs) | `api/app/schemas/genealogy.py:39,52,59` | Wire format for the chain walker — not stored | n/a | encoded on link | encoded on link | Implemented |
| 12 | **Supplier / Material / Instrument** (master data) | `schemas/supplier.py`, `material.py`, `instrument.py` | Reference catalogues | `id` | n/a | n/a | Implemented |
| 13 | **AuditLog / Notification / Workflow** | `schemas/audit.py`, `notification.py`, `workflow.py` | Cross-cutting frameworks | `id` (audit), `entityId` (workflow) | indirect via `entityType` + `entityId` | n/a | Implemented |

**Entities that are NOT implemented (relevant to the genealogy question):**

- No `MaterialConsumption` / `ChargeRecord` / `HeatCharge` entity (i.e. "this metal batch consumed X kg of lot Y").
- No `Blend` / `Mix` table to record many lots feeding one heat.
- No `Tap` / `Pour` entity to record multiple product batches sourced from the same heat.
- No `Shipment` / `DispatchLine` aggregating multiple certificates to one customer order.
- No junction tables. Every cross-step link is a single nullable string field on the downstream entity.

---

## TASK 2 — Database relationship analysis (actual implementation)

All relationships are encoded as nullable string fields on the downstream entity. There are no foreign-key constraints (in-memory store), no junction tables, and no multiplicity enforcement. Inferred cardinality below is **what the code allows**, contrasted with **what the walker assumes**.

| Hop | Field carrying the link | DB-level cardinality (what schemas allow) | What the walker assumes | What the UI enforces on create |
|---|---|---|---|---|
| **Receipt → Qualification** | `Qualification.sourceLotNumber: Optional[str]` (`qualification.py:48`) | One lot can be referenced by **many** qualifications. One qualification stores **one** lot. ⇒ **N qualifications : 1 lot** | One: walker breaks at first qualification whose `sourceLotNumber` matches (`genealogy.py:314-317`, `break` on first hit) | Free-text Input, no FK lookup, no validation (`create-qualification-dialog.tsx:188-193`) |
| **Qualification → MetalBatch** | `MetalBatch.sourceQualificationNumber: Optional[str]` (`metal_batch.py:55`) | **N metal batches : 1 qualification** | One: walker breaks at first match (`genealogy.py:319-322`) | **No UI field at all.** The dialog (`create-metal-batch-dialog.tsx:46-53`) has no source-qualification input. **The API router also drops it** — `create_metal_batch` builds the `MetalBatch(...)` constructor without `sourceQualificationNumber=body.sourceQualificationNumber` (`metal_batches.py:196-211`). Link only present in **seed data** (`seed.py:857, 1618`). |
| **MetalBatch → ProductBatch** | `ProductBatch.sourceMetalBatchNumber: Optional[str]` (`product_batch.py:48`) | **N product batches : 1 metal batch** | One: walker breaks at first match (`genealogy.py:324-329`) | Select dropdown filtered to `status="Released"` metal batches (`create-product-batch-dialog.tsx:46-50, 138-160`). Router persists it (`product_batches.py:215`). |
| **ProductBatch → Certificate** | `Certificate.productBatchNumber: str` (required), `productBatchId: str` (`certificate.py:60-61`) | **N certificates : 1 product batch** (a product batch can be re-certified for different customers). One certificate references one product batch. | One: walker breaks at first match (`genealogy.py:330-334`) | Select dropdown filtered to `status="Approved"` product batches (`generate-certificate-dialog.tsx:37-41`); validated server-side (`certificates.py:209-211`). |

**Summary of true cardinality vs assumed cardinality:**

```
Receipt        ─┐
                │ schema allows N:1 upstream (many children share one parent)
Qualification  ─┤ walker treats as 1:1 (breaks at first downstream child)
MetalBatch     ─┤ UI never collects the link at most levels (only PB→Cert is enforced)
ProductBatch   ─┘
Certificate
```

**Implication.** The wire DTO (`GenealogyChain.nodes: List[GenealogyNode]`, `genealogy.py:66`) is a **flat list**, not a graph. It cannot represent splits or merges even if the data supported them — the type does not have a "children" or "parents" field, only ordered nodes connected by edge-pair links (`genealogy.py:362-368`, simple zip over adjacent nodes).

---

## TASK 3 — Traceability Center review

**File:** `web/src/app/traceability/page.tsx` (408 lines).
**Backed by:** `api/app/routers/traceability.py` → `api/app/frameworks/genealogy.py`.

### Current UI components

| Component | Source | Role |
|---|---|---|
| `PageHeader` | `traceability/page.tsx:156` | Title + "Framework · Phase 4" badge |
| `DashboardStrip` | `traceability/page.tsx:176` | 6 KPIs: Active Lots, In Testing, Awaiting Approval, Released, Certificates, Coverage % |
| Search panel + `SearchHitRow` | `traceability/page.tsx:79-134, 234` | Single text-input substring search across all entity keys |
| `GenealogyCard` | `components/genealogy/genealogy-card.tsx:57` | Horizontal `LOT → PMQ → MB → PB → COA` chain strip |
| `TraceabilityTimelineCard` | `traceability/page.tsx:346` | Reverse-chronological event list, last 40 |
| `CurrentSelectionCard` | `traceability/page.tsx:268` | Selected node + workbench link |
| `HowItWorksCard` | `traceability/page.tsx:309` | Static explainer |

### Current data sources

- `GET /traceability/dashboard` → `genealogy.dashboard()` (`genealogy.py:583`).
- `GET /traceability/search?q=...` → `genealogy.search()` (`genealogy.py:491`). Pure substring over `lotNumber`, `poNumber`, `vehicleNumber`, `qualificationNumber`, `batchNumber`, `metalBatchNumber`, `potline`, `productBatchNumber`, `customer`, `productType`, `certificateNumber`, plus `sampleId`. No fielded search.
- `GET /traceability/{node_type}/{node_key}` → `genealogy.build_chain()` (`genealogy.py:338`).
- `GET /traceability/{node_type}/{node_key}/journey` → `genealogy.build_journey()` (`genealogy.py:398`).

### Current relationship logic

`build_chain` (`genealogy.py:338-376`) calls `_walk_backwards` (`273-306`) then `_walk_forwards` (`309-335`), concatenates, dedupes, and emits:

- A flat list of up to **5** nodes (one per `NodeType` — `RAW_MATERIAL`, `PROCESS_QUALIFICATION`, `METAL_BATCH`, `PRODUCT_BATCH`, `CERTIFICATE`).
- Links between **successive nodes only** (`genealogy.py:362-368`), labelled `"produced"`.
- Forward walk **stops at the first matching child** at every hop (`genealogy.py:316, 322, 328, 333` — explicit `break`).

`coverage = len({n.nodeType for n in nodes})` (`genealogy.py:369`) — i.e. **count of distinct step types**, capped at 5.

### Current assumptions baked in

1. **One chain per node.** No representation for "this lot fed two qualifications."
2. **One child per hop.** Even when more children exist in the store, only the first one is followed.
3. **Linear five-step pipeline.** `_STEP_LABELS` (`genealogy.py:100-106`) hard-codes a 5-slot timeline; `NodeType` enum (`schemas/genealogy.py:15-20`) has exactly 5 values.
4. **Step ordering is fixed.** Backward walk hard-codes the chain Receipt ← Qualification ← MetalBatch ← ProductBatch ← Certificate.

### Current limitations

- No ability to render a graph (splits/merges) — DTO is `List[GenealogyNode]`.
- Search is global substring, no scoped filter (`by customer`, `by supplier`, `by period`).
- Coverage % on the dashboard is "lots with chain ≥ 4 distinct step types divided by total receipts" (`genealogy.py:615-621`) but the strip label says "Lots with chain ≥ 2 steps" (`traceability/page.tsx:228`). **Inconsistency between API and UI label.**
- The dashboard view summary in `genealogy.dashboard()` mixes counts across modules (`in_testing` adds receipts+qualifications+metal+product batches) — useful as a workload roll-up, but each batch is **counted independently**, not as a connected chain.

### Does Traceability Center represent Lifecycle, Genealogy, or both?

**Both, conflated.** The Genealogy Card UI looks like a genealogy graph but renders a lifecycle progression — one node per fixed step. The Quality Event Timeline below it is genuine chronological lifecycle data (audit events). There is no view that exposes the difference, and the architecture cannot show siblings or alternate paths.

---

## TASK 4 — Quality Journey component review

Two distinct components carry the "Quality Journey" name:

### 4a. `GenealogyCard` — titled "Quality Journey" (horizontal chain)

**File:** `web/src/components/genealogy/genealogy-card.tsx`.
**Renders:** `GET /traceability/{type}/{key}` → flat node list as horizontal scrolling pills with `ChevronRight` between them (`genealogy-card.tsx:83-99`).
**Used on:** every workbench (inspection, qualification, metal-quality, product-quality) and the Traceability Center.
**Title in UI:** `"Quality Journey"` with subtitle `"End-to-end traceability across the production lifecycle"` (`genealogy-card.tsx:62-64`).

### 4b. `QualityJourneyPanel` — vertical 5-step strip

**File:** `web/src/components/genealogy/quality-journey-panel.tsx`.
**Renders:** `GET /traceability/{type}/{key}/journey` → vertical 5-row list (always 5 rows, regardless of data); each row shows step status `Complete | In Progress | Blocked | Pending | Skipped` (`quality-journey-panel.tsx:96-134`).
**Used on:** workbench right-rail (every module).
**Title in UI:** `"Quality Journey"` with subtitle `"5-step progress · supplier → certificate"` (`quality-journey-panel.tsx:34-35`).

### 4c. `GenealogyExpandedView` — vertical version used on certificate workbench

**File:** `web/src/components/certificates/genealogy-expanded-view.tsx`.
**Renders:** same `build_chain` data as `GenealogyCard`, but stacked vertically with `ChevronDown` between nodes (`genealogy-expanded-view.tsx:61-69, 130-135`). Titled `"Quality genealogy"`.

### Purpose / Data Source / Rendering / Model

| | GenealogyCard | QualityJourneyPanel | GenealogyExpandedView |
|---|---|---|---|
| Purpose | Show where the current node sits in the LOT→COA chain | Show 5-step completion checklist | Show certificate's full lineage stacked |
| Data source | `useGenealogyChain` → `build_chain` | `useJourneyTimeline` → `build_journey` (includes events) | `useGenealogyChain` → `build_chain` |
| Model | Linear node list with adjacency links | Fixed 5-slot status array | Linear node list, vertical |
| Rendering | Horizontal pills | Vertical step rows with status badges | Vertical stacked cards |

### Is it workflow progression, genealogy, or hybrid?

**Hybrid — and that is the source of the user's concern.** The DTO it consumes is genealogy-shaped (`GenealogyNode` + `GenealogyLink`), but the UI presents it as a linear workflow progression. Both interpretations are correct for the demo dataset (which is one chain per lot), but they collapse the moment you have:

- Two qualifications spawned from one delivery,
- Two metal batches cast from one qualified charge,
- Two product batches tapped from one heat, or
- Two certificates issued from one product batch for two customers.

Because the schema only stores the upstream link (not a list of downstream children), and because `_walk_forwards` calls `break` after the first match, the second sibling becomes invisible in the chain view (it would still appear in search).

---

## TASK 5 — Genealogy capability review

| Capability | Status | Evidence |
|---|---|---|
| **Forward Traceability** (root → certificate) | **Partially Implemented** | `_walk_forwards` (`genealogy.py:309-335`) walks the chain but only follows the first child at each hop. Multiple children exist in the data model but are invisible to the chain view. |
| **Backward Traceability** (certificate → root) | **Implemented** | `_walk_backwards` (`genealogy.py:273-306`) follows the single `source*Number` pointer on each entity. Each entity has at most one parent by schema, so backward walk is complete. |
| **Split Relationships** (one upstream → many downstream) | **Not Implemented** | DTO is `List[GenealogyNode]` (`schemas/genealogy.py:66`), no children field. Walker breaks on first child. |
| **Merge Relationships** (many upstream → one downstream) | **Not Implemented** | Each downstream entity carries a single `Optional[str]` source field. No list of sources, no junction table. A heat physically blended from two qualified charges cannot be recorded. |
| **Multiple Parents** | **Not Implemented** | Same as merge — schemas only support one parent reference per entity. |
| **Multiple Children** | **Partially Implemented** | Children exist in storage and can be found by scanning (`for q in db.qualifications.values(): if q.sourceLotNumber == start_key`), but the chain DTO only carries one. |
| **Cross-Step References** (e.g. lot → metal-batch directly, skipping qualification) | **Not Implemented** | Each step's backward link only points one step up. No "ancestor" or "lineage" field. |
| **Consumption Tracking** (how many kg of lot X went into batch Y) | **Not Implemented** | No consumption entity. `Qualification.quantity` and `MetalBatch.weight` are independent floats; no record ties them. |
| **Certificate Traceback** | **Implemented** | `_chain_for_certificate` (`api/app/routers/certificates.py:128-150`) walks `pb.sourceMetalBatchNumber → mb.sourceQualificationNumber → q.sourceLotNumber`. Used by `QualityResultsSummary` and `GenealogyExpandedView`. |

---

## TASK 6 — Realism assessment

**Verdict: Potentially Misleading.** A metallurgy/QA SME would interpret the current Genealogy Card and Quality Journey as an assertion that the chain is 1:1 at every hop — i.e. one delivery becomes one qualified charge becomes one heat becomes one product batch becomes one certificate.

### Why this is wrong against manufacturing reality

| Hop | Real-world cardinality | Current model |
|---|---|---|
| Receipt → Qualification | A consumption-area qualification typically draws from **multiple deliveries** of the same material (blended into a campaign). One delivery may not be qualified at all (rejected); or may feed two consumption areas (Casthouse + Carbon Plant). | Single optional `sourceLotNumber` string on qualification. |
| Qualification → MetalBatch | A heat charge is typically a **blend of qualified materials** (primary aluminum + scrap + alloying additions). Even a single-material heat is rarely tied to one qualification batch number; the charge is built from the storage bin, which itself is replenished by many qualifications. | Single optional `sourceQualificationNumber` per heat — *and not even persisted in the live create flow*, see Task 7. |
| MetalBatch → ProductBatch | A casthouse routinely **taps one heat into multiple product batches** (e.g. ingots stacked across two pours, or billet plus ingot from the same crucible). Conversely, large product batches may be a remelt blend of several heats. | Single optional `sourceMetalBatchNumber`. Only the "one heat → many products" case is even partially correct (the heat can appear as a source on multiple PBs); the "many heats → one product" case is unmodelable. |
| ProductBatch → Certificate | One product batch is **commonly certified to multiple customers** with different spec overlays (one PB → COAs for Hindalco Domestic, Hindalco Export, third-party trader). | Modelable: the schema allows N certificates per PB. The Genealogy Card just won't show the siblings. |

### What the UI implies vs what is true

- **Implies:** "This is the *only* qualification this lot fed, the *only* heat that qualification produced, the *only* product batch that heat became, the *only* certificate that product was certified for."
- **True (in the data model):** Schema permits many of those siblings, but the walker, the DTO, and the UI all collapse to the first one found.

### Where the model is honest

- Per-step lifecycle (Workflow timeline inside each workbench) is accurate — the 6-stage receipt/qualification/metal/product workflows are well-modelled.
- Audit log + Quality Event Timeline are accurate — those are entity-scoped, not lineage claims.
- `QualityResultsSummary` (`components/certificates/quality-results-summary.tsx`) presents compliance per step without implying exclusive chain. It would survive a genealogy redesign with minimal changes.

---

## TASK 7 — Step 2 → Step 3 relationship review

### Findings

| Aspect | Status |
|---|---|
| **Schema-level link** | Exists. `MetalBatch.sourceQualificationNumber: Optional[str]` (`api/app/schemas/metal_batch.py:55`). Marked in the comment as "Step 2 → Step 3 genealogy link". |
| **API contract** | Exists. `MetalBatchCreate.sourceQualificationNumber: Optional[str]` (`metal_batch.py:68`). |
| **API router behaviour** | **Broken.** `create_metal_batch` (`api/app/routers/metal_batches.py:193-225`) constructs the `MetalBatch(...)` object **without passing `sourceQualificationNumber=body.sourceQualificationNumber`** — the field is silently dropped. Compare to `create_product_batch` (`product_batches.py:206-225`), which correctly sets `sourceMetalBatchNumber=body.sourceMetalBatchNumber`. |
| **Frontend create UI** | Field is **not exposed** anywhere. `web/src/components/metal-quality/create-metal-batch-dialog.tsx:46-53` has no source-qualification input; the form state has only `productGrade`, `potline`, `weight`, `shift`, `operator`, `notes`. |
| **Demo script claim** | `DEMO_FRESH_CHAIN.md:216` instructs the user to type "Source qualification = `PMQ-2026-XXXXXX`" in the dialog. **There is no such field in the dialog** — this step is undemonstrable on a live-created chain. |
| **Where the link IS set** | **Only in seed data** — `api/app/seed.py:857` and `seed.py:1618` hard-code `sourceQualificationNumber="PMQ-2026-001245"` / `"PMQ-2026-001260"`. |
| **Walker dependence** | `_walk_backwards` (`genealogy.py:293-298`) and `_walk_forwards` (`genealogy.py:319-323`) both rely on this field. For any user-created metal batch, the genealogy chain renders as **only 3 nodes** (Metal Batch → Product Batch → Certificate) at best — never connecting back to Step 1 or Step 2. |

### Classification

A **soft, optional, currently-broken relationship.**

- **Soft** because the schema makes it `Optional[str]` with no validation that the qualification number exists.
- **Optional** because nothing in the workflow blocks releasing a metal batch with no upstream pointer.
- **Currently broken** because the live create flow does not propagate it. Only seeded chains have it set.

### Recommendations (no code change yet)

1. **Decide what the relationship represents** before fixing it. Two options:
   - **Single-source link** (current shape): retains the optional pointer, intended for the case where a heat is traceably tied to one qualification campaign. Honest if marked "Charge source (representative)". Easy to fix — wire the field through the router and add it to the dialog.
   - **Multi-source consumption** (richer shape): introduce a `MaterialConsumption` / `ChargeRecord` entity (Option C below). Necessary if Vedanta needs to model blended heats with quantities.
2. **In either case, fix the dropped field in the router** (`metal_batches.py:196-211`) so demos and customer trials can produce real chains. Add the field to `create-metal-batch-dialog.tsx`.
3. **Update the demo script** (`DEMO_FRESH_CHAIN.md:216`) to match whichever flow is chosen — today it asks for input the UI does not accept.

---

## TASK 8 — Future-state options

### Option A — Keep current model

Single nullable upstream string per entity. Walker follows one parent and one child per hop.

**Advantages**
- Zero schema migration. Walker, DTOs, and UI all stay.
- Easiest demo: one chain, one story.
- Matches what most enterprise LIMS surface to customers on a CoA.

**Disadvantages**
- Misrepresents real metallurgy when explained to a domain expert.
- Cannot model blended charges, multi-customer certification, or shared heats.
- Hides siblings the data model already permits.
- The Step 2 → Step 3 bug (Task 7) must still be fixed regardless.

**Implementation effort**: **Low.** Fix the dropped field in `metal_batches.py`, add the dialog input, update the demo. ~0.5 day.

---

### Option B — Separate Lifecycle Progress from Genealogy (UI/contract split, same storage)

Keep the storage shape, but stop calling lifecycle "genealogy." Render two distinct views:

- **Quality Journey panel** (right rail) = 5-step lifecycle checklist for the current entity only. Title stays "Quality Journey." Same look as today.
- **Genealogy Card** → renamed **"Material Lineage"** and changes shape: expose downstream **siblings** by querying for all children at each hop (the data is already in the store), even though the chain DTO must change to a tree.

Walker change: stop calling `break` on first child; return `List[children]` and let the UI render branches.

DTO change: `GenealogyChain.nodes` becomes a tree (`GenealogyNode` gains `children: List[GenealogyNode]`).

**Advantages**
- No new entities; no migration.
- Already-stored siblings become visible (multiple qualifications per lot, multiple metal batches per qualification, etc.).
- Truthful about cardinality without claiming Vedanta-grade consumption tracking.
- Fixes the conceptual conflation (lifecycle ≠ lineage).

**Disadvantages**
- Cannot model **blended** upstream (many-to-one). Heats with two qualified charges still look single-source.
- UI churn on every workbench that uses `GenealogyCard` (5 workbenches + traceability center).
- API contract change — frontends, demo, and tests must follow.

**Implementation effort**: **Medium.** ~2-3 days. DTO + walker + 3 UI components + demo script.

---

### Option C — Introduce Material Consumption layer (recommended, see Task 10)

Insert a new entity between qualification and metal batch, and (optionally) between metal batch and product batch.

```
Raw Material (Receipt)
    ↓  ← Sampling/testing (Step 1)
Process Qualification
    ↓  ← Consumption record (charge sheet): qty consumed × source qualification
Material Consumption (NEW)
    ↓
Metal Batch
    ↓  ← Tap record: qty tapped × source metal batch
Product Batch  (optional second consumption layer for blended remelts)
    ↓
Certificate
```

**Schema sketch (no code):**

```
ChargeRecord {
  id, chargeNumber, metalBatchId,
  sourceQualificationNumber, sourceLotNumber (denormalized for fast lookup),
  consumedQuantity, uom, chargedAt, chargedBy
}
```

A metal batch then has **N** ChargeRecords (junction table), not one upstream pointer. The walker becomes a real graph traversal.

**Advantages**
- Models **blended heats** (many qualified charges → one metal batch).
- Models **kg-level consumption** (the field-control metric Vedanta operates by).
- Genealogy queries become real provenance queries — "which deliveries are in this billet?" returns a list.
- Aligns with how MES/ERP systems (SAP PP-PI, Aveva, Honeywell MES) record material flow.
- Audit log naturally extends: a charge event is a first-class audit entity.
- Step 2 → Step 3 hard-broken state goes away — the consumption record IS the relationship.

**Disadvantages**
- Schema migration: new entity + junction handling on metal batch creation flow.
- Walker must become a graph (forward and backward fan-out).
- UI work: `MaterialLineage` view must handle splits/merges; `Charge Sheet` workbench section must be added to the Metal Batch workbench.
- Demo script needs rewriting (live-created chain becomes a multi-charge sheet, not a one-click pointer).

**Implementation effort**: **High.** ~5-8 days for entity + router + UI + demo + walker + tests.

---

## TASK 9 — Code impact analysis (if architecture changes)

Mapped per option. Files cited are the load-bearing ones; small follow-on touches not enumerated.

### Touched in Option A (fix only)

| Layer | Files | Change |
|---|---|---|
| API router | `api/app/routers/metal_batches.py:196-211` | Pass `sourceQualificationNumber=body.sourceQualificationNumber` to constructor |
| Frontend | `web/src/components/metal-quality/create-metal-batch-dialog.tsx` | Add source-qualification Select (filtered to `status="Released"`) |
| Frontend | `web/src/lib/queries.ts` (`useCreateMetalBatch` body type) | Add field |
| Demo | `DEMO_FRESH_CHAIN.md:216`, `DEMO_STEP3.md` | Either remove instruction or document new field |

**Complexity: Low.**

### Touched in Option B (separate lifecycle / genealogy, same storage)

| Layer | Files | Change |
|---|---|---|
| Schemas | `api/app/schemas/genealogy.py` | `GenealogyNode.children: List[GenealogyNode]`; chain DTO becomes tree. New `MaterialLineage` DTO if separating names. |
| Framework | `api/app/frameworks/genealogy.py:309-335` | Replace `break` with full child enumeration. `build_chain` returns a tree. |
| Router | `api/app/routers/traceability.py` | No URL changes; response shape changes. Add a `/lineage` endpoint if `chain` is kept for back-compat. |
| Frontend | `web/src/components/genealogy/genealogy-card.tsx`, `quality-journey-panel.tsx`, `web/src/components/certificates/genealogy-expanded-view.tsx` | Render tree, show sibling badges/counts |
| Frontend | `web/src/app/traceability/page.tsx` | Adopt tree view, possibly add filters |
| Demo | `DEMO_FRESH_CHAIN.md`, `DEMO_STEP4.md`, `DEMO_STEP5.md` | Rewrite sections that assert "one chain" |
| Plus Option A fix | as above | required |

**Complexity: Medium.**

### Touched in Option C (consumption layer)

| Layer | Files | Change |
|---|---|---|
| Schemas | `api/app/schemas/` — **new** `consumption.py` (ChargeRecord, TapRecord) | New |
| Store | `api/app/store.py:43-77` | Add `charges`, `taps` dicts + lookup helpers |
| Routers | **new** `api/app/routers/consumption.py`; modify `metal_batches.py` create flow (require ≥1 charge record), `product_batches.py` (optional tap record), `certificates.py:128-150` (walk via charges) | Substantial |
| Framework | `api/app/frameworks/genealogy.py` — rewrite walker as graph BFS; coverage computed from chain reachability | Substantial |
| Schemas (DTOs) | `genealogy.py` — `GenealogyNode.parents`, `children`, `quantities` | New fields |
| Frontend | New workbench section — `metal-quality/charge-sheet.tsx`; updates to `metal-batch-overview.tsx`, `genealogy-card.tsx`, `quality-journey-panel.tsx`, `genealogy-expanded-view.tsx`, `traceability/page.tsx` | Substantial |
| Frontend | `create-metal-batch-dialog.tsx` — multi-row charge picker | Substantial |
| Insights | `metal_insights.py`, `process_insights.py`, `product_insights.py` may need to weight history by consumption volume | Medium |
| Audit | `api/app/frameworks/audit.py` — new entity types `charge-record`, `tap-record` | Small |
| Demo | All `DEMO_*.md` rewrite; new Step 3 chapter narrating charge sheet | Substantial |
| Migration (when Postgres lands) | None now (in-memory); design Alembic for charges/taps junction tables | Future |

**Complexity: High.**

---

## TASK 10 — Final recommendation

### Recommended architecture: **Option B now, Option C as a phased follow-on.** Begin with the Option A fix as a prerequisite.

### Reasoning

1. **The user's concern is correct as stated.** The Traceability Center implies 1:1:1:1:1 cardinality that the system neither enforces nor records. SMEs will notice this in any demo where the conversation turns to blended charges, downgrades, or multi-customer certification.
2. **Option A alone is not enough.** Fixing the broken Step 2 → Step 3 wire keeps the misleading 1:1 implication. It is, however, a hard prerequisite for either richer option to be demonstrable.
3. **Option B is the right next step.** The data model already permits N children at every hop — the walker, DTO, and UI just hide them. Surfacing siblings is a UI/contract change with no migration risk, and it converts the Traceability Center from "lifecycle progression dressed as genealogy" into honest lineage.
4. **Option C is the right destination.** A consumption layer is what Vedanta-grade plants run on. But shipping it before customer feedback risks designing the wrong junction shape (e.g. recording charges in kg vs % vs bin-level). Earn the right to build it by shipping Option B and letting first customers describe their consumption recording today.

### Business justification

- **Demo credibility.** SMEs probing the chain ("what if two heats blend?") get a real answer instead of silent omission.
- **Differentiation.** Traditional LIMS show lifecycle and call it lineage. Quality360 can show real lineage on day one (Option B) and real consumption later (Option C). That is the "Quality Intelligence Platform" claim made true.
- **Audit defensibility.** The current model would not survive a serious regulator probe asking "show me every delivery that contributed to this certificate." Option B narrows the gap; Option C closes it.

### Manufacturing justification

- Real metallurgy in primary aluminum: blended charges, multi-grade heats, downgrades, billet/ingot co-tapping, multi-customer certification. Option A models none of this; Option B reveals what the data already contains; Option C captures the quantities that operators actually record on charge sheets.
- The existing `Downgrade` decision verb on metal batches (`MetalBatchDecision.DOWNGRADE`) already implies that one heat can produce non-monotonic downstream outcomes — the genealogy must follow.

### Vedanta-specific considerations

- Aluminum smelter operations (Jharsuguda, Korba, BALCO) run **campaign-style** qualifications — a single qualification covers weeks of incoming scrap, and the Casthouse pulls from holding bins continuously. Option C's consumption layer maps cleanly to bin-draw records.
- Vedanta's CoA practice for Hindalco-style export customers includes **per-customer spec overlays** on the same product batch (already supported on the certificate side). Option B makes the multi-certificate fan-out visible on the lineage card; today it is hidden.
- The Carbon Plant and Potline consumption areas (modelled in `ConsumptionArea` enum) have very different qualification cadences. Showing sibling qualifications under one delivery (Option B) lets the same lot drive two parallel quality decisions for two areas — a real Vedanta workflow.

### Demo impact

- **Option A only:** demo continues exactly as scripted; one line of `DEMO_FRESH_CHAIN.md:216` becomes accurate.
- **Option B:** the "one continuous chain" narrative gains a 30-second beat — *"and here you can see the sibling certificate for the second customer, all chained back to the same lot."* Strengthens the platform argument.
- **Option C:** the Step 3 chapter gets a charge-sheet moment — *"three qualified materials, ratioed into this heat, every kilogram traceable."* This is the customer-meeting-winning visual.

### Production impact

- Option A: trivial.
- Option B: no DB migration. Tree DTO is back-compatible if `children` defaults to `[]`. Frontend updates are confined to four components.
- Option C: a real schema. When the Postgres swap-out happens, design `charges` and `taps` as proper junction tables with quantity columns from day one — they are the central artefact of the lineage system, not an afterthought.

### Future expansion impact

- Heat Chemistry, Casting Quality, Mechanical Testing, MTC & Dispatch (canonical-spec future modules) all benefit from Option B's tree view and Option C's consumption junction. Heat Chemistry in particular is fundamentally a multi-input → one-output process — without a consumption layer it remains a 1:1 misrepresentation.
- Reports & Analytics ("which suppliers most often appear in held heats?", "what fraction of P1020 production traces back to Global Alloy Traders?") become first-class queries under Option C.

---

## Summary findings the user should not miss

1. **Live Step 2 → Step 3 link is broken.** `create_metal_batch` in `api/app/routers/metal_batches.py:193-225` does not persist `sourceQualificationNumber`. The schema and the DTO accept it; the router and the UI dialog drop it. Demo script `DEMO_FRESH_CHAIN.md:216` asks the user for input the system cannot capture.
2. **The "Genealogy Card" is a lifecycle strip, not a genealogy graph.** Schema-permitted siblings (N qualifications per lot, N metal batches per qualification, etc.) are silently invisible because `_walk_forwards` breaks at the first child and the DTO has no children field.
3. **Coverage % label is inconsistent.** API computes lots with chain ≥ 4 distinct node types (`genealogy.py:619`); UI labels it "chain ≥ 2 steps" (`traceability/page.tsx:228`).
4. **No consumption record anywhere in the platform.** Blended charges, multi-source heats, and per-kg traceability cannot be expressed at all.

These four findings are independent of the architecture choice and would survive into any of Options A/B/C — recommend addressing them irrespective of the direction taken.
