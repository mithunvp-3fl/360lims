# Quality360 — Phase 2 Demo Script

End-to-end walkthrough of the **Process Material Qualification** module. Same format as `DEMO.md`: every action says **what to click**, **where to look**, **which role to be in**, and gives a **1–2 line brief** so you can narrate.

**Estimated run time:** ~15 minutes for the full script, ~6 minutes for the lightning version (chapters 0, 1, 3, 5).

---

## How Phase 2 connects to Phase 1

Phase 1 (**Incoming Material Inspection**) answers a procurement question:

> "Can we **accept** this material from the supplier?"

Phase 2 (**Process Material Qualification**) answers a production question:

> "Can production **consume** this material safely and efficiently?"

A typical batch flows across both modules:

```
   Supplier ─┐                                   ┌─► Carbon Plant
            │  Step 1 — Incoming Inspection      │
            ▼  (LOT-2026-0042, Calcined Coke)    │  Step 2 — Process Qualification
   Receipt → Sample → Testing → Validation →    →  (PMQ-2026-001245, batch CC-2026-015)
            Review → Release (Approved)         Request → Sample → Testing → Validation →
                                                Review → Release to Carbon Plant
   Casthouse, Potline, R&D ◄────────────────────┘
```

The same calcined coke lot that passed Phase 1 (`LOT-2026-0042` from ABC Metals) becomes the **source lot** for the Phase 2 hero qualification (`PMQ-2026-001245`, batch `CC-2026-015`). The workbench links back to the source receipt with one click.

**What's reused, not rebuilt:**

| Framework | Reused |
|---|---|
| Workbench shell | ✓ Same layout (header → timeline → workspace → right rail) |
| Workflow engine | ✓ New definition `process-material-qualification` registered alongside `incoming-inspection` |
| Audit trail | ✓ Same `audit.record(...)` — entity types `qualification`, `qualification-sample`, etc. |
| Notification framework | ✓ Same `notif.emit(...)` — events surface in toasts + bell |
| Approval framework | ✓ Same pattern (decision + reason mandatory for Hold/Reject) |
| Quality Insights | ✓ Engine pattern reused; hero KPI swaps Supplier Health → **Process Readiness** |
| Instrument Simulation | ✓ Same 6-stage flow, swapped instruments (CSA-01, PYC-01, APA-01, ERA-01, etc.) |
| Role permission | ✓ Same `RoleGate` — new permissions: `qualification:create`, `qualification:release`, `qualification:hold`, `qualification:reject` |

**What's new (business logic only, per PRD §31):**

- New entities — `Qualification`, `QualificationSample`, `QualificationTest`, `QualificationResult`, `QualificationApproval`
- New status set — `Pending Sampling → Pending Testing → Under Review → Released / On Hold / Rejected`
- New decision set — `Release` / `Hold` / `Reject` (replaces `Approve` / `Hold` / `Reject` in vocabulary)
- New hero KPI — **Process Readiness Score (0–100)** computed from test completion, spec compliance, historical stability, deviation count, risk indicators (PRD §21)
- New recommendation set — `RELEASE` / `REVIEW` / `HOLD` / `REJECT` plus the target area, e.g. `RELEASE TO CARBON PLANT` (PRD §22)
- New consumption areas — Carbon Plant, Potline, Casthouse, R&D
- New materials — Calcined Coke, Coal Tar Pitch, Cryolite, Aluminum Fluoride, Bath Material, Carbon Additive, Pet Coke

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Sign in as **Priya Menon** (or any persona — QA Manager unlocks every action). | You should land on `/dashboard`. |
| 0.5 | Confirm the **bell icon** (top-right of topbar) shows a number. The notification stream includes Phase 1 and Phase 2 events. | Top-right, beside the role chip. |

**Talking point:** "Quality360 Phase 2 is **Process Material Qualification** — the module that decides whether production can consume a batch. Same workbench, same audit, same notifications as Phase 1. The only thing that's new is the business logic that turns chemistry into a Process Readiness Score."

