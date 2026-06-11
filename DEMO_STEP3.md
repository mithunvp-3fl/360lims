# Quality360 — Phase 3 Demo Script

End-to-end walkthrough of the **Metal Quality Control** module. Same format as `DEMO_STEP2.md`: every action says **what to click**, **where to look**, **which role to be in**, and gives a **1–2 line brief** so you can narrate.

**Estimated run time:** ~15 minutes for the full script, ~6 minutes for the lightning version (chapters 0, 1, 3, 5).

---

## How Phase 3 connects to Phase 2

Phase 2 (**Process Material Qualification**) answered a production question:

> "Can production **consume** this material safely and efficiently?"

Phase 3 (**Metal Quality Control**) answers the next question down the line:

> "Can this metal be **released for casting**?"

A typical batch flows across all three modules:

```
   Supplier ─┐                                   ┌─► Carbon Plant ─┐
            │  Step 1 — Incoming Inspection      │                 │  Step 3 — Metal Quality Control
            ▼  (LOT-2026-0042, Calcined Coke)    │                 ▼  (MB-2026-001245, P1020 on PL-03)
   Receipt → Sample → Testing → Validation →    →  Step 2 — Process Qualification         Metal Batch → Sample → OES → Validation →
            Review → Release (Approved)          (PMQ-2026-001245, batch CC-2026-015)     Review → Casting Release
                                                Request → Sample → Testing → Validation →
   Casthouse ◄────────────────────────────────────────────────────────────────────────────┘
                                                Review → Release to Carbon Plant
```

The same Calcined Coke that passed Phase 1 fed the Carbon Plant qualification (`PMQ-2026-001245`) in Phase 2. That coke went into the anode bake furnace, the anodes fed the smelt pot, and the tapped molten metal became the Phase 3 hero **metal batch** `MB-2026-001245`. The workbench links back to the source qualification with one click.

**What's reused, not rebuilt:**

| Framework | Reused |
|---|---|
| Workbench shell | ✓ Same layout (header → timeline → workspace → right rail) |
| Workflow engine | ✓ New definition `metal-quality-control` registered alongside `incoming-inspection` and `process-material-qualification` |
| Audit trail | ✓ Same `audit.record(...)` — entity types `metal-batch`, `metal-sample`, `metal-test`, `metal-result` |
| Notification framework | ✓ Same `notif.emit(...)` — events surface in toasts + bell |
| Approval framework | ✓ Same pattern (decision + reason mandatory for Hold/Reject/Downgrade) |
| Quality Insights | ✓ Engine pattern reused; hero KPI swaps Process Readiness → **Metal Compliance** |
| Instrument Simulation | ✓ Same 6-stage flow, single instrument this time — **Thermo OES-01** |
| Role permission | ✓ Same `RoleGate` — new permissions: `metal-batch:create`, `metal-batch:hold`, `metal-batch:release`, `metal-batch:reject`, `metal-batch:downgrade` |
| Genealogy framework | ✓ Now walks RM (LOT) → PMQ → MB in one drawer |

**What's new (business logic only):**

- New entities — `MetalBatch`, `MetalSample`, `MetalTest`, `MetalResult`, `MetalApproval`, plus `ChemistryCorrection`
- New status set — `Pending Sampling → Pending Testing → Under Review → Released / On Hold / Rejected / Downgraded / Cancelled`
- New decision set — `Release` / `Hold` / `Reject` / **`Downgrade`** (the fourth verb is the Phase 3 signature — drops grade instead of scrapping the heat)
- New hero KPI — **Metal Compliance Score (0–100)** computed from spec compliance, historical stability, deviation severity, test completion, risk indicators
- New secondary signal — **Casting Readiness** pill (`READY` / `REVIEW` / `HOLD` / `NOT READY`)
- New recommendation set — `RELEASE FOR CASTING` / `CORRECT CHEMISTRY` / `HOLD METAL BATCH` / `DOWNGRADE GRADE` / `REJECT` / `AWAITING DATA`
- New right-rail card — **Chemistry Correction Advisor** (rule-based "add X kg of Y to bring Fe to target")
- New product grades — `P1020`, `P0610`, `Primary Aluminum`
- New process anchors — Potlines `PL-01` … `PL-05`, shifts A/B/C, casthouse operators

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Sign in as **Priya Menon** (QA Manager unlocks every action). | You should land on `/dashboard`. |
| 0.5 | Pre-bookmark the hero URL <http://localhost:3000/metal-quality/MB-2026-001245> so chapter 3 lands in one click. | Address bar. |
| 0.6 | Confirm the **bell icon** (top-right of topbar) shows a number. The notification stream now carries Phase 1, Phase 2 and Phase 3 events. | Top-right, beside the role chip. |

