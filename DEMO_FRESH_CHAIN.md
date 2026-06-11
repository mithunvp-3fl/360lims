# Quality360 — End-to-End Demo Script (Fresh Chain, All 5 Steps)

One continuous story. Create a fresh batch at the gate, follow it through five quality gates, ship a certified product to the customer. Same data, five workspaces, one chain.

**Estimated run time:** ~25 minutes for the full script, ~10 minutes for the lightning version at the bottom.

```
  Step 1            Step 2              Step 3            Step 4               Step 5
  Receipt           Qualification       Metal Batch       Product Batch        Certificate
  Stores Exec       QA Engineer         Casthouse Op      Production Op        QA Engineer
  Sampler           Sampler             Sampler           Sampler              QA Manager
  Lab Analyst       Lab Analyst         Lab Analyst       Lab Analyst          Dispatch Executive
  QA Manager        QA Manager          QA Manager        QA Manager           (= QA Manager)
```

**Why this demo:** Quality360 is **one chain, not five apps**. The same workbench primitives, the same audit, the same notification stream, the same instrument simulation — composed differently for each business question. By the end of these 25 minutes the audience will have watched **one** batch move through every gate with full traceability — receipt at the gate to certificate at the customer.

> **Related per-step scripts** — if the audience wants to drill into one module: `DEMO.md` (Step 1), `DEMO_STEP2.md` (Step 2), `DEMO_STEP3.md` (Step 3), `DEMO_STEP4.md` (Step 4), `DEMO_STEP5.md` (Step 5). **This file is the cross-module story** — fresh records, live, end-to-end.

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh, two tabs ready.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Sign in (or pick **QA Manager** from the topbar role chip — QA Manager unlocks every action; we'll switch down to the operating roles chapter by chapter). | You should land on `/dashboard`. |
| 0.5 | Confirm the **bell icon** in the topbar shows a count — the notification stream now spans all five phases. | Top-right, beside the role chip. |

**Reset note:** The in-memory store rebuilds on every `uvicorn` restart. If you want to re-run this script from a blank slate, Ctrl+C in Window A and restart `uvicorn`. The frontend reconnects within ~4 seconds.

**Three things to watch the audience for while presenting:**

1. **The role chip** — switching roles four to six times per chapter is the most visible proof of separation of duties. Pause briefly each time so the audience sees the chip text change.
2. **The right-rail hero KPI name** — Supplier Health → Process Readiness → Metal Compliance → Product Compliance → Release Confidence. Call it out every time it swaps; this is the framework argument made visible.
3. **The genealogy card** — empty downstream slot at Step 1 → one node deeper each chapter → full five-node ladder by Step 5. This is the "platform's full reach" moment.

**Talking point:** "Quality360 is a Manufacturing Quality Intelligence Platform. Today I'll create one batch live and walk it from supplier gate to customer dispatch — five quality gates, five workspaces, one continuous chain of custody. By the end, the audit log will read like a forensics report."

---

## The story we're going to tell

> "We're going to follow **one truckload of Primary Aluminum scrap from Global Alloy Traders**. It arrives at the gate this morning. Our job — across the next 25 minutes — is to **accept it from procurement, qualify it for the Casthouse, cast it as P1020 metal, billet it for an export customer, and ship a certificate to Hindalco International**. Five quality questions, five workspaces, one chain. By the time we're done, the audit trail will read like a forensics report."

The presenter will create **a brand-new chain live, end-to-end**. Every step's entity is sourced from the previous step's entity — no shortcuts, no pre-baked heroes.

| Step | Entity | Concrete demo value |
|---|---|---|
| 1 | Receipt | Supplier **Global Alloy Traders**, Material **Primary Aluminum**, 35 MT, PO `PO-2026-DEMO`, vehicle `MH-12-CD-9999` |
| 2 | Qualification | Material **Primary Aluminum**, Consumption area **Casthouse**, batch `PAL-2026-DEMO`, source lot from Step 1 |
| 3 | Metal Batch | Grade **P1020**, Potline **PL-04**, Shift **A**, 30 MT, operator **Vikram Singh**, source qualification from Step 2 |
| 4 | Product Batch | Type **Primary Aluminum Billet**, 100 MT, operator **Vikram Singh**, customer **Hindalco International**, source metal batch from Step 3 |
| 5 | Certificate | Customer **Hindalco International**, product batch from Step 4 |

> The lot, qualification, metal batch, product batch, and certificate numbers are minted by the API at create time — read them from the URL bar after each create. The script uses `LOT-2026-XXXX`, `PMQ-2026-XXXXXX`, `MB-2026-XXXXXX`, `PB-2026-XXXXXX`, `COA-2026-XXXXXX` as placeholders. **Keep a sticky note** — you'll reference each upstream number when you create the next entity.

### What gets reused across all 5 chapters

| Concern | Behaviour |
|---|---|
| **Workbench shell** | Header → workflow timeline → workspace → right rail — identical layout on every workbench. |
| **Workflow engine** | Five `WorkflowDefinition` registrations (`incoming-inspection`, `process-material-qualification`, `metal-quality-control`, `product-quality-testing`, certificate workflow). One engine, five sets of stage labels. |
| **Audit trail** | Every mutation funnels through `audit.record(...)`. Entity types differ; the drawer doesn't. |
| **Notifications** | Every successful mutation emits a toast and increments the bell. Cross-module feed. |
| **Approval framework** | Three-button (Approve/Hold/Reject) or four-button (+ Downgrade / Retest / Review) grammar. Reason is mandatory on negative decisions. |
| **Quality Insights** | Right-rail panel pattern. Hero KPI swaps per module — Supplier Health → Process Readiness → Metal Compliance → Product Compliance → Release Confidence. |
| **Instrument simulation** | Six-stage flow on every Import — Connecting → Verifying → Reading → Parsing → Validating → Import Successful. Same simulation, different instrument. |
| **Genealogy** | One card primitive that grows from one node at Step 1 to five nodes at Step 5. |
| **Role gating** | `RoleGate` enforces permissions visually — every disabled button has a tooltip explaining which role is required. |

---

## Chapter 1 · Receive the material (Step 1)

> Goal: accept a new truck at the gate, draw a sample, capture the chemistry, approve the lot. Roles: Stores Executive → Sampler → Lab Analyst → QA Manager.

### 1.1 · Stores Executive — create the receipt

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.1.1 | **Switch role** | Topbar role chip → **Stores Executive**. | The role chip text updates. |
| 1.1.2 | Stores Executive | Sidebar → **Inspection Queue**. | Left rail, *Operate* group. Land on `/inspection`. |
| 1.1.3 | Stores Executive | Click **+ New Receipt** (top-right of the queue). | Primary violet button. |
| 1.1.4 | Stores Executive | Fill the dialog: Supplier = **Global Alloy Traders**, Material = **Primary Aluminum**, Quantity = **35**, Vehicle = **MH-12-CD-9999**, PO = **PO-2026-DEMO**. | Two-column grid. |
| 1.1.5 | Stores Executive | Click **Create receipt**. | Bottom-right. |
| 1.1.6 | — | Read the new lot number from the URL bar — e.g. `LOT-2026-0051`. **Write this down**; you'll reference it in Chapter 2. | `/inspection/LOT-2026-XXXX`. |

**What to call out:** "Toast confirms ‘Receipt Created'. Bell increments. We land directly on the new lot's workbench. The lot number is minted server-side — no human re-types a sequence." Notice the workflow timeline: **Receipt** is green; **Sample** pulses. **The lot is now waiting on a sampler.**

### 1.2 · Sampler — draw the sample

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.2.1 | **Switch role** | Topbar → **Sampler**. | Approve buttons grey out with tooltips. |
| 1.2.2 | Sampler | Scroll to **Sample management** → click **Create Sample**. | Primary button on that card. |
| 1.2.3 | — | Sample ID auto-mints to **`SMP-2026-XXXX-A`**. Three tests get auto-assigned: XRF Chemistry, OES Chemistry, Moisture. | Workflow timeline: Sample ✓, Testing pulses. |

**What to call out:** "**Notice the gating.** Sampler can create samples; cannot approve. The required tests for Primary Aluminum (XRF, OES, Moisture) come from the material spec — the workflow engine reads master data, not the operator."

### 1.3 · Lab Analyst — import results from the instruments

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — |
| 1.3.2 | Lab Analyst | On the **XRF Chemistry** row, click **Import**. | Violet primary button. |
| 1.3.3 | — | Watch the **6-stage modal**: Connecting → Verifying → Reading → Parsing → Validating → Import Successful. ~4.5s total. | Each stage emits an activity feed entry. |
| 1.3.4 | — | Modal closes. Four green parameter tiles appear: Al, Si, Fe, Cu. | Toast: ‘Results Imported'. |
| 1.3.5 | Lab Analyst | Repeat **Import** on **OES Chemistry** (Thermo OES-01). | One click. |
| 1.3.6 | Lab Analyst | Repeat **Import** on **Moisture** (Moisture-01). | One click. |

**What to call out:** "**Same 6-stage simulation, three instruments.** Per the canonical spec, every stage is a real failure point in production: connectivity, protocol handshake, file parsing, schema validation. Watch the **Quality Insights** panel on the right rail — Supplier Health climbs as parameters land. Recommendation flips to **APPROVE** once the matrix is complete." Compliance is 100%, observations are generated per parameter.

### 1.4 · QA Manager — approve the lot

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.4.1 | **Switch role** | Role chip → **QA Manager**. | Buttons in the Approval Center come alive. |
| 1.4.2 | QA Manager | Scroll to **Approval center** → click **Approve**. | Big green button. |
| 1.4.3 | QA Manager | Confirm in the modal (reason optional on approve). | — |
| 1.4.4 | — | Toast: ‘Material approved successfully'. Workflow flips green: all six circles complete. Status pill in header → **Approved**. | Bell increments. |

**What to call out:** "From receipt to release in one workspace. **No screen switching, no Excel, no email.** Step 1 has said yes-from-procurement on `LOT-2026-XXXX`."

### 1.5 · Hand-off teaser

Scroll down to the **Genealogy** card (it'll be present even on Step 1 with downstream nodes empty). Point at the **Process Qualification** slot — still empty. **"Step 2 hasn't happened yet. Let's go do it."**

**Framework callout (15 seconds):** "Look at the right rail. **Supplier Health, Risk, Tests Completed, Spec Compliance, Recent Deliveries.** The hero KPI on this workbench is Supplier Health — because Step 1's question is procurement. On the next workbench, the hero KPI will be different. **Same panel pattern. Different hero metric.** That's the Quality Insights framework."

Audit teaser: click **View history** (top-right). Two entries already — receipt created, sample created. Close the drawer. "**Every mutation on this lot is one click away. Pharma-grade audit from the first action.**"

---

## Chapter 2 · Qualify it for production (Step 2)

> Goal: prove production can consume this material. Roles: QA Engineer → Sampler → Lab Analyst → QA Manager.

**The bridge:** "Step 1 answered **yes-from-procurement**. Step 2 has to answer **yes-from-process**. The chemistry hasn't changed — but the question has. Can the Casthouse consume this material safely?"

### 2.1 · QA Engineer — create the qualification

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.1.1 | **Switch role** | Topbar → **QA Engineer**. | — |
| 2.1.2 | QA Engineer | Sidebar → **Process Material Qualification** under *Quality Operations*. | Land on `/qualification`. |
| 2.1.3 | QA Engineer | Click **+ New Qualification** (top-right). | Primary button. |
| 2.1.4 | QA Engineer | Fill the dialog: Material = **Primary Aluminum**, Consumption area = **Casthouse**, Batch number = **PAL-2026-DEMO**, Source lot = **`LOT-2026-XXXX`** (the one you wrote down in Chapter 1), Source supplier = **Global Alloy Traders**, Quantity = **35**. | Two-column grid. |
| 2.1.5 | QA Engineer | Click **Create qualification**. | Bottom-right. |
| 2.1.6 | — | Read the new qualification number from the URL — e.g. `PMQ-2026-001246`. **Write this down**. | `/qualification/PMQ-2026-XXXXXX`. |

**What to call out:** "Toast: ‘Qualification created successfully'. We land on the new workbench. **Notice the header chip — `from LOT-2026-XXXX`.**"

### 2.2 · Prove the genealogy is bidirectional

Click the **`from LOT-2026-XXXX`** chip in the header. The browser lands back on the Chapter 1 workbench. **"Same browser tab, one click. The chain is navigable, not decorative."** Then click the browser **Back** button to return to the qualification.

### 2.3 · Sampler — create the qualification sample

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.3.1 | **Switch role** | Topbar → **Sampler**. | Release buttons greyed. |
| 2.3.2 | Sampler | Scroll to **Sample management** → click **Create Sample**. | Primary button. |
| 2.3.3 | — | Sample ID auto-mints to **`PMQS-XXXXXX-A`**. One test auto-assigned: **XRF Chemistry** (Al, Si, Fe). | Workflow: Sample ✓, Testing pulses. |

### 2.4 · Lab Analyst — import the XRF result

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.4.1 | **Switch role** | Role chip → **Lab Analyst**. | — |
| 2.4.2 | Lab Analyst | On the **XRF Chemistry** row, click **Import**. | Violet button. |
| 2.4.3 | — | Same 6-stage modal — Connecting → … → Import Successful. ~4.5s. Three element tiles populate, all in spec. | Toast: ‘Results imported successfully'. |

**What to call out:** "Watch the right rail. **Process Readiness** climbs to ~96. Recommendation flips to **RELEASE TO CASTHOUSE**. The engine writes one observation per parameter — generated, not canned. **We never say ‘AI'.** *Recommendation. Based on history. Compliance check.*"

### 2.5 · QA Manager — release to Casthouse

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.5.1 | **Switch role** | Role chip → **QA Manager**. | Release button comes alive. |
| 2.5.2 | QA Manager | Scroll to **Approval center** → click **Release**. | Big green button. |
| 2.5.3 | QA Manager | Confirm in the modal. | — |
| 2.5.4 | — | Toast: ‘Material released successfully'. All six workflow circles green. Status → **Released**. | Bell increments. |

### 2.6 · Framework callout

"**Same workbench, second question. Same instrument simulation, same audit, same notification feed — different recommendation engine.** The right-rail hero KPI swapped from Supplier Health to Process Readiness. The engine surface didn't change."

**Notice the gating, again.** Hover the **Release** button as Sampler — disabled with tooltip "Requires qa-manager role". The same `RoleGate` component governs every primary action across all five modules. **Separation of duties is a framework concern, not a module concern.**

**Notice the Workflow timeline labels.** Phase 1 stages: Receipt → Sample → Testing → Validation → Review → Release. Phase 2 stages: **Request** → Sample → Testing → Validation → Review → Release. Only the first stage label changes — the engine is shared. Per the canonical spec, Phase 2 is "registered, not rewritten" against the workflow engine.

---

## Chapter 3 · Cast and verify the metal (Step 3)

> Goal: tap a heat from the qualified material, run OES, decide whether to release for casting. Roles: Casthouse Operator → Sampler → Lab Analyst → QA Manager.

**The bridge:** "Step 2 said yes-from-process. Step 3 has to say **yes-from-casting**. The qualified material went into the smelt line; the molten heat just tapped is `MB-2026-XXXXXX`. Does its chemistry meet P1020 spec?"

> Between chapters, **point at the bell icon and say**: "Notice the notification stream is now interleaved across three modules — receipts, qualifications, and now metal batches. Same `notif.emit` framework. The bell doesn't care which module emitted what."

### 3.1 · Casthouse Operator — create the metal batch

> Use the **QA Manager** role for this step. (In production the role chip would read *Casthouse Operator*; the create permission is mapped the same way.)

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.1.1 | **Switch role** | Topbar → **QA Manager** (proxy for Casthouse Operator). | — |
| 3.1.2 | QA Manager | Sidebar → **Metal Quality Control**. Land on `/metal-quality`. | Queue page. |
| 3.1.3 | QA Manager | Click **+ New Metal Batch** (top-right). | Primary button. |
| 3.1.4 | QA Manager | Fill the dialog: Grade = **P1020**, Potline = **PL-04**, Weight = **30**, Shift = **A**, Operator = **Vikram Singh**, Source qualification = **`PMQ-2026-XXXXXX`** (the one you wrote down in Chapter 2), Notes optional. | Two-column grid. |
| 3.1.5 | QA Manager | Click **Create metal batch**. | Bottom-right. |
| 3.1.6 | — | Read the new metal batch number from the URL — e.g. `MB-2026-001246`. **Write this down**. | `/metal-quality/MB-2026-XXXXXX`. |

**What to call out:** "Toast: ‘Metal batch created successfully'. We land on the new workbench. **The header carries the grade chip P1020, the potline chip PL-04, the shift chip A** — readable from the back of the room."

### 3.2 · Sampler — draw the metal sample

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.2.1 | **Switch role** | Topbar → **Sampler**. | — |
| 3.2.2 | Sampler | Scroll to **Sample management** → click **Create Sample**. | Primary button. |
| 3.2.3 | — | Sample ID auto-mints to **`MQS-XXXXXX-A`**. One test auto-assigned: **OES Chemistry** (Si, Fe, Cu, Mg, Zn, Ti, Mn on Thermo OES-01). | Workflow: Sample ✓, OES Analysis pulses. |

### 3.3 · Lab Analyst — import the OES result

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — |
| 3.3.2 | Lab Analyst | On the **OES Chemistry** row, click **Import**. | Violet button. |
| 3.3.3 | — | Same 6-stage modal — Connecting → … → Import Successful. ~4.5s. **Seven element tiles** populate: Si, Fe, Cu, Mg, Zn, Ti, Mn. All green. | Toast: ‘OES results imported'. |

### 3.4 · The Phase 3 signature — Chemistry Correction Advisor

Scroll below the OES workspace to the **Chemistry Correction Advisor** (amber-tinted glass card).

| # | What to do | What to say |
|---|---|---|
| 3.4.1 | The advisor is **quiet** on this batch — chemistry is mid-spec. | "**This is the signature feature of Step 3.** It's silent right now because the heat is on-target — no noise, no false positives." |
| 3.4.2 | (Optional, 30s) Open a second tab to `/metal-quality/MB-2026-001242` (seeded on-hold sibling, Fe near upper limit). Scroll to the advisor. | "On this on-hold sibling, watch the advisor fire. For each off-target element it computes: how far off target, which additive to use from the additive master, how many kg given the heat mass, what the chemistry will look like after. Plain-language rationale per card." |
| 3.4.3 | Return to the active tab. | "**Rule-based, advisory, never says ‘AI'.**" |

### 3.5 · Right rail — Metal Compliance climbs

Look at the **Quality Insights** panel. **Metal Compliance** climbs from ~30 (no data) to **~98**. **Casting Readiness** pill flips to **READY**. Recommendation flips to **RELEASE FOR CASTING**.

### 3.6 · QA Manager — release for casting

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.6.1 | **Role stays** | QA Manager. | — |
| 3.6.2 | QA Manager | Scroll to **Approval center** → click **Release**. | Big green button. |
| 3.6.3 | QA Manager | Confirm. | — |
| 3.6.4 | — | Toast: ‘Casting release approved'. All six circles green. Status → **Released**. | Bell increments. |

**What to call out:** "Step 3 has said yes-from-casting. **Notice the four-button grammar in the Approval Center — Release / Hold / Reject / Downgrade.** Downgrade is the Phase 3 superpower — a P1020 heat that misses on one element can be reclassified to Primary Aluminum without re-melting. The audit log knows about it; the customer never sees the wrong grade."

### 3.7 · Genealogy is now three nodes deep

Scroll to the **Genealogy** card on the metal batch workbench. The chain is now **`LOT-2026-XXXX → PMQ-2026-XXXXXX → MB-2026-XXXXXX`** (current). Click the lot node — lands on Chapter 1's workbench. Browser Back. Click the qualification node — lands on Chapter 2's workbench. Browser Back. **"The genealogy framework walks the chain in both directions. Add Phase 4 and the chain grows to four nodes — same card, one more chip."**

---

## Chapter 4 · Test the finished product (Step 4)

> Goal: cast a billet, run six tests across four categories, approve the product for customer release. Roles: Production Operator (= Stores Executive) → Sampler → Lab Analyst → QA Manager.

**The bridge:** "Step 3 said yes-from-casting. Step 4 has to say **yes-from-product**. The metal was good. Does the finished billet meet the customer specification?"

### 4.1 · Production Operator — register the product batch

> The PRD's **Production Operator** maps to **`stores-executive`** — the operator who books finished product onto the floor.

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.1.1 | **Switch role** | Topbar → **Stores Executive**. | — |
| 4.1.2 | Stores Executive | Sidebar → **Product Quality Testing**. Land on `/product-quality`. | Queue page. |
| 4.1.3 | Stores Executive | Click **+ New Product Batch** (top-right). | Primary button. |
| 4.1.4 | Stores Executive | Fill the dialog: Product type = **Primary Aluminum Billet**, Source metal batch = **`MB-2026-XXXXXX`** (the one from Chapter 3), Weight = **100**, Customer = **Hindalco International**, Operator = **Vikram Singh**. | Two-column grid. The dropdown only shows Released metal batches. |
| 4.1.5 | Stores Executive | Click **Create product batch**. | Bottom-right. |
| 4.1.6 | — | Read the new product batch number from the URL — e.g. `PB-2026-000211`. **Write this down**. | `/product-quality/PB-2026-XXXXXX`. |

**What to call out:** "Toast: ‘Product batch created successfully'. We land on the workbench. **Header chip — `← MB-2026-XXXXXX`. Customer chip — Hindalco International.** Step 4 starts here."

### 4.2 · Sampler — create the product sample

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar → **Sampler**. | — |
| 4.2.2 | Sampler | Scroll to **Product sample** → click **Create Sample**. | Primary button. |
| 4.2.3 | — | Sample ID auto-mints to **`PQS-XXXXXX-A`**. **Six tests** across four categories auto-assigned: **UTS** (Mechanical), **Hardness · Conductivity · Dimensions & Weight** (Physical), **Microstructure Review** (Metallography), **Visual Inspection** (Visual). | Workflow: Sample ✓, Product Testing pulses. |

### 4.3 · Lab Analyst — capture all six results, three different ways

This is the moment that **shows the full result-capture grammar in one chapter**. Cycle through:

| # | Role | Test | Mode | What to call out |
|---|---|---|---|---|
| 4.3.1 | Lab Analyst | **UTS** (Mechanical, UTS-01) | **Import** — narrate the 6-stage flow | "Mechanical test — three parameters land at once: UTS, YieldStrength, Elongation." |
| 4.3.2 | Lab Analyst | **Hardness** (Physical, HARD-01) | **Import** — quick | "Single parameter, single import." |
| 4.3.3 | Lab Analyst | **Conductivity** (Physical, COND-01) | **Manual** — reason **External Lab** | "Manual capture with a mandatory reason. Auditable when challenged." |
| 4.3.4 | Lab Analyst | **Dimensions & Weight** (Physical, DIM-01) | **Upload** — drop any file | "File parser flow — same 3-stage extract." |
| 4.3.5 | Lab Analyst | **Microstructure Review** (Metallography, MICRO-01) | **Import** | "Optical microscope export — GrainSize, Phase." |
| 4.3.6 | Lab Analyst | **Visual Inspection** (Visual, VIS-INSP) | **Manual** — SurfaceDefects = 1, reason "Visual inspection by analyst" | "Visual is almost always manual. SurfaceDefects = 1, within tolerance." |

**Switching gears:** "All three capture modes — instrument, manual, upload — used in one chapter, across four test categories. Same right rail, same audit, same notification stream."

### 4.4 · Right rail — Product Compliance climbs

As each test lands, **Product Compliance** climbs (60 → 78 → 91 → 97). **Release Readiness** pill flips REVIEW → **READY** on the last test. Recommendation flips to **APPROVE PRODUCT**.

### 4.5 · QA Manager — approve the product

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.5.1 | **Switch role** | Topbar → **QA Manager**. | — |
| 4.5.2 | QA Manager | Scroll to **Approval center** → click **Approve Product**. | Big green button. |
| 4.5.3 | QA Manager | Confirm. | — |
| 4.5.4 | — | Toast: ‘Product approved for release'. All six circles green. Status → **Approved**. | Bell increments. |

**What to call out:** "Step 4 has said yes-from-product. **Notice the fourth verb in the Approval Center — Retest.** If a result came in borderline — say UTS at 142 MPa just inside the lower bound — the QA Engineer clicks Retest, picks a reason, the workflow flips back to Retest status, **the sample lineage is preserved**, and the lab re-runs without recreating the sample. The Phase 4 grammar is Approve / Hold / Reject / Retest."

### 4.6 · Genealogy is now four nodes deep

Scroll to the **Genealogy** card on the product batch workbench. The chain is now **`LOT-2026-XXXX → PMQ-2026-XXXXXX → MB-2026-XXXXXX → PB-2026-XXXXXX`** (current). Hover any node — tooltip shows the upstream entity's status. Click the metal batch node — lands on Chapter 3's workbench. **"Four modules. Four nodes. Same card. The genealogy framework didn't change to accommodate Phase 4 — it accommodated automatically."**

### 4.7 · A note on the test categories

Per the canonical spec, the six tests on a product batch are grouped into **four PRD §11 categories** — that's the visual logic of the workspace:

- **Mechanical** — UTS (one row, three parameters)
- **Physical** — Hardness, Conductivity, Dimensions & Weight (three rows)
- **Metallography** — Microstructure Review (one row)
- **Visual** — Visual Inspection (one row, count parameter)

Each category header is a `Section` primitive. Adding a seventh test (e.g. a new corrosion test) is one row insertion — **no framework change**.

---

## Chapter 5 · Certify and dispatch (Step 5)

> Goal: bind every upstream piece of evidence into one customer-signed document, then clear it for shipment. Roles: QA Engineer → QA Manager → Dispatch Executive (= QA Manager).

**The bridge:** "Steps 1 through 4 each answered one quality question and generated quality evidence. **Step 5 binds that evidence into a single signed document** the customer (and the auditor) will sign for."

> "If the audience has only been half-watching so far, **this is the chapter that earns their attention back**. The five-node genealogy is on screen for the first time. The Quality Results Summary is the cross-module roll-up. The Customer Specification Validation is the contract grammar. **Slow down here**."

### 5.1 · QA Engineer — generate the certificate

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.1.1 | **Switch role** | Topbar → **QA Engineer**. | — |
| 5.1.2 | QA Engineer | Sidebar → **Certificate & Dispatch**. Land on `/certificates`. | Queue page. |
| 5.1.3 | QA Engineer | Click **+ Generate Certificate** (top-right). | Primary button. |
| 5.1.4 | QA Engineer | In the dialog, pick product batch **`PB-2026-XXXXXX`** (the one from Chapter 4). Enter customer **Hindalco International**. Leave the optional customer-requirements override blank — *or* tighten one parameter (say, Iron) to demonstrate the validation. | Two fields. |
| 5.1.5 | QA Engineer | Click **Generate certificate**. | Bottom-right. |
| 5.1.6 | — | Read the new certificate number from the URL — e.g. `COA-2026-001246`. | `/certificates/COA-2026-XXXXXX`. |

**What to call out:** "Toast: ‘Certificate generated for Hindalco International'. Status: **Draft**. Dispatch: **Pending**. Workflow strip lands on Stage 2 of 5 — Customer Validation."

### 5.2 · Walk the workbench top to bottom

The certificate workbench is mostly read-only by this point — every piece of evidence comes from upstream. Walk it briefly:

| # | Section | What to call out |
|---|---|---|
| 5.2.1 | **Certificate overview** | "Identification block — number, customer, product batch link, issued metadata. QR code, barcode, digital signature placeholders. The QR is a deterministic SVG today; **in production it points at a customer-facing verification URL** signed with PKI." |
| 5.2.2 | **Customer Specification Validation** (11 rows) | "**This is what the customer signed for.** Every contract parameter — required range vs actual result vs Pass/Warn/Fail. All 11 are green. If even one row flipped to Warn or Fail, the dispatch recommendation would flip immediately." |
| 5.2.3 | **Quality Results Summary** (4 cards) | "**The roll-up auditors want.** One card per upstream step: Incoming Inspection → Process Qualification → Metal Quality → Product Testing. Each card carries a compliance score and a link back to the originating workbench. The customer gets a single document; the auditor gets a single document that *navigates*." |
| 5.2.4 | **Genealogy Expanded View** (5 nodes vertical) | "**The full 5-node ladder is now populated**: the lot you created in Chapter 1 → the qualification from Chapter 2 → the metal batch from Chapter 3 → the product batch from Chapter 4 → this certificate. **This is the moment the audience sees the platform's full reach** — one chain, five modules, the current node highlighted." |

### 5.3 · Right rail — Release Confidence

| # | Action | What to call out |
|---|---|---|
| 5.3.1 | Look at **Release Confidence** at the top of the Quality Insights panel. | "**Release Confidence — ~99/100.** Phase 5 hero metric. The math is transparent: 60 points from customer-spec pass rate, 25 from upstream product compliance, 10 from chain coverage, 5 base." |
| 5.3.2 | Point at customer compliance. | "**11 of 11** customer parameters in spec. Risk Low. Recommendation **APPROVE DISPATCH**." |
| 5.3.3 | Point at the sparkline below the score. | "Trend across the customer's last 12 deliveries. The line is climbing — **supplier discipline and process control compound over time**, and the engine remembers." |
| 5.3.4 | Point at the **Key observations** bullets. | "Generated, not canned. One per axis: customer-spec pass rate, upstream product compliance, genealogy coverage, certificate lifecycle state. Business voice, never ‘AI'." |

### 5.4 · QA Manager — issue the certificate

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.4.1 | **Switch role** | Topbar → **QA Manager**. | — |
| 5.4.2 | QA Manager | Click **Issue Certificate** in the header. | Primary button. |
| 5.4.3 | QA Manager | Confirm — "Certificate will be issued and made available for dispatch." | — |
| 5.4.4 | — | Status flips Draft → **Issued**. Dispatch flips Pending → **Ready**. Workflow strip lands on Stage 3 of 5. | Toast: ‘Certificate issued'. |

### 5.5 · Dispatch Executive (= QA Manager) — approve dispatch

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.5.1 | **Role stays** | QA Manager (PRD §4: Dispatch Executive maps to qa-manager). | — |
| 5.5.2 | Dispatch Executive | Scroll to **Dispatch Approval** → click **Approve Dispatch**. | Big green button. |
| 5.5.3 | Dispatch Executive | Confirm. Reason optional on Approve. | — |
| 5.5.4 | — | Dispatch flips Ready → **Approved** → on subsequent push, **Released**. Workflow strip lands on Stage 4 of 5 (then 5 of 5 on Release). | Toast: ‘Dispatch approved'. |

### 5.6 · The audit drawer pays off

Click **View history** in the header. Read down the list. **The audit roll-up spans every chapter**:

1. Receipt created (Stores Executive)
2. Sample created (Sampler)
3. XRF imported, OES imported, Moisture imported (Lab Analyst)
4. Receipt approved (QA Manager)
5. Qualification created (QA Engineer)
6. Qualification sample, XRF imported (Sampler / Lab Analyst)
7. Qualification released (QA Manager)
8. Metal batch created (Casthouse Operator / QA Manager)
9. Metal sample, OES imported (Sampler / Lab Analyst)
10. Casting release approved (QA Manager)
11. Product batch created (Stores Executive)
12. Product sample, six tests imported / manual / uploaded (Sampler / Lab Analyst)
13. Product approved (QA Manager)
14. Certificate generated (QA Engineer)
15. Certificate issued (QA Manager)
16. Dispatch approved (QA Manager / Dispatch Executive)

**Eleven actors. Five modules. One audit log.**

---

## Chapter 6 · The traceability close

> Goal: prove the chain is searchable end-to-end. Roles: any.

### 6.1 · Open the traceability dashboard

Sidebar → **Traceability**. Land on `/traceability`. Look at the KPI strip: **Active Lots, In Testing, Awaiting Approval, Released, Certificates Generated, Coverage %**.

**What to call out:** "Cross-module dashboard. Active Lots is Step 1 in motion. Awaiting Approval is anything waiting on a QA Manager across all five modules. Certificates Generated is the Step 5 throughput. **Coverage %** is the percentage of certificates with a complete 5-node chain."

### 6.2 · Search for the chain you just built

Type the lot number from Chapter 1 — **`LOT-2026-XXXX`** — into the search box. **Every node in the chain you just built comes back as a hit** — the lot, the qualification, the metal batch, the product batch, the certificate.

### 6.3 · Click any hit and prove the chain is bidirectional

Click the certificate hit. Lands on the certificate workbench. Scroll to the **Genealogy Expanded View** — the chain we just built. Click the metal batch node. Lands on Chapter 3's workbench. Click the qualification chip in the header. Lands on Chapter 2's workbench. Click the source lot chip. Lands on Chapter 1's workbench. **Five clicks back to the supplier delivery.**

### 6.4 · Same data, two audiences

**The customer** sees one document — the certificate PDF, the QR code, the customer-spec validation table. Eleven rows, eleven Pass pills.

**The auditor** sees the same document, but every link is live. Customer-spec table → Quality Results Summary → Genealogy Expanded View → click any upstream node → land in that workbench → View history → diff any audit row. **Same chain, different reading.**

### 6.5 · The auditor moment

**"Customer complaint comes in six months from now? Scan the QR on the shipping label, or paste the certificate number into the search box. You get the entire quality lineage — instrument provenance, sampler ID, every result captured, every decision made, with reasons. That's what auditors and regulators want — and that's what was on screen the whole time the QA team was working."**

---

## Chapter 7 · The framework angle

> Goal: 60-second close — five modules cost weeks, not months, because the platform is a framework.

> The whole twenty-five minutes was just an existence proof. **This chapter is the architecture argument.**

| # | Talking point | What to show |
|---|---|---|
| 7.1 | "**Five workbenches, one shell.**" | Toggle quickly between `/inspection/LOT-...`, `/qualification/PMQ-...`, `/metal-quality/MB-...`, `/product-quality/PB-...`, `/certificates/COA-...`. Same header → timeline → workspace → right-rail composition every time. |
| 7.2 | "**Workflow engine — five registrations, zero rewrites.**" | Optional: open `api/app/frameworks/workflow_engine.py` for 5 seconds. Five `register(...)` lines, one per module. |
| 7.3 | "**Quality Insights is a pattern, not a panel.**" | Right rail surfaced **Supplier Health → Process Readiness → Metal Compliance → Product Compliance → Release Confidence** across the five workbenches. The hero KPI swaps; the engine surface doesn't. |
| 7.4 | "**Instrument Integration is the same 6-stage simulation on five different instruments.**" | XRF, OES, UTS Machine, Hardness Tester, file parser — all reuse the same staged flow. |
| 7.5 | "**Adding Heat Chemistry (Step 6), Casting Quality (Step 7), Mechanical Testing (Step 8), MTC Dispatch (Step 9) is one workflow registration plus a section composition plus a tuned readiness function. No framework code changes. We just demonstrated the architecture is real.**" | — |
| 7.6 | "**Audit and notifications are framework-level, not module-level.**" | The bell shows interleaved events from all five modules. The audit drawer on any node shows the entity-typed slice — the underlying record is one append-only log across the platform. |
| 7.7 | "**This is not a LIMS, not a SAP transaction screen, not an Excel replacement.**" | Per the canonical spec: "Modern Manufacturing Control Tower. Enterprise SaaS. Production application." The reads-in-three-to-five-seconds discipline carried through every chapter. |

---

## Quick reference · The chain you built

| Chapter | Entity | Role(s) | Terminal status | Recommendation | URL pattern |
|---|---|---|---|---|---|
| 1 | Receipt | Stores Exec, Sampler, Lab Analyst, QA Manager | **Approved** | APPROVE | `/inspection/LOT-2026-XXXX` |
| 2 | Qualification | QA Engineer, Sampler, Lab Analyst, QA Manager | **Released** | RELEASE TO CASTHOUSE | `/qualification/PMQ-2026-XXXXXX` |
| 3 | Metal Batch | Casthouse Op (= QA Manager), Sampler, Lab Analyst, QA Manager | **Released** | RELEASE FOR CASTING | `/metal-quality/MB-2026-XXXXXX` |
| 4 | Product Batch | Production Op (= Stores Exec), Sampler, Lab Analyst, QA Manager | **Approved** | APPROVE PRODUCT | `/product-quality/PB-2026-XXXXXX` |
| 5 | Certificate | QA Engineer, QA Manager, Dispatch Exec (= QA Manager) | **Issued · Released** | APPROVE DISPATCH | `/certificates/COA-2026-XXXXXX` |

> Read the actual numbers from the URL bar after each create — they're minted server-side, not predictable.

---

## Quick reference · If something breaks live

| Symptom | Fix |
|---|---|
| Pages 404 or "Network error" | API is down. Ctrl+C in Window A and re-run `uvicorn app.main:app --reload --port 8000`. Frontend reconnects within ~4 seconds. |
| Stale data after a create | Refresh the queue (Ctrl+R / Cmd+R). React Query refetches on focus too. |
| Need to reset the demo state | Restart `uvicorn` (Window A). The in-memory store reseeds — both phase heroes and the demo data are back. |
| A button is greyed out | You're on the wrong role. Switch to **QA Manager** from the topbar role chip — it unlocks every action. Hover any greyed button to see the role it requires. |
| Bell isn't ticking | Notification poll runs every ~4 seconds. Give it a beat; if it stays silent, the API has died — see row 1. |

---

## Lightning version (10 minutes)

If you only have 10 minutes:

1. **The pitch** (30s) — one chain, five workspaces, twenty-five minutes' worth of work into ten.
2. **Create the receipt + import XRF + Approve** (90s) — `/inspection` → + New Receipt (Global Alloy Traders, Primary Aluminum, 35 MT) → Sampler creates sample → Lab Analyst imports XRF → QA Manager approves. Toast: ‘Material approved successfully'.
3. **Create the qualification + import XRF + Release** (90s) — `/qualification` → + New Qualification (Casthouse, source lot from step 2) → Sampler → Lab Analyst Imports → QA Manager Releases. **Process Readiness ~96.**
4. **Create the metal batch + import OES + Release; cameo on Chemistry Correction Advisor** (120s) — `/metal-quality` → + New Metal Batch (P1020, PL-04, source PMQ from step 3) → Sampler → Lab Analyst Imports OES → all 7 elements land → 30-second cameo on `MB-2026-001242` showing the advisor firing → back, QA Manager Releases. **Metal Compliance ~98.**
5. **Create the product batch + import UTS + Approve** (90s) — `/product-quality` → + New Product Batch (Primary Aluminum Billet, Hindalco International, source MB from step 4) → Sampler (6 tests auto-assigned) → Lab Analyst Imports UTS → QA Manager Approves. **Product Compliance ~97.**
6. **Generate the certificate + Issue + Approve Dispatch** (90s) — `/certificates` → + Generate Certificate (PB from step 5, Hindalco International) → QA Manager Issues → Approve Dispatch. **Release Confidence ~99.**
7. **Traceability search** (45s) — `/traceability` → paste the lot number from step 2 → the new chain renders end-to-end, five nodes deep.
8. **View History on the certificate** (45s) — open the audit drawer → 16 entries, 11 actors, 5 modules.
9. **Framework close** (45s) — sidebar reveal: five workbenches, one shell. Workflow engine, audit, notifications, instrument simulation — registered, not rewritten. Heat Chemistry, Casting, Mechanical Testing, MTC Dispatch reuse the same shell.
10. **Done.**

---

## Closing line for either version

> "Five modules. Eleven actors. One chain. Twenty-five minutes of work — or ten, if we're hurrying — and the audit trail reads like a forensics report. **That's not a LIMS. That's a Manufacturing Quality Intelligence Platform.**"