---

## Chapter 1 · The hand-off from Step 1 (Role: QA Manager)

> Goal: prove Phase 2 is a continuation of Phase 1, not a separate app.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 1.1 | Sidebar → **Inspection Queue**. | Left rail, *Operate* group. | "This is where Phase 1 lives. Notice `LOT-2026-0042` at the top — Aluminum Scrap from ABC Metals." |
| 1.2 | Click **`LOT-2026-0042`**. | Lot link, queue table. | "Workbench from Phase 1. All chemistry compliant, recommendation was Approve, status is now Approved." |
| 1.3 | Point at the lot's status pill in the header. | Green *Approved* pill. | "This lot has been accepted from the supplier. But production hasn't consumed it yet — that's a separate decision." |
| 1.4 | Sidebar → **Process Material Qualification** under the new **Quality Operations** group. | Left rail, between *Operate* and *Configure*. | "Same sidebar. New module. Same shell." |
| 1.5 | Land on `/qualification`. | Queue page titled *Process Material Qualification*. | "This is the Phase 2 queue. Every batch in front of production lives here." |
| 1.6 | In the queue, point at the row **`PMQ-2026-001245`** (top). | Top row of the table. | "Hero qualification. Material is Calcined Coke, batch CC-2026-015, consumption area Carbon Plant. Status: Under Review." |
| 1.7 | Point at the small grey text under the qualification number. | "`from LOT-2026-0042`". | "**This is the link back to Step 1.** Same batch we just looked at on the inspection side. Phase 1 approved it from the supplier; Phase 2 decides whether the Carbon Plant should consume it." |

**Talking point:** "Step 1 said yes-from-procurement. Step 2 has to say yes-from-process. The chemistry is the same; the question is different."

---

## Chapter 2 · The Qualification Queue (Role: QA Manager)

> Goal: prove the queue covers every state and supports the four operator actions (Create / Open / Clone / Cancel).

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.1 | Look at the **status pills** at the top of the table. | Pills: All · Pending Sampling · Pending Testing · Under Review · Released · On Hold · Rejected. | "Seven status filters, count-per-status next to each. Mirrors the Phase 1 queue ergonomics." |
| 2.2 | Look at the **area filter chips** (top-right of the table). | Chips: All · Carbon Plant · Potline · Casthouse · R&D. | "Filter by consumption area — Carbon Plant for anode-feed materials, Potline for bath chemistry, Casthouse for alloying inputs, R&D for trials." |
| 2.3 | Click **Carbon Plant**. | Chip turns violet. | "Only Carbon Plant qualifications shown. Notice the queue is dominated by Calcined Coke and Pet Coke." |
| 2.4 | Click **All** to reset. | — | — |
| 2.5 | Point at the **Risk pill** column. | Green/amber/red Low/Medium/High. | "Same risk grammar as Phase 1. PMQ-2026-001242 is amber — sulphur trending high, that's why it's On Hold." |
| 2.6 | Click the **⋯ menu** on `PMQ-2026-001245`. | Drop-down. | "Two actions: Clone qualification, Cancel. Clone is for repeat batches with the same supplier and area — saves 30 seconds of form filling." |
| 2.7 | Close the menu. Click **`PMQ-2026-001245`**. | Qualification link. | "Lands on the workbench." |

---

## Chapter 3 · The Workbench, top to bottom (Role: QA Manager)

> Goal: show the marquee screen for Phase 2 — every step of a batch's qualification on one workspace.