**Talking point:** "Phase 3 is **Metal Quality Control** — the module that decides whether a tapped heat is good enough to send to the caster. Same workbench, same audit, same notifications as Phase 1 and Phase 2. What's new is the chemistry engine, the Metal Compliance score, and the Chemistry Correction Advisor that tells the casthouse exactly what to add when a heat is off-target."

---

## Chapter 1 · The hand-off from Step 2 (Role: QA Manager)

> Goal: prove Phase 3 is a continuation of Phase 2, not a separate app.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 1.1 | Sidebar → **Process Material Qualification**. | Left rail, *Quality Operations* group. | "This is where Phase 2 lives. `PMQ-2026-001245` at the top — Calcined Coke for Carbon Plant." |
| 1.2 | Click **`PMQ-2026-001245`**. | Qualification link. | "Phase 2 workbench. Process Readiness 96/100, recommendation was Release to Carbon Plant." |
| 1.3 | Scroll to the **Genealogy** card on the workbench. | Card titled *Material Genealogy* with the lot → qualification → batch chain. | "Same genealogy framework as Phase 2 — but now it walks one more step downstream. Notice `MB-2026-001245` linked below this qualification." |
| 1.4 | Click **`MB-2026-001245`** in the genealogy card. | The downstream node. | "Same browser tab, no context switch. We're now in Phase 3." |
| 1.5 | Land on `/metal-quality/MB-2026-001245`. | Workbench titled *Metal Quality Control*. | "This is the molten heat that came off the smelt line fed by the very coke we just qualified. P1020 grade, Potline 3, 32 metric tonnes, shift A." |
| 1.6 | Point at the **Source qualification** chip in the header. | "`PMQ-2026-001245`" pill. | "**This is the link back to Step 2.** One click takes you to the qualification record. Closed loop across three modules." |

**Talking point:** "Step 1 said yes-from-procurement. Step 2 said yes-from-process. Step 3 has to say yes-from-casting. Three modules, three questions, one continuous chain of custody."

---

## Chapter 2 · The Metal Batch Queue (Role: QA Manager)

> Goal: prove the queue covers every state and supports the four operator actions (Create / Open / Clone / Cancel).

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.1 | Sidebar → **Metal Quality Control**. Land on `/metal-quality`. | Queue page titled *Metal Quality Control*. | "Phase 3 queue. Every tapped heat in front of the caster lives here." |
| 2.2 | Look at the **status pills** at the top of the table. | Pills: All · Pending Sampling · Pending Testing · Under Review · Released · On Hold · Downgraded · Rejected. | "Eight status filters, count-per-status next to each. Same ergonomics as Phase 1 and Phase 2 — plus a new **Downgraded** state that's unique to metal quality." |
| 2.3 | Look at the **grade filter chips** (top-right of the table). | Chips: All · P1020 · P0610 · Primary Aluminum. | "Filter by product grade — P1020 is the volume grade, P0610 is the higher-purity grade, Primary Aluminum is the catch-all." |
| 2.4 | Click **P1020**. | Chip turns violet. | "Only P1020 batches shown. Notice the queue is dominated by PL-02 and PL-03 heats — those are our P1020 potlines." |
| 2.5 | Click **All** to reset, then type **`PL-03`** in the search box. | Search input above the table. | "Search across metal batch number, grade, potline, operator. Free-text filter for finding a single heat fast." |
| 2.6 | Clear the search. Point at the **Risk pill** column. | Green/amber/red Low/Medium/High. | "Same risk grammar as Phase 1 and 2. `MB-2026-001242` is amber — Fe near upper limit, that's why it's On Hold." |
| 2.7 | Click the **⋯ menu** on `MB-2026-001245`. | Drop-down. | "Two actions: Clone batch, Cancel. Clone is for repeat tap conditions — saves the casthouse 30 seconds of form filling." |
| 2.8 | Close the menu. Click **Open** on `MB-2026-001245`. | Open button on the row. | "Lands on the workbench." |

