# Quality360 — The Aluminum Journey

> One truckload. Five gates. A heat that splits. A certificate that gets revised. A QR that earns the customer's trust.

This script is the canonical end-to-end demo. Every record is created live — no pre-baked heroes, no shortcuts. The story is the *journey of one truckload of Primary Aluminum* from the supplier gate to a customer-signed Certificate of Analysis, with three deliberate fan-out moments along the way that prove the platform speaks the language of real manufacturing.

**Run time:** ~30 minutes for the full script · ~12 minutes for the lightning version at the bottom.

```
  Step 1            Step 2              Step 3             Step 4              Step 5
  Receipt           Qualification       Metal Batch        Product Batch       Certificate
  Stores Exec       QA Engineer         Casthouse Op       Production Op       QA Engineer
  Sampler           Sampler             Sampler            Sampler             QA Manager
  Lab Analyst       Lab Analyst         Lab Analyst        Lab Analyst         Dispatch Exec
  QA Manager        QA Manager          QA Manager         QA Manager          (= QA Manager)
```

**The framework argument, spoken once:** Quality360 is **one chain, not five apps**. The same workbench shell, the same audit log, the same notification bell, the same task framework, the same instrument simulation — composed differently for each business question. By the end of these thirty minutes you will have watched **one** input fan out into **two heats**, then into **two products**, then into **two certificates** — and the audit trail will read like a forensics report.

> Per-step deep dives — `DEMO.md` (Step 1), `DEMO_STEP2.md` (Step 2), `DEMO_STEP3.md` (Step 3), `DEMO_STEP4.md` (Step 4), `DEMO_STEP5.md` (Step 5). **This file is the cross-module story** — fresh records, live, end-to-end.

---

## Chapter 0 · Preflight (60s before the demo)