### 3.1 · Header

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.1.1 | Look at the header card. | Qualification number in 30px, status pill (*Under Review*), risk pill (*Low*), "Process Material Qualification" badge, **violet Carbon Plant chip** to the right. | "Qualification number, status, risk, consumption area — readable from the back of the room. The Carbon Plant chip is the answer to ‘what consumes this'." |
| 3.1.2 | Scan the four mini-fields under the title. | *Material* (Calcined Coke), *Batch* (CC-2026-015), *Quantity* (24.5 MT, Source LOT-2026-0042), *Assigned* (Ravi Iyer). | "The Source row links back to the inspection lot — one click takes you to the Phase 1 record." |
| 3.1.3 | Hover the **View history** button. | Outline button with a clock icon. | "Same audit drawer as Phase 1 — every mutation across the qualification, samples, tests, results is one click away." |

### 3.2 · Workflow Progress

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.2.1 | Look at the **Workflow progress** card. | Six dots: Request → Sample → Testing → Validation → Review → Release. Four green ✓, Review pulses. | "Same workflow primitive as Phase 1. Different stage labels — `Request` instead of `Receipt`, but the engine is shared. Stage 5 of 6 is in progress." |
| 3.2.2 | Point at the timestamps under each completed stage. | "9h ago by Aditya Rao", etc. | "Every transition records who and when. Auditor-ready." |

### 3.3 · Material Overview

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.3.1 | Scroll into **Material overview**. | Three inset cards: *Material*, *Source & supplier*, *Process target*. | "Material spec, source supplier, consumption target. No more flipping between SAP, LIMS, and process control to know what's in front of you." |
| 3.3.2 | Point at the **Source & supplier** card. | "Source receipt **LOT-2026-0042**" — clickable link. | "Click here in production and you're back in the Phase 1 workbench. Closed loop." |
| 3.3.3 | Point at the **Process target** card. | Target icon, "Carbon Plant", batch number, quantity. | "Where this batch is headed. Same UI primitive as Phase 1's Dispatch card." |
| 3.3.4 | Look at the spec table at the bottom. | Six rows — Carbon, Sulphur, Moisture, Density, Air Permeability, Electrical Resistance. Min / Target / Max columns. | "Process-grade spec. Notice the extra parameters compared to procurement spec: Density, Air Permeability, Electrical Resistance — these only matter once the coke enters the anode-baking flow." |

### 3.4 · Sample Management

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.4.1 | Scroll to **Sample management**. | One sample card: `PMQS-001245-A`, Collected, by Sneha Iyer. | "One composite sample drawn from four bags. Same role gating as Phase 1 — only Sampler and QA Manager can create or recollect." |
| 3.4.2 | Note the **Recollect** button. | Outline button, top-right of the card. | "If a result looks suspect, the Sampler can recollect — old sample is discarded, workflow rolls back, all audited." |

### 3.5 · Test Workspace

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.5.1 | Look at the **Test workspace**. | Five test rows: Sulphur, Moisture, Density, Air Permeability, Electrical Resistance. Each has a green *Compliant* pill. | "**This is the Calcined Coke test matrix for Carbon Plant.** Five tests, all complete, all in spec." |
| 3.5.2 | Look at the parameter tiles under each test row. | Sulphur 1.25%, Moisture 0.35%, Density 2.08 g/cc, Air Permeability 14.5 nPm, Electrical Resistance 52 µΩm. All green dots. | "These are the exact numbers from the PRD demo. Each tile shows value, unit, spec range. Green = in spec, amber = variance, red = fail." |
| 3.5.3 | Note the **Source** column. | All five show a wand icon = Instrument. | "All five came from instrument imports. CSA-01 for sulphur, MA-01 for moisture, PYC-01 for density, APA-01 for air permeability, ERA-01 for resistance." |
| 3.5.4 | Note the entry metadata row. | "Entered by System (Carbon Sulphur Analyzer 01) · 5h ago" etc. | "Every result is signed by the originating instrument or person. Same provenance model as Phase 1." |