---

## Chapter 3 · The Workbench, top to bottom (Role: QA Manager)

> Goal: show the marquee screen for Phase 3 — every step of a metal batch's release decision on one workspace.

### 3.1 · Header

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.1.1 | Look at the header card. | Metal batch number in 30px, status pill (*Under Review*), risk pill (*Low*), "Metal Quality Control" badge, **violet P1020 grade chip**, potline chip **PL-03**, shift chip **A**. | "Metal batch number, status, risk, grade, potline, shift — readable from the back of the room. The grade chip is the answer to ‘what does the customer get'." |
| 3.1.2 | Scan the mini-fields under the title. | *Production date*, *Operator* (Vikram Singh), *Weight* (32 MT), *Source qualification* (PMQ-2026-001245). | "The Source qualification row links back to the Phase 2 record. One click takes you to the upstream decision." |
| 3.1.3 | Hover the **View history** button. | Outline button with a clock icon. | "Same audit drawer as Phase 1 and 2 — every mutation across the batch, sample, OES test, results is one click away." |

### 3.2 · Workflow Progress

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.2.1 | Look at the **Workflow progress** card. | Six dots: Metal Batch → Sample → OES Analysis → Validation → Review → Casting Release. Four green ✓, Review pulses. | "Same workflow primitive as Phases 1 and 2. Different stage labels — `Metal Batch`, `OES Analysis`, `Casting Release`. The engine is shared. Stage 5 of 6 is in progress." |
| 3.2.2 | Point at the timestamps under each completed stage. | "5h ago by Arjun Patel", etc. | "Every transition records who and when. Auditor-ready." |

### 3.3 · Metal Batch Overview

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.3.1 | Scroll into **Metal batch overview**. | Three inset cards: *Production*, *Source qualification*, *Casthouse handoff*. | "Production context, upstream qualification, downstream target. No more flipping between SAP, LIMS, and process control to know what's in front of you." |
| 3.3.2 | Point at the **Source qualification** card. | "Sourced from **PMQ-2026-001245**" — clickable link. | "Click here in production and you're back in the Phase 2 workbench. Closed loop." |
| 3.3.3 | Point at the production date and operator chips. | Vikram Singh, shift A, 32 MT. | "Who poured this heat, on which shift, how heavy. Same UI primitive as Phase 1's Receipt card and Phase 2's Material card." |

### 3.4 · Sample Section

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.4.1 | Scroll to **Sample management**. | One sample card: `MQS-001245-A`, Collected, by Sneha Iyer. | "One dip sample taken from the launder just before transfer to the caster. Same role gating as Phase 1 and 2 — only Sampler and QA Manager can create or recollect." |
| 3.4.2 | Note the sample notes. | "Dip sample taken just before launder transfer." | "Free-text context preserved on the sample — operators love that when chasing a deviation a week later." |
| 3.4.3 | Note the **Recollect** button. | Outline button, top-right of the card. | "If a result looks suspect, the Sampler can recollect — old sample is discarded, workflow rolls back, all audited." |