> Goal: both servers running, hero data fresh, two tabs ready, the bell ticking.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `pip install -r requirements.txt` (first run only, picks up `qrcode`, `python-barcode`, `reportlab`) → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open `http://localhost:3000` in a clean browser. Sign in (or pick **QA Manager** from the topbar role chip — we'll step down to operating roles per chapter). | You should land on `/dashboard`. |
| 0.5 | Confirm the **bell** has a count and **My Work** badge in the sidebar shows pending tasks across modules. | Top-right + left rail. |
| 0.6 | Stage a second browser window (or mobile camera) to `http://localhost:3000/verify/…` blank — you'll use it for the QR-scan moment in Chapter 7. | — |

**Reset note:** The in-memory store rebuilds on every `uvicorn` restart. Ctrl+C in Window A and rerun to clear the slate; the frontend reconnects in ~4 seconds.

**Three things to watch the audience for while presenting:**

1. **The role chip** — switching roles four to six times per chapter is the most visible proof of separation of duties. Pause briefly each switch so the chip text registers.
2. **The right-rail hero KPI name** — Supplier Health → Process Readiness → Metal Compliance → Product Compliance → Release Confidence + Certificate Health. Call it out every swap; the framework argument is on screen.
3. **The genealogy card** — one node at Step 1, growing to five by Step 5. **At Chapters 3, 4, and 5 the chain branches sideways** — that's the 1-to-many moment for each gate.

**Opening line:** "Quality360 is a Manufacturing Quality Intelligence Platform. Today I'm going to follow one truckload of Primary Aluminum live — from the gate, through five quality gates, into two different products, and out the door as two customer certificates. The audit log will read like a forensics report."

---

## The story we will tell

> "A 35-tonne truckload of **Primary Aluminum** from **Global Alloy Traders** rolls in at 09:00. By 17:00 we have **two finished customer shipments** out the door — and **one revised certificate** in flight. Same input, three branch points, five modules, one continuous chain of custody."

The presenter creates a brand-new chain live. Every downstream entity is sourced from the upstream entity. **Three deliberate fan-outs** prove the platform handles real manufacturing physics:

```
                                                ┌──► MB-2026-XXXXXX  (live, P1020, 30 MT)
                              ┌── PMQ-...XX ────┤
LOT-2026-XXXX  (Primary Al)   │                 └──► MB-...XX-B      (sibling heat, P1020, 28 MT, callout)
                              │
                              │                 ┌──► PB-...XX  (live, Billet for Hindalco)
                              └── from PMQ ─────┤
                                                └──► PB-...XX-B (callout — Ingot for Vedanta Domestic)

                                                ┌──► COA-...XX     (live, Hindalco International)
                              from PB ──────────┤
                                                ├──► COA-...XX-B   (live, Vedanta Domestic Client)
                                                │
                                                └──► COA-...XX-R1  (revision of Hindalco's certificate — Chapter 6)
```

| Step | Entity | Concrete demo values | Fan-out (this chapter) |
|---|---|---|---|
| 1 | Receipt | Supplier **Global Alloy Traders**, Material **Primary Aluminum**, 35 MT, PO `PO-2026-DEMO`, vehicle `MH-12-CD-9999` | 1 receipt → 1 sample → 3 tests (1-to-many at the sample) |
| 2 | Qualification | Material **Primary Aluminum**, Consumption **Casthouse**, batch `PAL-2026-DEMO`, source lot from Step 1 | — |
| 3 | Metal Batch | Grade **P1020**, Potline **PL-04**, Shift **A**, 30 MT, operator **Vikram Singh**, source qualification from Step 2 | **One qualification → two heats** (live + sibling callout) |
| 4 | Product Batch | Type **Primary Aluminum Billet**, 100 MT, operator **Vikram Singh**, customer **Hindalco International**, source metal batch from Step 3 | **One heat → two products** (live + sibling callout) |
| 5 | Certificate | Customer **Hindalco International**, product batch from Step 4 | **One product → two certificates** (Hindalco + domestic), then **certificate → revision** in Chapter 6 |

> Lot, qualification, metal batch, product batch, and certificate numbers are minted by the API at create time. Read them from the URL bar after each create. The script uses `LOT-2026-XXXX`, `PMQ-2026-XXXXXX`, `MB-2026-XXXXXX`, `PB-2026-XXXXXX`, `COA-2026-XXXXXX` as placeholders. **Keep a sticky note** — you'll reference each upstream number when you create the next entity.

### Frameworks the audience will see fire

| Framework | What surfaces in this demo |
|---|---|
| **Workbench Shell** | Header → workflow timeline → workspace → right rail — identical on every workbench. |
| **Workflow Engine** | Five `WorkflowDefinition` registrations — one engine, five sets of stages. |
| **Task Framework (new)** | Every workbench right rail has a **Related Tasks** panel — `Review → Approve → Dispatch → Release` for Step 5; per-test tasks for Steps 1–4. **My Work** in the sidebar aggregates across modules. |
| **Approval Framework** | Three-button or four-button grammar per module. Step 5 now persists a **DispatchApprovalRecord** per decision — visible in the Approval Chain panel. |
| **Audit Trail** | Every mutation funnels through `audit.record(...)`. The new **Quality Events Timeline** in Step 5 merges audit + tasks + dispatch into one chronological stream. |
| **Notifications** | Every successful mutation toasts and increments the bell. Cross-module feed. |
| **Quality Insights** | Right-rail panel pattern. Hero KPI swaps per module. Step 5 has **two** hero scores: Release Confidence + Certificate Health. |
| **Instrument Simulation** | Six-stage flow on every Import — Connecting → Verifying → Reading → Parsing → Validating → Import Successful. Same simulation, five instruments. |
| **Genealogy + Lineage** | One card grows from one node to five — and branches sideways at each fan-out. |
| **Role Gating** | `RoleGate` enforces permissions visually. Every disabled button has a tooltip naming the required role. |

---

## Chapter 1 · Receive the material  (Step 1)

> Goal: accept the truckload at the gate, draw a sample, capture the chemistry, approve the lot.
> Roles: Stores Executive → Sampler → Lab Analyst → QA Manager.

### 1.1 · Stores Executive — create the receipt

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.1.1 | **Switch role** | Topbar role chip → **Stores Executive**. | Chip text updates. |
| 1.1.2 | Stores Executive | Sidebar → **Inspection Queue**. | Land on `/inspection`. |
| 1.1.3 | Stores Executive | Click **+ New Receipt** (top-right). | Primary violet button. |
| 1.1.4 | Stores Executive | Supplier = **Global Alloy Traders**, Material = **Primary Aluminum**, Quantity = **35**, Vehicle = **MH-12-CD-9999**, PO = **PO-2026-DEMO**. | Two-column dialog. |
| 1.1.5 | Stores Executive | Click **Create receipt**. | Bottom-right. |
| 1.1.6 | — | Read the new lot number from the URL — e.g. `LOT-2026-0051`. **Sticky note it**. | `/inspection/LOT-2026-XXXX`. |

**Call out:** Toast confirms *Receipt Created*. Bell ticks. The lot number is minted server-side. Workflow timeline: **Receipt** green; **Sample** pulsing. **The lot is now waiting on a sampler — a task is already on the Sampler's queue.**

### 1.2 · Sampler — draw the sample (one receipt → one sample → three tests)

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.2.1 | **Switch role** | Topbar → **Sampler**. | Approve buttons grey out. |
| 1.2.2 | Sampler | Scroll to **Sample management** → click **Create Sample**. | Primary button. |
| 1.2.3 | — | Sample ID auto-mints to `SMP-XXXX-A`. **Three tests** auto-assigned: XRF Chemistry, OES Chemistry, Moisture. | Workflow timeline: Sample ✓, Testing pulses. |

**1-to-many callout:** "One sample, three tests, three instruments. The required test list comes from the **material master** for Primary Aluminum, not the operator. Add a fourth required test to the material and the fourth row appears on the next receipt — zero code changes."

### 1.3 · Lab Analyst — import three instrument results

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — |
| 1.3.2 | Lab Analyst | On **XRF Chemistry** row → click **Import**. | Violet button. |
| 1.3.3 | — | Watch the **6-stage modal**: Connecting → Verifying → Reading → Parsing → Validating → Import Successful (~4.5s). Four green parameter tiles: Al, Si, Fe, Cu. | Each stage emits an activity feed entry. |
| 1.3.4 | Lab Analyst | Click **Import** on **OES Chemistry** (Thermo OES-01). | One click. |
| 1.3.5 | Lab Analyst | Click **Import** on **Moisture** (Moisture-01). | One click. |

**Call out:** Same 6-stage simulation, three instruments. Each stage is a real failure point in production. Watch the right rail: **Supplier Health** climbs as parameters land; recommendation flips to **APPROVE** once the matrix is complete.

### 1.4 · QA Manager — approve the lot

| # | Role | Action | UI pointer |
|---|---|---|---|
| 1.4.1 | **Switch role** | Role chip → **QA Manager**. | Approval Center buttons come alive. |
| 1.4.2 | QA Manager | Scroll to **Approval center** → click **Approve**. | Big green button. |
| 1.4.3 | QA Manager | Confirm. | — |
| 1.4.4 | — | Toast: *Material approved successfully*. Workflow flips green: all six circles complete. Status pill → **Approved**. | Bell ticks. |

### 1.5 · Hand-off teaser

Scroll to **Genealogy** — current node is the lot; downstream slots empty. Click **View history** in the header — four audit rows already (receipt, sample, three imports, approval). Close the drawer. "**Pharma-grade audit from the first action.**"

**Framework callout (15s):** "Right rail hero KPI: Supplier Health — because Step 1's question is procurement. Next workbench, different question, different hero — same panel pattern."

---

## Chapter 2 · Qualify it for the Casthouse  (Step 2)

> Goal: prove production can consume this material.
> Roles: QA Engineer → Sampler → Lab Analyst → QA Manager.

**Bridge:** "Step 1 said *yes-from-procurement*. Step 2 has to say *yes-from-process* — can the Casthouse safely consume this material?"

### 2.1 · QA Engineer — create the qualification

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.1.1 | **Switch role** | Topbar → **QA Engineer**. | — |
| 2.1.2 | QA Engineer | Sidebar → **Process Material Qualification**. | Land on `/qualification`. |
| 2.1.3 | QA Engineer | Click **+ New Qualification**. | Primary button. |
| 2.1.4 | QA Engineer | Material = **Primary Aluminum**, Consumption area = **Casthouse**, Batch number = **PAL-2026-DEMO**, Source lot = **`LOT-2026-XXXX`** (the one from Chapter 1), Supplier = **Global Alloy Traders**, Quantity = **35**. | Two-column dialog. |
| 2.1.5 | QA Engineer | **Create qualification**. | Bottom-right. |
| 2.1.6 | — | Read the qualification number from the URL — e.g. `PMQ-2026-001246`. **Sticky note it**. | `/qualification/PMQ-2026-XXXXXX`. |

**Call out:** Toast: *Qualification created successfully*. Notice the header chip — `from LOT-2026-XXXX`. **The chain is starting to grow.**

### 2.2 · Prove genealogy is bidirectional

Click the **`from LOT-2026-XXXX`** chip in the header → lands on Chapter 1's workbench. Browser **Back** to the qualification. "**One click each direction. The chain is navigable, not decorative.**"

### 2.3 · Sampler → Lab Analyst → QA Manager

| # | Role | Action | UI pointer |
|---|---|---|---|
| 2.3.1 | **Switch role** | Topbar → **Sampler**. | — |
| 2.3.2 | Sampler | **Sample management** → **Create Sample**. | Sample ID `PMQS-XXXXXX-A`, one XRF test (Al, Si, Fe). |
| 2.3.3 | **Switch role** | **Lab Analyst**. | — |
| 2.3.4 | Lab Analyst | **XRF Chemistry** → **Import**. | 6-stage modal → three element tiles. |
| 2.3.5 | **Switch role** | **QA Manager**. | Release button live. |
| 2.3.6 | QA Manager | **Approval center** → **Release**. | Status → **Released**. |

**Call out:** Right rail — **Process Readiness ~96**, recommendation **RELEASE TO CASTHOUSE**. "Same workbench, second question, **different recommendation engine, same engine surface**. We never say *AI*. *Recommendation. Based on history. Compliance check.*"

---

## Chapter 3 · Cast the metal  (Step 3 — first fan-out: 1 qualification → N heats)

> Goal: tap a heat from the qualified material and verify chemistry.
> Roles: Casthouse Operator → Sampler → Lab Analyst → QA Manager.

**Bridge:** "Step 2 said *yes-from-process*. Step 3 is *yes-from-casting*. **And here is the first fan-out** — one qualified lot can feed multiple heats over a shift. Watch."

> Quick tab housekeeping: open `/qualification/PMQ-2026-XXXXXX` in a second tab so you can prove the 1-to-many at the end of this chapter.

### 3.1 · Casthouse Operator — create the live heat

> Use the **QA Manager** role for create. (Production: this maps to *Casthouse Operator*.)

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.1.1 | **Switch role** | Topbar → **QA Manager** (proxy for Casthouse Operator). | — |
| 3.1.2 | QA Manager | Sidebar → **Metal Quality Control** → `/metal-quality`. | Queue page. |
| 3.1.3 | QA Manager | Click **+ New Metal Batch**. | Primary button. |
| 3.1.4 | QA Manager | Grade = **P1020**, Potline = **PL-04**, Weight = **30**, Shift = **A**, Operator = **Vikram Singh**, Source qualification = **`PMQ-2026-XXXXXX`** (from Chapter 2). | Two-column dialog. |
| 3.1.5 | QA Manager | **Create metal batch**. | — |
| 3.1.6 | — | Read the heat number from the URL — e.g. `MB-2026-001246`. **Sticky note it**. | `/metal-quality/MB-2026-XXXXXX`. |

### 3.2 · Sampler → Lab Analyst — OES the heat

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.2.1 | **Switch role** | **Sampler**. | — |
| 3.2.2 | Sampler | **Sample management** → **Create Sample**. | Sample `MQS-XXXXXX-A`, **OES Chemistry** assigned (Si, Fe, Cu, Mg, Zn, Ti, Mn on Thermo OES-01). |
| 3.2.3 | **Switch role** | **Lab Analyst**. | — |
| 3.2.4 | Lab Analyst | **OES Chemistry** → **Import**. | 6-stage modal. **Seven element tiles** populate. |

### 3.3 · The Chemistry Correction Advisor (Phase 3 signature)

Scroll to the **Chemistry Correction Advisor** card.

| Step | What to do | What to say |
|---|---|---|
| 3.3.1 | Advisor is quiet on this batch (chemistry mid-spec). | "**Silent because the heat is on-target.** No noise, no false positives." |
| 3.3.2 | (Optional 30s) Second tab → `/metal-quality/MB-2026-001242` (seeded on-hold sibling, Fe near upper limit). | "On this sibling the advisor fires: how far off-target, which additive, how many kg, expected chemistry after addition. **Rule-based, advisory, never *AI*.**" |

### 3.4 · QA Manager — release for casting

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.4.1 | **Role stays** | QA Manager. | — |
| 3.4.2 | QA Manager | **Approval center** → **Release**. | Status → **Released**. **Metal Compliance ~98**, **Casting Readiness: READY**. |

### 3.5 · 🪞 1-to-many fan-out — tap a second heat from the same qualification (90s)

**This is the moment.** Same qualification, second heat.

| # | Role | Action | UI pointer |
|---|---|---|---|
| 3.5.1 | QA Manager | Sidebar → **Metal Quality Control** → **+ New Metal Batch**. | — |
| 3.5.2 | QA Manager | Grade = **P1020**, Potline = **PL-04**, Weight = **28**, Shift = **B**, Operator = **Anil Sharma**, Source qualification = **the same `PMQ-2026-XXXXXX`**. | — |
| 3.5.3 | QA Manager | **Create metal batch**. | New heat — e.g. `MB-2026-XXXXXX-B`. |
| 3.5.4 | — | (Optional) Sampler → Lab Analyst → import OES → QA Manager → Release. Or skip the testing and leave this sibling in *Pending Testing* — the fan-out is already proven. | — |
| 3.5.5 | — | Switch back to the second tab on `/qualification/PMQ-2026-XXXXXX`. Scroll to **Material Lineage** in the right rail. Children now lists **two metal batches** — `MB-...A` (Released) and `MB-...B` (Pending). | Right rail of the qualification workbench. |

**Call out:** "**One qualified lot, two heats — and the qualification workbench shows both as children, with status.** That's the lineage framework. The chain isn't a list — it's a tree, and the engine knows it. If a QA Manager later finds an issue with the qualified material, **both heats light up in the lineage view at once.**"

### 3.6 · Genealogy — chain is three nodes deep, with a branch

Return to the live heat (`MB-...A`) and scroll to the **Genealogy** card. The chain is now **`LOT → PMQ → MB`** with the sibling heat shown as a sister node. Click the lot — lands on Chapter 1's workbench. Browser Back. "**One framework, one card, two nodes deep and one branch wide.**"

---

## Chapter 4 · Billet (and ingot) from the same heat  (Step 4 — second fan-out: 1 heat → N products)

> Goal: cast the heat into product, with a second product type called out from the same heat.
> Roles: Production Operator (= Stores Executive) → Sampler → Lab Analyst → QA Manager.

**Bridge:** "Step 3 said *yes-from-casting*. Step 4 says *yes-from-product*. **Second fan-out**: a single heat can roll different product types in the same shift — billet for one customer, ingot for another. Watch the same heat produce two products."

### 4.1 · Production Operator — register the live product batch (Billet for Hindalco)

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.1.1 | **Switch role** | **Stores Executive**. | — |
| 4.1.2 | Stores Executive | Sidebar → **Product Quality Testing** → `/product-quality`. | Queue page. |
| 4.1.3 | Stores Executive | Click **+ New Product Batch**. | — |
| 4.1.4 | Stores Executive | Product type = **Primary Aluminum Billet**, Source metal batch = **`MB-2026-XXXXXX`** (from Chapter 3), Weight = **70**, Customer = **Hindalco International**, Operator = **Vikram Singh**. | The metal-batch dropdown only lists **Released** batches. |
| 4.1.5 | Stores Executive | **Create product batch**. | — |
| 4.1.6 | — | Read the new product batch number — e.g. `PB-2026-000211`. **Sticky note it**. | `/product-quality/PB-2026-XXXXXX`. |

### 4.2 · Sampler → Lab Analyst — 6 tests, 3 capture modes

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.2.1 | **Switch role** | **Sampler**. | — |
| 4.2.2 | Sampler | **Product sample** → **Create Sample**. | Sample `PQS-XXXXXX-A`. **Six tests** across four categories (UTS / Hardness / Conductivity / Dimensions / Microstructure / Visual). |
| 4.2.3 | **Switch role** | **Lab Analyst**. | — |
| 4.2.4 | Lab Analyst | **UTS** → **Import** (UTS-01). | 6-stage modal. Three parameters (UTS / Yield / Elongation). |
| 4.2.5 | Lab Analyst | **Hardness** → **Import**. | 1 parameter. |
| 4.2.6 | Lab Analyst | **Conductivity** → **Manual** → reason "External Lab" → enter value 61. | Manual capture with mandatory reason. |
| 4.2.7 | Lab Analyst | **Dimensions & Weight** → **Upload** → drop any file. | File parser flow. |
| 4.2.8 | Lab Analyst | **Microstructure Review** → **Import**. | GrainSize, Phase. |
| 4.2.9 | Lab Analyst | **Visual Inspection** → **Manual** → SurfaceDefects = 1, reason "Visual inspection by analyst". | Within tolerance. |

**Call out:** "All three capture modes — instrument, manual, upload — in one chapter, four test categories. Watch **Product Compliance** climb 60 → 78 → 91 → 97. Release Readiness flips REVIEW → **READY**. Recommendation **APPROVE PRODUCT**."

### 4.3 · QA Manager — approve

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.3.1 | **Switch role** | **QA Manager**. | — |
| 4.3.2 | QA Manager | **Approval center** → **Approve Product**. | Status → **Approved**. |

### 4.4 · 🪞 1-to-many fan-out — second product from the same heat (90s)

Now demonstrate the heat → multiple products relationship.

| # | Role | Action | UI pointer |
|---|---|---|---|
| 4.4.1 | Stores Executive | `/product-quality` → **+ New Product Batch**. | — |
| 4.4.2 | Stores Executive | Product type = **Primary Aluminum Ingot**, Source metal batch = **the same `MB-2026-XXXXXX`**, Weight = **20**, Customer = **Vedanta Domestic**, Operator = **Anil Sharma**. | — |
| 4.4.3 | Stores Executive | **Create product batch**. | New product — e.g. `PB-...-B`. |
| 4.4.4 | — | Open a second tab to `/metal-quality/MB-2026-XXXXXX` → scroll to **Material Lineage** in the right rail. Children now lists **two product batches** with type chips: Billet (Hindalco) and Ingot (Vedanta Domestic). | Right rail of the heat workbench. |

**Call out:** "**Same heat. Two products. Two customers.** Watch how the heat's lineage panel shows both children with their target customers. **If we recall this heat tomorrow because of a chemistry issue, the impact analysis is one query — both downstream products light up.**"

### 4.5 · Genealogy — four nodes, branching twice

Scroll to **Genealogy** on the active product batch. The chain is now **`LOT → PMQ → MB → PB`** — current node highlighted. Click the metal batch — lands on Chapter 3's workbench, where the sister heat is visible. Browser Back. "**Four modules. Four nodes. Two branches. Same card. The framework grew sideways automatically.**"

---

## Chapter 5 · Certify and dispatch  (Step 5 — third fan-out: 1 product → N certificates)

> Goal: bind every upstream piece of evidence into a customer-signed document, run the new task chain, and demonstrate certificate health alongside release confidence. Then certify the second customer from the same batch.
> Roles: QA Engineer → QA Manager → Dispatch Executive (= QA Manager).

**Bridge:** "Steps 1–4 each answered one question and emitted evidence. **Step 5 binds that evidence into a customer-signed document** — and now demonstrates the new enterprise hardening: task chain, certificate health, margin analysis, copy-on-revise versioning, and a public verify page reachable by QR. **Slow down here.**"

### 5.1 · QA Engineer — generate the live certificate

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.1.1 | **Switch role** | **QA Engineer**. | — |
| 5.1.2 | QA Engineer | Sidebar → **Certificate & Dispatch** → `/certificates`. | Queue page. |
| 5.1.3 | QA Engineer | Click **+ Generate Certificate**. | — |
| 5.1.4 | QA Engineer | Product batch = **`PB-2026-XXXXXX`** (Hindalco's billet from Chapter 4), Customer = **Hindalco International**. Optionally tighten Iron to 0.15 max to demonstrate the validation engine. | — |
| 5.1.5 | QA Engineer | **Generate certificate**. | Read the new number — e.g. `COA-2026-001246`. **Sticky note it**. |

**Call out:** "Toast: *Certificate generated for Hindalco International*. Status: **Draft**. Dispatch: **Pending**. Workflow strip lands on Stage 2 of 5 — Customer Validation. **And the task framework just emitted four tasks** — Review → Approve → Approve Dispatch → Release. Watch the right rail."

### 5.2 · Walk the workbench top to bottom

The Step 5 workbench is now the densest in the platform. Each panel reuses an existing framework but composes the certificate's specific story.

| # | Section | What to call out |
|---|---|---|
| 5.2.1 | **Certificate header** | Status pill, version chip (**v1**), customer, source product batch. Buttons: **Refresh · History · Preview · Print · Download · Issue**. "QR and barcode are not on the workbench overview anymore — they live where the customer needs them: the printed PDF and the public verify page." |
| 5.2.2 | **Certificate overview** | Identification block + digital signature placeholder. Signature flips from `—` to `SHA256:…` the moment QA Manager issues. |
| 5.2.3 | **Customer Specification Validation** | The 11-row contract grammar. **New: Margin column** — a tone-coded bar from Safe → Tight → Breach. "Iron is at 0.13 against 0.15 — 87% of band consumed — the row is **Tight**. The bar lets QA spot brittle compliance at a glance." |
| 5.2.4 | **Traceability Summary card** | Five rows: Supplier Lot → Qualification → Metal Batch → Product Batch → Certificate. One compact card that *links* — auditors love it. |
| 5.2.5 | **Quality Results Summary** | Per upstream step, with compliance score and link back. The roll-up auditors want. |
| 5.2.6 | **Quality Events Timeline** | **New.** Merged chronological feed of audit + dispatch decisions + task lifecycle. "This is the answer to *what happened to this certificate, when, by whom?* — without leaving the workbench." |
| 5.2.7 | **Genealogy Expanded View** | All five nodes vertical. **First time the full ladder is on screen.** |

### 5.3 · Right rail — the two hero KPIs side by side

| # | Action | What to call out |
|---|---|---|
| 5.3.1 | **Release Confidence** tile (left half of the Insights panel). | "~99/100. 60 points from customer-spec pass, 25 from upstream product compliance, 10 from chain coverage, 5 base. **Transparent math.**" |
| 5.3.2 | **Certificate Health** tile (right half) — **new**. | "**Separate from Release Confidence.** Health is about the certificate as a document — Data Completeness, Spec Coverage, Signature Presence, Freshness. Each scores 0–25. We're at 25/25/15/0 right now — signature unlocks at 25 the moment QA Manager issues, freshness scores 25 because issuance is *today*. **Confidence is about the metal. Health is about the document.**" |
| 5.3.3 | Recommendation + risk tile. | **APPROVE DISPATCH**, risk **Low**, 11 of 11 customer parameters pass. |
| 5.3.4 | **Approval Chain panel** — new. | Four stages: Generated → Reviewed → Approved → Released. Currently only *Generated* shows an actor. "**Every stage is a role-named, timestamped commitment.** This is what regulators want when they ask *who signed?*" |
| 5.3.5 | **Versions panel** — new. | One version: v1 · Draft · current. "Watch this list grow in Chapter 6." |
| 5.3.6 | **Certificate tasks** — new (from the platform Task Framework). | Four tasks: Review (Assigned, QA Engineer), Approve, Approve Dispatch, Release (each Waiting on the previous). "Same `RelatedTasksPanel` we use on the product batch workbench. **The certificate workflow is the task workflow** — the audience sees it from this single panel without us narrating it." |

### 5.4 · Certificate Preview (button in the header)

Click **Preview** in the header.

The dialog renders the **printable COA layout** — header band, identification, QR (real scannable code), the 11-row spec table with **Margin column**, barcode at the footer, signature line. "**This is what the PDF and the customer's printed copy look like.** Hit Print to send it to the office printer. Hit Download to grab the PDF. No surprise between preview and printout."

Close the dialog.

### 5.5 · QA Manager — issue the certificate

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.5.1 | **Switch role** | **QA Manager**. | Issue button live. |
| 5.5.2 | QA Manager | Click **Issue Certificate** in the header. | — |
| 5.5.3 | QA Manager | Confirm. | — |
| 5.5.4 | — | Status flips Draft → **Issued**. Dispatch flips Pending → **Ready**. Workflow strip → Stage 3 of 5. **Digital signature flips from `—` to `SHA256:…`.** | Bell ticks. |

**Watch the right rail:**

- **Certificate Health** jumps — *Signature Presence* 15 → 25, *Freshness* 0 → 25. Score ~95/100.
- **Approval Chain** — *Reviewed* row now shows QA Manager + timestamp.
- **Certificate tasks** — *Review* now Completed; *Approve* unblocked (Assigned); the rest still Waiting.
- **Quality Events Timeline** — three new rows (issue + two task transitions).

### 5.6 · Dispatch Executive — approve dispatch

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.6.1 | **Role stays** | **QA Manager** (Dispatch Executive maps to qa-manager per PRD). | — |
| 5.6.2 | Dispatch Executive | Scroll to **Dispatch Approval** → click **Approve Dispatch**. | Big green button. |
| 5.6.3 | Dispatch Executive | Confirm. | — |
| 5.6.4 | — | Dispatch flips Ready → **Approved**. **DispatchApprovalRecord** persisted (visible at the bottom of the Approval Chain panel). | — |

Click **Release** in the dispatch panel to mark the shipment released. Status → **Released**.

**Watch the right rail again:**

- **Approval Chain** — *Approved* row + *Released* row both populated.
- **Dispatch decisions** sub-list shows the Approve + Release records with actor, role, timestamp.
- **Certificate tasks** — Approve, Approve Dispatch, Release all Completed.
- **Events timeline** — 8+ rows now.

### 5.7 · 🪞 1-to-many fan-out — second certificate for the second customer (90s)

Now the third fan-out: same product batch, second customer.

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.7.1 | **Switch role** | **QA Engineer**. | — |
| 5.7.2 | QA Engineer | Sidebar → **Certificate & Dispatch**. | Queue page. |
| 5.7.3 | QA Engineer | **+ Generate Certificate** → Product batch = **the second product from Chapter 4 (`PB-...-B`, the ingot)**, Customer = **Vedanta Domestic**. | — |
| 5.7.4 | QA Engineer | **Generate certificate**. | New cert — e.g. `COA-...-B`. |

**Call out:** "Same metallurgy, different customer, different contract. **The customer spec is regenerated against the customer's requirements** — `Vedanta Domestic`'s tolerances are tighter on Iron, so a Tight margin badge appears where Hindalco's was Safe. **One workbench, infinite customer contracts.**"

| # | Role | Action | UI pointer |
|---|---|---|---|
| 5.7.5 | **Switch role** | **QA Manager**. | — |
| 5.7.6 | QA Manager | **Issue Certificate** → **Approve Dispatch** → **Release**. | Status → **Issued · Released**. |

Open a third tab to `/product-quality/PB-...-B` → scroll to **Material Lineage** → children now shows the two certificates (Hindalco + Vedanta Domestic) sitting under the same product batch. "**One product, two contracts, two QR codes, two PDFs. The lineage shows the fan-out.**"

---

## Chapter 6 · The customer revision  (Step 5 — fourth fan-out: 1 certificate → N versions)

> Goal: prove copy-on-revise versioning with an immutable history.
> Roles: QA Engineer / QA Manager.

**Bridge:** "Hindalco's contracts team calls — they want Aluminum oxide explicitly on the certificate even though it was within spec. **Issued certificates are immutable**, so we revise."

### 6.1 · QA Manager — create the revision

| # | Role | Action | UI pointer |
|---|---|---|---|
| 6.1.1 | Navigate | Open Hindalco's certificate — `/certificates/COA-2026-XXXXXX` (the one issued in Chapter 5). | — |
| 6.1.2 | QA Manager | Right rail → **Versions** panel → click **Create revision**. | Dialog opens. |
| 6.1.3 | QA Manager | Revision reason = "Customer (Hindalco contracts) requested explicit Al₂O₃ row added." | — |
| 6.1.4 | QA Manager | **Create revision**. | Toast: *Certificate revised*. New certificate number — e.g. `COA-2026-XXXXXX-R1`. Lands on the **new revision's** workbench. |

**Call out (and this is the moment):**

- The new certificate has **version 2** in its chip.
- The **Versions** panel lists both v1 and v2.
- Header shows `Revision of COA-2026-XXXXXX · Customer (Hindalco contracts) requested…` — provenance is on the wall.
- Click the v1 link in the Versions panel → land on the original certificate. Its status is now **Revised**. The body is unchanged — **immutable history**. Browser Back.
- The new v2 is a fresh **Draft** with its own 4-task chain. Watch the Tasks panel — Review is back at Assigned for QA Engineer.

### 6.2 · Run v2 through the chain

QA Engineer reviews the spec → QA Manager **Issue Certificate** → **Approve Dispatch** → **Release**. ~30 seconds. The v2 number is what Hindalco gets.

**Versions panel now shows two rows** — v1 (Revised, locked) and v2 (Issued · Released, current). The audit log spans both. **No prior data was rewritten.**

---

## Chapter 7 · Verify in the wild  (Step 5 — the customer's view)

> Goal: prove that the QR on the customer's printed COA leads to a public, read-only attestation.
> Roles: any (the verify page has no auth).

**Bridge:** "Six months from now Hindalco's auditor asks *is this certificate real?* They scan the QR on the printed shipping label. **Here is what they see.**"

### 7.1 · Download the customer-facing PDF

| # | Role | Action | UI pointer |
|---|---|---|---|
| 7.1.1 | QA Manager | Open `/certificates/COA-...-R1` (the v2 Hindalco certificate). | — |
| 7.1.2 | QA Manager | Header → **Download**. The PDF opens / downloads. | — |
| 7.1.3 | — | Walk the PDF top to bottom: header band, **scannable QR top-right** pointing at `/verify/COA-...`, identification rows (Customer / Product Batch / Metal Batch / Qualification / Lot / Reviewed By / Approved By / Released By), customer spec table with Margin column, Release Confidence + Certificate Health summary, **Code128 barcode** footer, digital signature line. | — |

### 7.2 · Scan the QR — or open the verify URL directly

Two ways to demonstrate:

**Option A — the dramatic one.** Hold a phone over the PDF on screen. The phone camera reads the QR. The phone browser opens `http://localhost:3000/verify/COA-2026-XXXXXX-R1`. (For this to work the phone must be on the same network as your dev server — or use the second browser window staged in 0.6 instead.)

**Option B — the safe one.** Paste the verify URL into the second browser window staged in 0.6.

### 7.3 · The verify page

The page renders with **no AppShell** — no sidebar, no topbar, no role chip. Just:

- A **Verified Authentic** banner in green (or *Draft Certificate* in amber if the cert is unissued).
- Certificate Number · Customer · Status · Product Batch · Metal Batch · Qualification · Source Lot · Issued / Issued by.
- The same QR code, large.
- **Customer compliance: 11 / 11** progress bar.
- Release Confidence + Certificate Health KPIs.
- *Verified at [timestamp]* · *v2* · *Open workbench →* link.

**Call out:** "**Same data, different audience.** No customer login. No password. No app to install. They scan, they see *Verified Authentic*, they see what their contract says vs what they got, and they see who approved it. **This is the difference between a Certificate of Analysis and a piece of paper.** And the audit chain behind it is the entire 30-minute story we just told."

---

## Chapter 8 · The traceability close

> Goal: prove the chain is searchable end-to-end across the tree we just built.

### 8.1 · Open the traceability dashboard

Sidebar → **Traceability**. KPI strip: Active Lots, In Testing, Awaiting Approval, Released, Certificates Generated, Coverage %.

### 8.2 · Search by lot number

Type **`LOT-2026-XXXX`** (the lot from Chapter 1) into the search box. **Eight hits come back**:

1. The lot itself.
2. The qualification.
3. The live heat (`MB-...-A`).
4. The sibling heat (`MB-...-B`).
5. The Hindalco billet (`PB-...-A`).
6. The Vedanta ingot (`PB-...-B`).
7. The Hindalco certificate v1 (`COA-...`) — Revised.
8. The Hindalco certificate v2 (`COA-...-R1`) — Released.
9. The Vedanta certificate (`COA-...-B`) — Released.

(Depending on revision sub-steps, you may also see intermediate states.)

**"One input. Three fan-outs. Nine nodes in the search hit list. Same chain, fully searchable."**

### 8.3 · Click the v2 hit → certificate workbench → genealogy → click any upstream node

The **Genealogy Expanded View** on the v2 workbench is the full 5-node ladder + revision sibling + sibling product + sibling heat. **Five clicks back to the supplier delivery; one click sideways to any branched node.**

### 8.4 · Same data, two audiences

- **The customer** sees `verify/COA-...-R1` and the printed PDF — one document each.
- **The auditor** sees that same document, but every link in the workbench is live. Customer-spec table → Traceability Summary → Genealogy → click any upstream node → land in that workbench → View history → diff any audit row. **Same chain, different reading.**

### 8.5 · The auditor moment

> "Customer complaint comes in six months from now? Scan the QR on the shipping label, or paste the cert number into the search box. You get the whole quality lineage — instrument provenance, sampler ID, every result captured, every decision made with reasons, the revision history, the dispatch chain, the released-by and the approved-by. **That's what auditors want — and that was on screen the whole time the team was working.**"

---

## Chapter 9 · The framework angle  (60-second close)

> The whole demo was an existence proof. This chapter is the architecture argument.

| # | Talking point | What to show |
|---|---|---|
| 9.1 | "**Five workbenches, one shell.**" | Toggle quickly between `/inspection/LOT-...`, `/qualification/PMQ-...`, `/metal-quality/MB-...`, `/product-quality/PB-...`, `/certificates/COA-...`. Same header → timeline → workspace → right rail every time. |
| 9.2 | "**Tasks are framework-level.**" | Open **My Work** in the sidebar — the table mixes tasks from all five modules. Each row carries a deep link to its workbench. **Step 5's 4-task chain is not Step 5 code — it's a `RelatedTasksPanel` over the same engine that drives Step 4's per-test tasks.** |
| 9.3 | "**Approvals are framework-level.**" | Open the Approval Chain on the v2 certificate and the Approval center on any earlier module. Same grammar — actor / role / decision / reason / timestamp. The DispatchApprovalRecord on Step 5 is a thin schema over the same persistence pattern. |
| 9.4 | "**Quality Insights — pattern, not panel.**" | Right rail surfaced Supplier Health → Process Readiness → Metal Compliance → Product Compliance → **Release Confidence + Certificate Health** across the five workbenches. The hero KPI swaps; the engine surface doesn't. |
| 9.5 | "**Lineage is a tree, not a list.**" | The qualification has two child heats. The heat has two child products. The product has two child certificates. The Hindalco certificate has two versions. **One `LineageLink` schema, one panel.** |
| 9.6 | "**Audit + Events Timeline are framework-level.**" | The Step 5 events timeline merges audit + tasks + dispatch — three streams, one chronological log, one card. Adding a new event source is one tuple in `_audit_severity` plus a new event-builder block. |
| 9.7 | "**Instrument Simulation is the same 6-stage flow on five different instruments.**" | XRF, OES, UTS, Hardness, Microscope, file parser — all reuse the same staged flow with deterministic mock values per `(instrument, sample)`. |
| 9.8 | "**QR + Code128 + PDF + Public Verify — production-grade Phase 5.**" | `qrcode` + `python-barcode` for scannable artifacts. `reportlab` for the PDF. `/verify/<n>` for the customer-facing attestation. No proprietary mock. |
| 9.9 | "**Adding Heat Chemistry (Step 6), Casting Quality (Step 7), Mechanical Testing (Step 8), MTC Dispatch (Step 9) is one workflow registration + a section composition + a tuned readiness function. No framework code changes. We just proved the architecture is real.**" | — |
| 9.10 | "**This is not a LIMS. This is not a SAP screen. This is not an Excel replacement.**" | Per the canonical spec: *Modern Manufacturing Control Tower. Enterprise SaaS. Production application.* The reads-in-three-to-five-seconds discipline carried through every chapter. |

---

## Quick reference · The tree you built

```
LOT-2026-XXXX  (Approved)
  └── PMQ-2026-XXXXXX  (Released)
        ├── MB-2026-XXXXXX     (Released)
        │     ├── PB-2026-XXXXXX     (Approved — Hindalco billet)
        │     │     ├── COA-2026-XXXXXX        (Revised → v1 locked)
        │     │     └── COA-2026-XXXXXX-R1     (Issued · Released → Hindalco's certificate of record)
        │     └── PB-2026-XXXXXX-B   (Approved — Vedanta ingot)
        │           └── COA-2026-XXXXXX-B      (Issued · Released)
        └── MB-2026-XXXXXX-B   (Pending — sibling heat, optional callout)
```

| Step | Entity | Roles touched | Terminal status |
|---|---|---|---|
| 1 | `LOT-2026-XXXX` | Stores Exec · Sampler · Lab Analyst · QA Manager | Approved |
| 2 | `PMQ-2026-XXXXXX` | QA Engineer · Sampler · Lab Analyst · QA Manager | Released |
| 3 | `MB-2026-XXXXXX` + sibling | Casthouse Op · Sampler · Lab Analyst · QA Manager | Released / Pending |
| 4 | `PB-2026-XXXXXX` + sibling | Production Op · Sampler · Lab Analyst · QA Manager | Approved (both) |
| 5 | `COA-2026-XXXXXX` (Hindalco v2) + `COA-2026-XXXXXX-B` (Vedanta) | QA Engineer · QA Manager · Dispatch Exec | Issued · Released |

---

## Quick reference · If something breaks live

| Symptom | Fix |
|---|---|
| Pages 404 / Network error | API died. Ctrl+C in Window A → rerun `uvicorn`. Frontend reconnects in ~4s. |
| PDF / QR / Barcode endpoint returns 503 | Missing Python deps. `pip install -r requirements.txt` (qrcode, python-barcode, reportlab). |
| QR scan from phone fails | Phone not on same network. Use the staged second browser window from Step 0.6. |
| Stale data after a create | Ctrl+R / Cmd+R. React Query also refetches on focus. |
| Need to reset the demo state | Restart `uvicorn` — in-memory store reseeds both phase heroes and the demo chain. |
| A button is greyed out | Wrong role. Switch to **QA Manager** — unlocks every action. Hover for the required role tooltip. |
| Bell isn't ticking | Poll runs every ~4s. If silent for >10s, the API died — see row 1. |

---

## Lightning version (12 minutes)

If you only have twelve minutes:

1. **The pitch** (45s) — one truckload, three fan-outs, two customers, one revision. Five modules, one chain.
2. **Receipt + sample + XRF Import + Approve** (90s) — `/inspection` → + New Receipt (Global Alloy, Primary Aluminum, 35 MT) → Sampler creates sample → Lab Analyst imports XRF → QA Manager approves.
3. **Qualification + XRF + Release** (75s) — `/qualification` → + New Qualification (Casthouse, source lot) → Sampler → Lab Analyst → QA Manager Releases. **Process Readiness ~96.**
4. **Metal batch + OES + Release + sibling heat** (120s) — `/metal-quality` → + New Metal Batch (P1020, PL-04, source PMQ) → Sampler → Lab Analyst imports OES → QA Manager Releases. **Then create a second heat from the same qualification (60s) → show the qualification's Material Lineage panel listing both children.** *First fan-out.*
5. **Product batch + 2 imports + Approve + sibling ingot** (120s) — `/product-quality` → + New Product Batch (Billet, Hindalco, source MB) → Sampler → Lab Analyst Imports UTS + Hardness → QA Manager Approves. **Then create a second product (Ingot for Vedanta Domestic) from the same heat → show the heat's Material Lineage with both products.** *Second fan-out.*
6. **Certificate + Issue + Approve Dispatch + Release** (120s) — `/certificates` → + Generate Certificate (Billet PB, Hindalco) → walk the workbench (Release Confidence + Certificate Health side by side, Margin column, Approval Chain, Tasks panel) → QA Manager Issues + Approves Dispatch + Releases.
7. **Second certificate for second customer** (45s) — + Generate Certificate (Ingot PB, Vedanta Domestic). *Third fan-out.*
8. **Revise Hindalco's certificate** (60s) — Right-rail **Create revision** with reason → new v2 → Issue → Approve Dispatch → Release. **Versions panel now shows v1 (Revised) and v2 (Issued).** *Fourth fan-out.*
9. **Scan the QR / open the verify URL on the second browser** (45s) — Verified Authentic, compliance 11/11, v2.
10. **Traceability search** (45s) — `/traceability` → paste the lot number → 9 hits, every branch visible.
11. **Framework close** (45s) — five workbenches, one shell. Tasks, approvals, audit, notifications, lineage — all registered, not rewritten. PDF + QR + verify page are production-grade.
12. **Done.**

---

## Closing line for either version

> "One truckload. Three fan-outs. One revision. Two customer-signed certificates verified by QR. Thirty minutes — or twelve if we're hurrying — and the audit trail reads like a forensics report. **That's not a LIMS. That's a Manufacturing Quality Intelligence Platform.**"