### 3.6 · Quality Insights — Process Readiness (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.6.1 | Look at the **Quality insights** panel on the right. | Glass card, violet tint, sparkle icon. | "Same panel as Phase 1 — but the **hero KPI is different**." |
| 3.6.2 | Point at the **Process Readiness** card at the top. | Large tabular `96` / 100, gauge icon, violet progress bar. | "**Process Readiness — 96 out of 100.** Hero metric of Phase 2. Replaces Supplier Health from Phase 1 because once procurement is done, the supplier isn't the question anymore — readiness for the process is." |
| 3.6.3 | Point at the sparkline under the score. | 12 points climbing from ~72 to 96. | "Readiness trend across the last 12 batches of this material going to this area. The line is climbing — the chemistry has been improving." |
| 3.6.4 | Point at the **Recommended action** card just below. | "Release to **Carbon Plant**" with green RELEASE pill and rationale. | "**Recommendation: Release to Carbon Plant.** Rationale: ‘All critical parameters compliant. Historical variation low. No process risk identified.' Notice we never say ‘AI'. Same language discipline as Phase 1." |
| 3.6.5 | Point at the Risk + Tests-completed tiles. | LOW risk, 5/5 tests. | "Two reads, two seconds." |
| 3.6.6 | Point at **Spec compliance** + **Deviations**. | 100% / 0. | "Compliance is rolled across all 5 parameters. Zero deviations means no parameter is in the variance band either." |
| 3.6.7 | Point at **Key observations**. | "5 of 5 parameters within process specification", "Sulphur within acceptable range", "Moisture within acceptable range", etc. | "Generated, not canned. The engine writes one observation per parameter plus a roll-up. Business voice — no parts-per-million jargon." |
| 3.6.8 | Point at **Parameter trends vs history**. | Table: Sulphur 1.25 (prev avg 1.17, +0.08), Moisture 0.35 (prev 0.31, +0.04), etc. | "Current value vs historical average across previous batches of the same material and area. Sulphur is +0.08 — well below the 6% magnitude that would amber-flag." |
| 3.6.9 | Point at **Recent batches**. | List: CC-2026-014 (Released, 92/100), CC-2026-013 (Released), CC-2026-012 (On Hold, 55/100). | "Historical context. The previous batch was held — sulphur was 2.7%, near the 3% limit. The platform remembers." |

### 3.7 · Approval Center (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.7.1 | Point at the **Approval center** card below Quality Insights. | Three big buttons: green **Release**, amber **Hold**, red **Reject**. | "Same three-button grammar as Phase 1, different verbs — Release / Hold / Reject for process consumption. Hold and Reject require a reason." |
| 3.7.2 | **Don't release yet** — we'll do it in chapter 4 on a fresh qualification to keep the demo state clean. | — | "We'll come back." |

### 3.8 · Activity Feed (right rail, bottom)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.8.1 | Point at **Activity feed**. | Live pulsing pill, vertical event list. | "Server-pushed stream filtered for this qualification. Same component as Phase 1 — different entity type filters." |
| 3.8.2 | Click any event to open the **detail sheet**. | Side sheet opens on the right with full meta. | "Same detail drawer as Phase 1. Click any event to see the instrument, parameter list, and overall status of that capture." |

---

## Chapter 4 · The full lifecycle on a fresh qualification (4 roles)

> Goal: prove the platform end-to-end by playing the parts of all four primary roles.

### 4.1 · QA Engineer — initiate a new qualification

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | **Switch role** | Topbar role chip → **QA Engineer**. | Chip text changes. | "QA Engineer initiates qualifications. They can hold but cannot release or reject — separation of duties enforced." |
| 4.1.2 | QA Engineer | Sidebar → **Process Material Qualification**. | Left rail. | — |
| 4.1.3 | QA Engineer | Click **+ New Qualification** (top-right of the queue). | Primary button. | "Dialog opens. Notice the role gating — only QA Engineer and QA Manager see this button." |
| 4.1.4 | QA Engineer | Fill the form: Material = **Calcined Coke**, Consumption area = **Carbon Plant**, Batch number = **CC-2026-099**, Source lot = **LOT-2026-0042** (optional but recommended), Quantity = **22**, Source supplier = **ABC Metals**. | Two-column grid. | "**Source lot is the link back to Phase 1.** In production this would be picked from an approved-lots dropdown. Notes optional." |
| 4.1.5 | QA Engineer | Click **Create qualification**. | Bottom-right. | "Toast: ‘Qualification created successfully'. Bell increments. We land on the new workbench." |
| 4.1.6 | — | Look at the workflow timeline. | First circle (Request) is green; Sample pulses. | "Workflow auto-advanced. The batch is now waiting on a sampler." |