### 3.5 · OES Chemistry Workspace

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.5.1 | Look at the **OES Chemistry** workspace. | One test row labelled "OES Chemistry · Thermo OES-01" with seven element tiles: Si, Fe, Cu, Mg, Zn, Ti, Mn. All green *Compliant* pills. | "**This is the P1020 chemistry matrix.** Seven elements, one instrument, all in spec." |
| 3.5.2 | Read the parameter values left to right. | Si 0.08 · Fe 0.14 · Cu 0.02 · Mg 0.01 · Zn 0.01 · Ti 0.01 · Mn 0.01. All %. | "These are the exact numbers from the PRD demo. Each tile shows value, unit, spec range. Green = in spec, amber = near edge, red = out." |
| 3.5.3 | Note the action trio on the test row. | Three buttons: **Import** (violet), **Manual** (outline), **Upload** (ghost). | "Same three-way capture as Phase 1 and 2 — instrument import is the default, manual is the fallback, file upload is for external lab reports." |
| 3.5.4 | Note the entry metadata. | "Entered by System (Thermo OES-01) · 3h ago". | "Result is signed by the originating instrument. Same provenance model as Phase 1 and 2." |

### 3.6 · Chemistry Correction Advisor (Phase 3 signature)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.6.1 | Scroll to **Chemistry correction advisor** (below the OES workspace, amber-tinted glass card). | Card with the sparkle icon, subtitle "Recommended additions to bring molten chemistry to the grade target." | "**This is the Phase 3 signature feature.** Rule-based, not statistical — values are advisory. The casthouse foreman uses this when a heat is off-target." |
| 3.6.2 | On the hero batch the advisor is mostly quiet — every element is comfortably mid-spec. | Empty-state line: "No chemistry corrections needed — all elements are within striking distance of their 98/100 grade target." | "On a healthy heat the advisor is silent. That's a feature — no noise, no false positives." |
| 3.6.3 | **To see it fire**, open a second tab to <http://localhost:3000/metal-quality/MB-2026-001242>. | Same workbench, On Hold sibling batch with Fe near the upper limit. | "This is the on-hold sibling — Fe is amber on this heat. Watch the advisor." |
| 3.6.4 | Scroll to the Chemistry correction advisor on this batch. | Row per off-target element: a parameter pill, an additive material (e.g. *Clean primary metal* for dilution), a kg figure, an expected-after value, and a one-line rationale. | "For each off-target element the engine computes: how far off target, which additive to use (per the additive master), how many kg given the heat mass, what the chemistry will look like after. Plain-language rationale at the bottom of each card." |
| 3.6.5 | Read one card aloud — for example the Fe row. | "Dilute by tapping X kg of clean metal — direct addition not possible." | "Note the language discipline. We never say ‘AI'. We say ‘recommendation', ‘based on additive master', ‘rule-based'. Same discipline as Phase 1 and 2." |
| 3.6.6 | Return to the hero batch tab. | <http://localhost:3000/metal-quality/MB-2026-001245>. | — |

### 3.7 · Quality Insights — Metal Compliance (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.7.1 | Look at the **Quality insights** panel on the right. | Glass card, violet tint, sparkle icon. | "Same panel as Phases 1 and 2 — but the **hero KPI is different**." |
| 3.7.2 | Point at the **Metal Compliance** card at the top. | Large tabular `98` / 100, gauge icon, violet progress bar. | "**Metal Compliance — 98 out of 100.** Hero metric of Phase 3. Replaces Process Readiness from Phase 2 because once the material is approved for the process, the process happens — what matters now is whether the product chemistry meets grade." |
| 3.7.3 | Point at the **Casting Readiness** pill just under the score. | Green **READY** pill. | "Secondary signal — four states: READY, REVIEW, HOLD, NOT READY. It's the one-word answer to ‘can we cast this?'." |
| 3.7.4 | Point at the sparkline under the score. | 12 points climbing from ~80 to 98. | "Compliance trend across the last 12 batches of P1020 on PL-03. The line is climbing — chemistry has been improving since shift A last week." |
| 3.7.5 | Point at the **Recommended action** card just below. | "**RELEASE FOR CASTING**" with green pill and rationale. | "**Recommendation: Release for casting.** Rationale: ‘All chemistry parameters comply with P1020 requirements. No significant historical deviation identified. Casting operation can proceed.' Notice we never say ‘AI'." |
| 3.7.6 | Point at the Risk + Tests-completed tiles. | LOW risk, 1/1 tests. | "Two reads, two seconds." |
| 3.7.7 | Point at **Parameter trends**. | Table: Si 0.08 (prev avg 0.075, +0.005), Fe 0.14 (prev 0.143, -0.003), etc. | "Current value vs historical average across previous P1020 PL-03 batches. Everything's within historical variance." |
| 3.7.8 | Point at **Recent batches**. | List: MB-2026-001244 (Released, 94/100), MB-2026-001243 (Released, 94/100), MB-2026-001242 (Held, 58/100). | "Historical context. The held sibling is the one we just looked at in the advisor — Fe near limit. The platform remembers." |

### 3.8 · Approval Center (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.8.1 | Point at the **Approval center** card below Quality Insights. | **Four** buttons: green **Release**, amber **Hold**, red **Reject**, blue **Downgrade**. | "**This is the four-verb grammar that's unique to Phase 3.** Release / Hold / Reject as before, plus **Downgrade**." |
| 3.8.2 | Hover the **Downgrade** button. | Tooltip: "Drop grade to a lower target — e.g. P1020 → Primary Aluminum." | "Downgrade is the Phase 3 superpower. A P1020 heat that misses spec on Cu but is otherwise clean can be reclassified to Primary Aluminum instead of re-melted. Saves the cost of a re-pour." |
| 3.8.3 | **Don't release yet** — we'll do it in chapter 4 on a fresh batch to keep the demo state clean. | — | "We'll come back." |

### 3.9 · Activity Feed + Audit Drawer (right rail, bottom)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.9.1 | Point at **Activity feed**. | Live pulsing pill, vertical event list. | "Server-pushed stream filtered for this metal batch. Same component as Phase 1 and 2 — different entity type filters." |
| 3.9.2 | Click any event to open the **detail sheet**. | Side sheet opens on the right with full meta. | "Same detail drawer as Phase 1 and 2. Click any event to see the instrument, parameter list, overall status." |
| 3.9.3 | Click **View history** in the header. | Audit drawer opens from the right. | "Same audit drawer as Phase 1 and 2 — but the entity types are `metal-batch`, `metal-sample`, `metal-test`, `metal-result`. The roll-up is metal-batch-scoped." |

---

## Chapter 4 · The full lifecycle on a fresh metal batch (4 roles)

> Goal: prove the platform end-to-end by playing the parts of all four primary roles. Use a fresh metal batch number — we'll let the API mint `MB-2026-001299` (the next available).