### 4.2 · Sampler — draw a sample

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar → **Sampler**. | The Release/Hold/Reject buttons are now disabled with tooltips. | "Notice the gating. Sampler can create samples; cannot decide on release." |
| 4.2.2 | Sampler | Scroll to **Sample management**, click **Create Sample**. | Primary button. Briefly shows "Generating…" spinner. | "Sample ID `PMQS-…-A` is auto-generated. **Six tests** (Carbon/Sulphur, Moisture, Sulphur, Density, Air Permeability, Electrical Resistance) are auto-assigned by the workflow engine reading the Calcined Coke spec." |
| 4.2.3 | — | Note the workflow timeline. | Sample circle green; Testing pulses. | "Stage 2 of 6 complete." |

### 4.3 · Lab Analyst — capture results three ways

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — | "Lab Analyst captures results — instrument import, manual entry, file upload. Cannot release or reject." |
| **Instrument import** | | | | |
| 4.3.2 | Lab Analyst | On the **Sulphur** row, click **Import**. | Violet primary button. | "Triggering the integration with the Carbon Sulphur Analyzer 01." |
| 4.3.3 | — | Watch the 6-stage modal. | Connecting → Verifying → Reading batch data → Parsing results → Validating structure → Import Successful. Progress bar climbs 10 → 25 → 45 → 65 → 85 → 100% over ~5 seconds. | "**Same simulation as Phase 1, different instrument.** Per PRD section 18, exact stages and exact percentages. Every stage is a real failure point in production: connectivity, protocol handshake, file parsing, schema validation." |
| 4.3.4 | — | Modal closes; the Sulphur row populates with a tile, all in spec. | Toast: ‘Results imported successfully'. | "Values are deterministic per (instrument, sample, test). In production these come from the device driver." |
| 4.3.5 | Lab Analyst | Repeat for **Density** (PYC-01), **Air Permeability** (APA-01), **Electrical Resistance** (ERA-01). | One click each. | "Four parameter sources, four instruments, all on the same workspace. No screen switching." |
| **Manual entry** | | | | |
| 4.3.6 | Lab Analyst | On the **Moisture** row, click **Manual**. | Outline button. | "Mandatory reason — Instrument Offline, External Lab, Emergency Entry, etc." |
| 4.3.7 | Lab Analyst | Select reason **External Lab**. Enter Moisture = **0.35**. Click **Save entry**. | — | "Reason audited. If a result is ever challenged we know it was external lab, not a missed instrument run." |
| **File upload** | | | | |
| 4.3.8 | Lab Analyst | On the remaining Carbon/Sulphur **CS** row, click **Upload**. | Ghost button. | — |
| 4.3.9 | Lab Analyst | Click the drop zone, pick any file. | 3-step parser flow: File uploaded → Extracting values → Validation complete. | "PDF, CSV, Excel, scanned image — same extraction grammar as Phase 1." |
| 4.3.10 | — | All six tests show green Compliant pills. | Workflow timeline: Validation pulses then completes; toast: ‘Process readiness recalculated'. | "When the last test completes the workflow advances. Notice the second toast — readiness was recalculated server-side and the bell ticked over." |