### 4.1 · Casthouse Operator — create a new metal batch

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | **Switch role** | Topbar role chip → **Casthouse Operator** (or QA Engineer if that's how the project mapped it — the create permission is the same). | Chip text changes. | "Casthouse Operator initiates batches. They cannot release, reject, or downgrade — separation of duties enforced." |
| 4.1.2 | Casthouse Operator | Sidebar → **Metal Quality Control**. | Left rail. | — |
| 4.1.3 | Casthouse Operator | Click **+ New Metal Batch** (top-right of the queue). | Primary button. | "Dialog opens. Only Casthouse Operator and QA Manager see this button." |
| 4.1.4 | Casthouse Operator | Fill the form: Grade = **P1020**, Potline = **PL-03**, Weight = **31.5**, Shift = **A**, Operator = **Vikram Singh**, Source qualification = **PMQ-2026-001245** (optional but recommended). | Two-column grid. | "**Source qualification is the link back to Phase 2.** In production this would be picked from an approved-qualifications dropdown. Notes optional." |
| 4.1.5 | Casthouse Operator | Click **Create metal batch**. | Bottom-right. | "Toast: ‘Metal batch created successfully'. Bell increments. We land on the new workbench at `/metal-quality/MB-2026-001299`." |
| 4.1.6 | — | Look at the workflow timeline. | First circle (Metal Batch) is green; Sample pulses. | "Workflow auto-advanced. The batch is now waiting on a sampler." |

### 4.2 · Sampler — draw a metal sample

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar → **Sampler**. | The Release/Hold/Reject/Downgrade buttons are now disabled with tooltips. | "Notice the gating. Sampler can create samples; cannot decide on release." |
| 4.2.2 | Sampler | Scroll to **Sample management**, click **Create Sample**. | Primary button. Briefly shows "Generating…" spinner. | "Sample ID `MQS-001299-A` is auto-generated. **One test** (OES Chemistry on Thermo OES-01) is auto-assigned by the workflow engine reading the metal-batch test plan." |
| 4.2.3 | — | Note the workflow timeline. | Sample circle green; OES Analysis pulses. | "Stage 2 of 6 complete." |

### 4.3 · Lab Analyst — capture OES via instrument

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — | "Lab Analyst captures results — instrument import, manual entry, file upload. Cannot release or reject." |
| 4.3.2 | Lab Analyst | On the **OES Chemistry** row, click **Import**. | Violet primary button. | "Triggering the integration with Thermo OES-01 — the optical emission spectrometer parked next to the casthouse." |
| 4.3.3 | — | Watch the 6-stage modal. | Connecting → Verifying → Reading batch data → Parsing results → Validating structure → Import Successful. Progress bar climbs over ~5 seconds. | "**Same simulation as Phases 1 and 2, different instrument.** Each stage is a real failure point in production: connectivity, protocol handshake, file parsing, schema validation." |
| 4.3.4 | — | Modal closes; the OES row populates with **seven element tiles**: Si, Fe, Cu, Mg, Zn, Ti, Mn. All green. | Toast: ‘OES results imported'. | "Values are deterministic per (instrument, sample, grade) — Si around 0.08, Fe around 0.14, the rest near target. In production these come from the OES driver." |

### 4.4 · Metal Compliance climbs in real time

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.4.1 | Look at the **Quality insights** panel (right rail). | Metal Compliance score jumps from ~30 (no data) to ~98 (full chemistry). | "The Metal Compliance engine recomputes on every result. Watch the score jump as the chemistry materialises." |
| 4.4.2 | Point at the **Casting Readiness** pill. | Was NOT READY → now **READY**. | "The one-word answer flips with the data." |
| 4.4.3 | Point at the **Recommended action** card. | Was AWAITING DATA → now "**RELEASE FOR CASTING**" with green pill. | "Recommendation flipped to RELEASE once all seven elements were in spec. Rationale string is regenerated — it now reads ‘All chemistry parameters comply with P1020 requirements'." |
| 4.4.4 | Point at the **Observations** bullets. | "7 of 7 elements within P1020 specification", "Si within acceptable range", "Fe within acceptable range", etc. | "Generated, not canned. The engine writes one observation per parameter plus a roll-up. Business voice — no Greek letters." |
| 4.4.5 | Point at the **Parameter trends** table. | Current vs previous-average per element. | "If Fe started drifting more than ~6% from history, this row would turn amber. Right now everything's within historical variance." |

### 4.5 · QA Manager — release for casting

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.5.1 | **Switch role** | Role chip → **QA Manager**. | — | "Only QA Manager can release, reject, or downgrade. QA Engineer can hold." |
| 4.5.2 | QA Manager | Scroll to **Approval center**. Click **Release**. | Big green button. | "Confirmation modal — ‘Metal batch will be released for casting on PL-03'. Reason is optional on release, mandatory on hold/reject/downgrade." |
| 4.5.3 | QA Manager | Click **Confirm Release**. | — | "Toast: ‘Casting release approved'. Bell increments. Workflow advances to Casting Release. The heat is now cleared for the caster." |
| 4.5.4 | — | Look at the workflow timeline. | All six circles green. | "Metal Batch → Sample → OES Analysis → Validation → Review → Casting Release. Full lifecycle in one workspace." |

### 4.6 · The audit pays off

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.6.1 | Click **View history** (top-right of header). | Side sheet opens. | "Read down the list: metal batch created (Casthouse Operator), sample created (Sampler), OES import (Lab Analyst), readiness recalculated (system), release decision (QA Manager)." |
| 4.6.2 | Click **▸ View change** on any entry. | Field-level or parameter-level diff. | "Same auditor-ready diff as Phases 1 and 2. Pharma, automotive, aerospace — passes the regulator test." |
| 4.6.3 | — | Close the drawer. | — | "Every role's footprint is recorded. Every reason is preserved." |

### 4.7 · Bonus — what Downgrade does (60s, on `MB-2026-001242`)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.7.1 | Open <http://localhost:3000/metal-quality/MB-2026-001242>. | On-hold P1020 sibling. | "Fe near upper limit — we held this heat. Three options: re-melt (reject), wait for chemistry to settle (stay on hold), or downgrade." |
| 4.7.2 | In **Approval center**, click **Downgrade**. | Blue button. | "Modal asks for a **Target grade** dropdown and a **Reason**." |
| 4.7.3 | Select Target grade = **Primary Aluminum**, Reason = "Fe edge of P1020 spec — reclassify to Primary Aluminum to release". Click **Confirm Downgrade**. | — | "Toast: ‘Grade downgraded'. Status flips to **Downgraded**. The header chip changes from P1020 to Primary Aluminum. The heat is saved — no re-melt." |
| 4.7.4 | — | Look at the workflow timeline. | All six circles green. | "Same release stage, different terminal state. Downgrade is a release-with-grade-change." |

---

## Chapter 5 · The framework angle — same shell, third question (Role: any)

> Goal: 60-second close — why Phase 3 took weeks instead of months.

| # | Talking point | What to show |
|---|---|---|
| 5.1 | "The metal-quality workbench is the **qualification workbench** with one section swapped and one signature card added." | Toggle between `/qualification/PMQ-2026-001245` and `/metal-quality/MB-2026-001245` — show that the layout (header → timeline → workspace → right rail) is identical. The Chemistry Correction Advisor is the only new section. |
| 5.2 | "Workflow engine, audit, notifications — **registered, not rewritten**. Phase 3 added one more line." | Optional: open `api/app/frameworks/workflow_engine.py` for 5 seconds — show `register(METAL_QUALITY_CONTROL)` next to `register(PROCESS_QUALIFICATION)` and `register(INCOMING_INSPECTION)`. |
| 5.3 | "Quality Insights is a pattern, not a single panel — Phase 1 surfaces Supplier Health, Phase 2 surfaces Process Readiness, Phase 3 surfaces Metal Compliance + Casting Readiness. The right rail composition adapts; the engine surface doesn't." | Sidebar → cycle through Inspection Workbench → Qualification Workbench → Metal Quality Workbench, point at the right-rail hero KPI changing each time. |
| 5.4 | "The Genealogy framework now walks **three modules**: RM → PMQ → MB. Adding Phase 4 (product casting) is one more node on the same drawer." | Open the genealogy card on the hero — show the lot → qualification → metal-batch chain. |
| 5.5 | "Same audit drawer, same activity feed, same instrument simulation — proven on three modules now, ready for the next three." | Click the bell to show the cross-module notification stream — receipts, qualifications and metal batches all in the same feed. |

---

## Quick reference · Roles & what they can do (Phase 3)

| Role | Can do | Cannot do |
|---|---|---|
| **Stores Executive** | (Phase 1 actions) | Metal batch actions |
| **Casthouse Operator** | Create / edit metal batch, clone, cancel | Capture results, decide |
| **Sampler** | Create / recollect metal samples | Create batch, capture results, decide |
| **Lab Analyst** | Capture OES results (instrument / manual / upload), retest | Create batch, sample, decide |
| **QA Engineer** | Create / edit metal batch, **Hold** | Release, Reject, Downgrade |
| **QA Manager** | All actions + **Release** + **Reject** + **Downgrade** + override | (super-role) |
| **Viewer** | Read only | Anything that mutates |

Permission keys introduced in Phase 3:

- `metal-batch:create` — Casthouse Operator, QA Engineer, QA Manager
- `metal-batch:hold` — QA Engineer, QA Manager
- `metal-batch:release` — QA Manager only
- `metal-batch:reject` — QA Manager only
- `metal-batch:downgrade` — QA Manager only

> Every disabled button has a tooltip explaining *why* — hover any greyed-out button to demonstrate.

---

## Quick reference · Hero data (Phase 3)

- **Hero metal batch:** `MB-2026-001245` — Grade **P1020** on potline **PL-03**, shift **A**, weight **32 MT**, operator **Vikram Singh**, status **Under Review**, sourced from `PMQ-2026-001245` (Phase 2 hero).
- **PRD demo OES numbers** (all within P1020 spec):

| Element | Value | Spec range | Status |
|---|---|---|---|
| Si | 0.08 % | 0.00–0.10 | Pass |
| Fe | 0.14 % | 0.00–0.20 | Pass |
| Cu | 0.02 % | 0.00–0.03 | Pass |
| Mg | 0.01 % | 0.00–0.03 | Pass |
| Zn | 0.01 % | 0.00–0.03 | Pass |
| Ti | 0.01 % | 0.00–0.03 | Pass |
| Mn | 0.01 % | 0.00–0.03 | Pass |

- **Hero scores:** Metal Compliance **98/100**, Casting Readiness **READY**, Risk **Low**, Recommendation **RELEASE FOR CASTING**.
- **Sibling batches** (for historical comparison + queue depth):

| Number | Grade | Potline | Status | Notes |
|---|---|---|---|---|
| MB-2026-001244 | P1020 | PL-03 | Released | Chemistry trend stable |
| MB-2026-001243 | P1020 | PL-03 | Released | — |
| MB-2026-001242 | P1020 | PL-03 | On Hold | Fe near upper limit, recheck ordered |
| MB-2026-001241 | P1020 | PL-02 | Pending Testing | — |
| MB-2026-001240 | P0610 | PL-01 | Under Review | — |
| MB-2026-001239 | P0610 | PL-01 | Released | — |
| MB-2026-001238 | Primary Aluminum | PL-04 | Pending Sampling | — |
| MB-2026-001237 | P1020 | PL-02 | Rejected | Fe 0.32 % — exceeded P1020 tolerance, re-melted |
| MB-2026-001236 | P0610 | PL-01 | Downgraded | Si edge of spec — downgraded to P1020 |

- **Phase 3 instrument:** **Thermo OES-01** (optical emission spectrometer). One instrument, seven elements — that's the entire chemistry surface for metal QC.
- **Phase 3 grades:** P1020, P0610, Primary Aluminum.
- **Phase 3 potlines:** PL-01 … PL-05.

---

## Quick reference · Reset between demos

The store is in-memory. **Restart the `uvicorn` process** (Ctrl+C in Window A, re-run `uvicorn app.main:app --reload --port 8000`) and Phase 1, Phase 2 and Phase 3 seed data refresh together. The frontend reconnects automatically within ~4 seconds.

---

## Lightning version (6 minutes)

If you only have 6 minutes:

1. **The hand-off** (60s) — `/qualification/PMQ-2026-001245` → click `MB-2026-001245` in the Genealogy card → land on the metal-quality workbench. "Same coke, same chain of custody, third question."
2. **Workbench tour** (90s) — header (grade + potline + shift chips), workflow timeline (Metal Batch → Casting Release), right-rail walk-through with focus on **Metal Compliance 98/100**, **Casting Readiness READY**, and **RELEASE FOR CASTING** recommendation.
3. **Instrument import on a fresh batch** (75s) — create `MB-2026-001299` as Casthouse Operator, switch to Sampler → Create Sample, switch to Lab Analyst → Import on the OES row (narrate the 6-stage flow), watch all 7 elements populate and Metal Compliance climb to ~98.
4. **Chemistry Correction Advisor cameo** (45s) — open `MB-2026-001242` in a second tab, scroll to the advisor, read one Fe correction card aloud. "Rule-based, advisory, never says ‘AI'."
5. **Release** (45s) — back on the fresh batch, switch to QA Manager → Release → Confirm. Workflow finishes, toast: "Casting release approved".
6. **Framework close** (30s) — "Same workbench, third question. Phase 4 — product casting + dispatch — reuses this exact shell. Workflow engine, audit, notifications, genealogy — registered, not rewritten."