### 4.4 · Process Readiness updates in real time

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.4.1 | Look at the **Quality insights** panel (right rail). | Process Readiness score jumps as you import (75 → 85 → 90+). | "The Process Readiness engine recomputes on every result. Watch the score climb as the test matrix completes." |
| 4.4.2 | Point at the **Recommended action** card. | Now reads "Release to **Carbon Plant**" with green RELEASE pill. | "Recommendation flipped to RELEASE once all five parameters were in spec. Rationale string is regenerated — it now reads ‘No process risk identified'." |
| 4.4.3 | Point at the **Observations** bullets. | Updated count and per-parameter lines. | "Five observations, one per parameter, plus the roll-up. All generated from the data above." |
| 4.4.4 | Point at the **Parameter trends** table. | Current vs previous-average row per parameter. | "If a parameter started drifting more than 6%, this row would turn amber. Right now everything's within historical variance." |

### 4.5 · QA Manager — release the batch

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.5.1 | **Switch role** | Role chip → **QA Manager**. | — | "Only QA Manager can release or reject. QA Engineer can hold." |
| 4.5.2 | QA Manager | Scroll to **Approval center**. Click **Release**. | Big green button. | "Confirmation modal — ‘Material will be released to Carbon Plant for production consumption.' Reason is optional on release, mandatory on hold/reject." |
| 4.5.3 | QA Manager | Click **Confirm Release**. | — | "Toast: ‘Material released successfully'. Bell increments. Workflow advances to Release. The batch is now consumable by Carbon Plant." |
| 4.5.4 | — | Look at the workflow timeline. | All six circles green. | "Request → Sample → Testing → Validation → Review → Release. Full lifecycle in one workspace." |

### 4.6 · The audit pays off

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.6.1 | Click **View history** (top-right of header). | Side sheet opens. | "Read down the list: qualification created (QA Engineer), sample created (Sampler), four instrument imports + one manual entry + one file upload (Lab Analyst), readiness recalculated (system), release decision (QA Manager)." |
| 4.6.2 | Click **▸ View change** on any entry. | Field-level or parameter-level diff. | "Same auditor-ready diff as Phase 1. Pharma, automotive, aerospace — passes the regulator test." |
| 4.6.3 | — | Close the drawer. | — | "Every role's contribution is recorded. Every reason is preserved." |

---

## Chapter 5 · The framework angle — same shell, different question (Role: any)

> Goal: 60-second close — why Phase 2 took weeks instead of months.

| # | Talking point | What to show |
|---|---|---|
| 5.1 | "The qualification workbench is the **inspection workbench** with one section swapped." | Toggle between `/inspection/LOT-2026-0042` and `/qualification/PMQ-2026-001245` — show that the layout (header → timeline → workspace → right rail) is identical. |
| 5.2 | "Workflow engine, audit, notifications — **registered, not rewritten**." | Optional: open `api/app/frameworks/workflow_engine.py` for 5 seconds — show `register(PROCESS_QUALIFICATION)` next to `register(INCOMING_INSPECTION)`. |
| 5.3 | "Quality Insights is a pattern, not a single panel — Phase 1 surfaces Supplier Health, Phase 2 surfaces Process Readiness, future modules will surface something else. The right rail composition adapts; the engine surface doesn't." | Sidebar → switch between Inspection Workbench and Qualification Workbench, point at the right-rail panel name change (Supplier Health → Process Readiness). |
| 5.4 | "Adding **Heat Chemistry** (Step 3) is one workflow definition + a section composition + a readiness function tuned for melt chemistry. No framework code changes." | Sidebar → point at the *Future modules* group. |
| 5.5 | "Same audit drawer, same activity feed, same instrument simulation — proven on two modules now, ready for the next four." | Click the bell to show the cross-module notification stream. |

---

## Quick reference · Roles & what they can do (Phase 2)

| Role | Can do | Cannot do |
|---|---|---|
| **Stores Executive** | (Phase 1 actions) | Qualification actions |
| **Sampler** | Create / recollect qualification samples | Create qualification, capture results, decide |
| **Lab Analyst** | Capture qualification results (instrument / manual / upload) | Create qualification, sample, decide |
| **QA Engineer** | Create / edit qualification, Hold | Release, Reject |
| **QA Manager** | All actions + Release + Reject + override | (super-role) |
| **Viewer** | Read only | Anything that mutates |

> Every disabled button has a tooltip explaining *why* — hover any greyed-out button to demonstrate.

---

## Quick reference · Hero data (Phase 2)

- **Hero qualification:** `PMQ-2026-001245` — Calcined Coke, batch `CC-2026-015`, Carbon Plant, 24.5 MT, status **Under Review**, sourced from `LOT-2026-0042` (Phase 1 hero).
- **PRD demo numbers** (matched in seed): Sulphur 1.25%, Moisture 0.35%, Density 2.08 g/cc, Air Permeability 14.5 nPm, Electrical Resistance 52 µΩm.
- **Hero scores:** Process Readiness **96/100**, Risk **Low**, Recommendation **RELEASE TO CARBON PLANT**.
- **Sibling qualifications** (for historical comparison + queue depth):

| Number | Batch | Material | Area | Status | Notes |
|---|---|---|---|---|---|
| PMQ-2026-001244 | CC-2026-014 | Calcined Coke | Carbon Plant | Released | Chemistry trend stable |
| PMQ-2026-001243 | CC-2026-013 | Calcined Coke | Carbon Plant | Released | — |
| PMQ-2026-001242 | CC-2026-012 | Calcined Coke | Carbon Plant | On Hold | Sulphur near upper limit |
| PMQ-2026-001241 | CTP-2026-008 | Coal Tar Pitch | Carbon Plant | Pending Testing | — |
| PMQ-2026-001240 | CRY-2026-022 | Cryolite | Potline | Under Review | — |
| PMQ-2026-001239 | BTH-2026-019 | Bath Material | Potline | Released | — |
| PMQ-2026-001238 | ALF-2026-011 | Aluminum Fluoride | Potline | Pending Sampling | — |
| PMQ-2026-001237 | PC-2026-031 | Pet Coke | Carbon Plant | Rejected | Sulphur 3.6%, exceeds spec |

- **Phase 2 materials:** Calcined Coke, Coal Tar Pitch, Cryolite, Aluminum Fluoride, Bath Material, Carbon Additive, Pet Coke.
- **Phase 2 instruments:** CSA-01 (Carbon Sulphur), MA-01 (Moisture), PYC-01 (Pycnometer / Density), APA-01 (Air Permeability), ERA-01 (Electrical Resistance), SPT-01 (Softening Point), VIS-01 (Viscometer), XRD-01 (Panalytical XRD).

---

## Quick reference · Reset between demos

The store is in-memory. **Restart the `uvicorn` process** (Ctrl+C in Window A, re-run `uvicorn app.main:app --reload --port 8000`) and both Phase 1 and Phase 2 seed data refresh together. The frontend reconnects automatically within ~4 seconds.

---

## Lightning version (6 minutes)

If you only have 6 minutes:

1. **The hand-off** (60s) — Inspection queue → `LOT-2026-0042` (Approved) → Qualification queue → `PMQ-2026-001245` (`from LOT-2026-0042` link). "Same batch, second question."
2. **Workbench tour** (90s) — header (consumption area chip), workflow timeline (Request → Release), right-rail walk-through with focus on **Process Readiness 96/100** and **Release to Carbon Plant** recommendation.
3. **Instrument import on a fresh qualification** (90s) — create `CC-2026-099`, switch to Sampler → Create Sample, switch to Lab Analyst → Import Sulphur (narrate the 6-stage flow), watch the Process Readiness score climb.
4. **Release** (45s) — switch to QA Manager → Release → Confirm. Workflow finishes, toast: "Material released successfully to Carbon Plant".
5. **Audit** (30s) — View history → diff one result entry.
6. **Framework close** (30s) — "Same workbench, different question. Heat Chemistry, Casting, MTC reuse this exact shell."
