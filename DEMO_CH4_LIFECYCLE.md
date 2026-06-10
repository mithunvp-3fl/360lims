# Quality360 — Lifecycle Demo (Phase 1.1)

> **What this file is:** the rewritten **Chapter 4 — Full lifecycle on a fresh lot** from `DEMO.md`, updated to surface every Phase 1.1 enhancement: progress-bar instrument simulation, failure scenarios, staggered result animation, parameter-level trends, sticky Quality Insights, side-sheet activity detail, side-sheet audit with field-level diffs, and the new richer notification messages.
>
> **Duration:** ~8 minutes for the happy path, +3 minutes if you include the failure-simulation and detail-drawer bonus sections.
>
> **Goal:** prove the platform end-to-end by playing all five roles in sequence — and show that the four frameworks (Instrument Simulation, Quality Insights, Activity Feed, Audit Trail) all react to a single user action without manual refresh.

---

## Quick reference — which Phase 1.1 framework each step proves

| Step | Frameworks exercised |
|---|---|
| 4.1 Receipt create | Notification (toast with title + description) · Audit (create entry) · Workflow Engine |
| 4.2 Sample draw | Notification · Audit · Workflow Engine · Activity Feed (live event lands) |
| 4.3 Instrument import | **Instrument Simulation** (6 stages, % progress, sample ID, failure modes) · **Result Animation** (staggered fade-in) · Notification (rich meta) · Audit (parameter-aware diff) · **Quality Insights** (auto-recompute + parameter trends) · Activity Feed |
| 4.3b Manual entry | Reason-mandatory dialog · Audit (with reason in notes) · Notification with reason field |
| 4.3c File upload | 3-step parser feel · Notification with file name in meta |
| 4.4 Insights | **Sticky right rail** · **Parameter trends table** · live recalculation |
| 4.5 Approve | Confirm modal · Notification · Workflow advance to Release · Audit |
| 4.6 Audit | **Side Sheet** with action-tone badges · **Field-level before/after diff** · parameter-aware diff |
| 4.7 Bonus: failure mode | Failure dropdown · red abort banner · realistic per-stage failure message |
| 4.8 Bonus: activity detail | **Click-to-open Sheet** · instrument / sample / parameters / overall status |

---

## 4.0 · Set the stage (15 seconds)

> Both servers running, browser at `http://localhost:3000/dashboard`.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.0.1 | Confirm the **bell** badge in the topbar shows a number. | Top-right of topbar. | "Notification stream is alive — server emits structured events, the browser polls every 4 seconds, toasts and bell update together." |
| 4.0.2 | Click **"Jump into demo workbench"** on the dashboard. | Violet pill, top-right. Lands on `/inspection/LOT-2026-0042`. | "This lot is fully populated. We'll come back to it. For the lifecycle demo we want a brand-new lot." |
| 4.0.3 | Sidebar → **Inspection Queue**. | Left rail. | — |

---

## 4.1 · Stores Executive — receive a new lot

> **Role:** Stores Executive — can create / edit receipts only.
> **Goal:** record an incoming lot and watch the workflow open at stage 1.

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | — | Topbar shield-chip → **Stores Executive**. | Top-right chip text flips to "Stores Executive". | "Role gating is enforced everywhere. In production this comes from SSO." |
| 4.1.2 | Stores Exec | Click **+ New Receipt** (top-right of the queue). | Violet primary button. | "Dialog opens. The button is wired through `<RoleGate>` — switch to Viewer later and it'll be disabled with a tooltip." |
| 4.1.3 | Stores Exec | Fill: Supplier **ABC Metals**, Material **Aluminum Scrap**, Quantity **22**, Vehicle **HR-55-AB-9999**, PO **PO-2026-200**. Notes optional. | Two-column form grid. | "Vehicle and PO are mandatory. Lot number is generated server-side from the next sequence value." |
| 4.1.4 | Stores Exec | Click **Create receipt**. | Bottom-right of dialog. | "Toast: *'Receipt Created'*. Lands directly on the new lot's workbench. Bell increments." |
| 4.1.5 | — | Look at the **workflow progress** card. | Six dots: Receipt (green ✓) → Sample (pulsing accent) → Testing → Validation → Review → Release. | "Workflow engine just advanced. Sample stage is now in progress — the lot is waiting on a sampler." |
| 4.1.6 | — | Glance at the **right rail**. | Quality Insights shows **AWAITING DATA** with rationale "Tests have not been completed yet." Approval buttons are present but the workflow is not at the review stage yet. | "Quality Insights already calculated for a lot with zero results. Recommendation: AWAITING DATA. No magic — empty inputs → empty insight." |

---

## 4.2 · Sampler — draw a sample

> **Role:** Sampler — can create / recollect samples only.
> **Goal:** generate the sample ID and watch tests auto-assign from the material spec.

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | — | Topbar shield-chip → **Sampler**. | — | "Watch the **+ New Receipt** button in the queue: it's now disabled. Hover for the tooltip explaining why." |
| 4.2.2 | Sampler | Scroll to **Sample management** card. Click **Create Sample**. | Primary button on the card. Briefly shows "Generating…". | "Sample ID auto-generated: `SMP-2026-{lot-tail}-A`. The required tests for Aluminum Scrap (XRF, OES, Moisture) are assigned to the sample on the server in the same call." |
| 4.2.3 | — | Look at the **Test results workspace**. | Three rows appear: XRF Chemistry, OES Chemistry, Moisture. Each shows "Pending" with three action buttons (Import / Manual / Upload). | "Workflow engine read the material's required-tests list. No human typed these — they're a property of the material in master data." |
| 4.2.4 | — | Workflow timeline: Sample circle green, Testing pulses. | — | "Stage 2 of 6 complete. Notification fired." |
| 4.2.5 | — | Look at the **Activity feed** (right rail, below Approval). | Two events live: *Receipt Created* (green dot), *Sample Created* (green dot). Vertical timeline rail connects them. | "Same event stream that drove the toast. Each entry is **clickable** — we'll open one in chapter 4.8." |

---

## 4.3 · Lab Analyst — capture results three ways

> **Role:** Lab Analyst — can capture results (instrument / manual / upload), but cannot approve.
> **Goal:** drive the marquee Phase 1.1 experience — staged import, result animation, two-stage notification rollup, and watch Quality Insights recompute.

### 4.3a · Instrument import (the wow moment)

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.1 | — | Topbar shield-chip → **Lab Analyst**. | — | — |
| 4.3.2 | Lab Analyst | On the **XRF Chemistry** row, click **Import**. | Violet primary button. | "Triggers the integration with **Panalytical XRF-01**. Dialog opens — note the *Simulate failure* dropdown above. Leave it on **None — happy path** for now." |
| 4.3.3 | — | Look at the dialog: progress bar at 0%, simulate-failure dropdown set to "None", footer shows "Panalytical XRF-01 · Epsilon 4 · MP-EP4-0091". | Header: *"Triggering result transfer for XRF Chemistry from Panalytical XRF-01 on sample SMP-2026-…-A"*. | "The sample ID is **interpolated into the dialog header and into the 'Reading sample…' line below**. Demo feels like the real integration." |
| 4.3.4 | Lab Analyst | Click **Start import**. | — | "Watch the **progress bar** and the **per-stage list** together — six stages, exactly 1 second each, with explicit percentages 10 → 25 → 45 → 65 → 85 → 100." |
| 4.3.5 | — | Stages light up in order: **Connecting to Panalytical XRF-01… → Verifying communication… → Reading sample SMP-2026-{lot}-A… → Parsing instrument output… → Validating result structure… → Import successful**. | Each stage has its own icon: plug, shield, scan, circuit, activity, check. Current stage shows a spinner + a horizontal shimmer bar. Completed stages flip to green with checkmark. | "Each of those is a real production failure point: connectivity, protocol handshake, sample-on-tray, file parsing, schema validation. Showing them builds operator trust." |
| 4.3.6 | — | At 100% the dialog auto-closes after ~900ms. | Two toasts fire: *"Results imported successfully — 4 parameters captured from Panalytical XRF-01."* and *"Specification validation completed — XRF Chemistry: all 4 parameters within specification."* | "**Two notifications, not one.** Phase 1.1 sends a results-imported event and a follow-up spec-validation rollup, both with `meta` for the detail drawer." |
| 4.3.7 | — | Look at the XRF row in the workspace. | The result row now shows: Compliant pill, Source = Instrument (wand icon), 4 parameter tiles **animating in with a left-to-right stagger** — each tile has a brief violet ring around it that fades out. | "That's the result-animation framework. Tiles materialize one-by-one with a 180ms-per-parameter delay so the user feels the data arriving — not popping in instantly." |
| 4.3.8 | — | Look at the **Quality Insights** panel (right rail). | Recommendation flips from **AWAITING DATA** to **APPROVE** (or HOLD if the random values dipped into variance), rationale changes, compliance score increases, tests-completed gauge updates 1/3 → 1/3 (still 1 test done). | "Sticky right rail — scroll the main content and Quality Insights stays visible. Recalculated server-side off the new result set, fetched via React Query invalidation, no refresh." |

### 4.3b · Manual entry (the audited variant)

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.9 | Lab Analyst | On the **OES Chemistry** row, click **Manual**. | Outline button. | "Reason is mandatory. Options: Instrument Offline / Integration Unavailable / External Lab / Emergency Entry / Other." |
| 4.3.10 | Lab Analyst | Select **External Lab**. Enter: Al **98.2**, Si **0.7**, Fe **0.35**, Mg **0.2**, Mn **0.1**, Zn **0.05**. Click **Save entry**. | Grid of inputs. | "Reason is logged on the result and propagated into the audit trail. If a finding is challenged later, we know exactly why this didn't come from the OES." |
| 4.3.11 | — | The OES row populates with 6 parameter tiles, again with stagger animation. | Toast: *"Manual result captured — OES Chemistry entered by lab analyst (External Lab)."* | "Different toast title — the notification framework discriminates by source." |

### 4.3c · File upload (the third source)

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.12 | Lab Analyst | On the **Moisture** row, click **Upload**. | Ghost button. | — |
| 4.3.13 | Lab Analyst | Click the drop zone, pick any file from your machine. | 3-step parser flow runs: **File uploaded → Extracting values… → Validation complete**. | "PDF, CSV, Excel, scanned image — same downstream pipeline. The 3-step feel is to communicate that parsing is non-trivial." |
| 4.3.14 | — | Moisture row populates. Toast: *"File processed — yourfile.pdf parsed, 1 parameter extracted."* | Workflow timeline: **Validation circle pulses** (we just finished the last pending test). | "When the last test completes, workflow auto-advances. The lot is now on the QA Manager's queue." |
| 4.3.15 | — | Check the **bell** badge — it's now several events higher. | Open the bell. | "Receipt Created → Sample Created → Results imported successfully → Specification validation completed → Manual result captured → File processed → Validation completed. Every step generated an event." |

---

## 4.4 · Quality Insights updates in real time

> **Goal:** show that the marquee right-rail panel re-runs end-to-end on every new result.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.4.1 | Look at the **Quality insights** panel (right rail). | Recommendation = **Approve**. Rationale = *"All parameters compliant and supplier health is strong."* (Wording shifts if values dipped into variance.) | "Same panel, but the rationale string just regenerated. Not canned." |
| 4.4.2 | Point at **Risk level** + **Tests completed** tiles. | Risk = LOW, tests = 3 / 3, progress bar at 100% colored green. | "Two reads, two seconds." |
| 4.4.3 | Point at **Supplier health** with its sparkline. | 87/100, green trend line. | "Supplier-level metric, 12-week trend. ABC Metals is well above the 70 threshold." |
| 4.4.4 | Point at **Spec compliance** gauge. | Likely 100% (or 80–95% if there was variance). | "Single number, comparable across hundreds of lots." |
| 4.4.5 | **(NEW in Phase 1.1)** Scroll to **Parameter trends vs history**. | A small table: Param / Current / Prev avg / Δ. Each row shows e.g. *Al · 98.18 % · 98.08 · +0.10*, *Si · 0.74 · 0.69 · +0.05*, etc. Δ values are colored: green if |Δ%| < 2, amber if < 6, red otherwise. | "**This is new.** For every parameter on this lot, we computed the historical average across **past lots from the same supplier+material**, signed the delta, and tone-coded by absolute %. So a QA Manager sees not just 'in spec' but 'in spec **and** consistent with what we've accepted before'." |
| 4.4.6 | Point at **Recent deliveries from this supplier**. | Three rows: previous lots with Approved badges. | "Lot-level history for the supplier+material pair, two clicks from a decision." |
| 4.4.7 | Scroll the **main content** (left column) up and down. | Quality Insights / Approval Center / Activity Feed stay pinned. | "The whole right rail is **sticky on `xl` screens** with its own overflow scroll, so the panel never leaves the viewport." |

---

## 4.5 · QA Manager — approve the lot

> **Role:** QA Manager — only role that can approve, reject, or override.
> **Goal:** complete the workflow and close the loop.

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.5.1 | — | Topbar shield-chip → **QA Manager**. | — | "QA Engineer can hold but not approve — separation of duties. Only QA Manager has approve + reject + override." |
| 4.5.2 | QA Manager | Right rail → **Approval Center**. Click **Approve**. | Big green button. Modal opens. | "Confirmation modal — reason optional on Approve, mandatory on Hold and Reject. Forces a thoughtful decision." |
| 4.5.3 | QA Manager | Click **Confirm Approved**. | — | "Toast: *'Material Approved — LOT-2026-{n}'*. Workflow advances to Release. Lot is now consumable upstream." |
| 4.5.4 | — | **Workflow timeline**: all six circles green. | — | "Receipt → Sample → Testing → Validation → Review → Release. End-to-end traceable." |
| 4.5.5 | — | Quality Insights stays where it is, but **Recommended Action** still reads APPROVE. | — | "We never overwrite the recommendation with the actual decision. The recommendation is computed from data; the decision is captured in approvals — separate concepts, both auditable." |

---

## 4.6 · The audit pays off (rewritten as a side Sheet)

> **Goal:** open the audit trail and show field-level diffs — what changed, by whom, when.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.6.1 | Click **View history** (top-right of the workbench header). | A **side Sheet** slides in from the right (Phase 1.1 — used to be a centered modal). Width ~640px. Search box at top. | "**Side Sheet** — leaves the lot context visible while you read. Search the actor, action, entity, or note." |
| 4.6.2 | Read down the timeline. | Each entry has: entity-type badge (mono), action badge (tone-coded — `create` green, `import` violet, `approved` green, `delete` red, etc.), timestamp on the right, actor / role / full timestamp on the next line. | "Every role's contribution is signed. Stores Exec → Sampler → Lab Analyst (multiple) → QA Manager. Color tells you the verb at a glance." |
| 4.6.3 | **(NEW in Phase 1.1)** Find the **Results imported successfully** entry. Click it open. | A **Parameter changes** mini-table appears: each captured parameter with its value and unit. | "Parameter-aware diff. For result events the audit doesn't dump JSON — it renders a clean table per parameter." |
| 4.6.4 | Search for **approved**. | Filter narrows to the approval. The approval audit entry shows previousValue (old status object) and newValue (new status object). | "**Field-level diff** — only the changed keys are shown. Old value in red strikethrough on the left, arrow, new value in green on the right. No JSON to parse." |
| 4.6.5 | Search for **create**. | Lists every create event for this lot. | "Auditor-ready. Pharma, automotive, aerospace — this passes the regulator test." |
| 4.6.6 | Close the Sheet. | X top-right or escape. | "Layout stayed put — the workbench is exactly as you left it." |

---

## 4.7 · (Bonus, +90s) Run the failure simulation

> **Goal:** prove the Instrument Simulation framework handles realistic failure modes, not just the happy path.

> Start from any lot with at least one pending test. Easiest: switch to Lab Analyst, **create a fresh receipt + sample + a single pending test** (or repeat 4.1 + 4.2 + skip 4.3).

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.7.1 | Lab Analyst | On a pending test row, click **Import**. | Dialog opens. | — |
| 4.7.2 | Lab Analyst | **Simulate failure dropdown** → choose **Communication timeout**. | Top-left of the dialog. A "Failure scenario armed" amber badge appears. | "Production drivers fail at a specific protocol step. We can rehearse the user experience for each failure class." |
| 4.7.3 | Lab Analyst | Click **Start import**. | Stages 1 (Connecting) and 2 (Verifying) execute as normal: stage 1 turns green at 1s, stage 2 spins… | "Watch stage 2." |
| 4.7.4 | — | At 2s, stage 2 flips to a **red error icon**, progress bar turns red, a red banner appears: *"Communication timeout — The instrument did not respond within the protocol window. The integration retried twice before failing."* Toast: same message in destructive style. | The dialog button text changes to **Retry import**. | "Two-line operator-grade message. No stack trace. Tells the operator what to check." |
| 4.7.5 | Lab Analyst | Pop the dropdown again, pick **Sample not found**, click **Retry import**. | This time stages 1 + 2 complete, stage 3 (Reading sample SMP-…) fails. | "**Different failure mode, different stage.** Sample-not-found is a tray-position problem, so it fails at the *Reading sample* step, not at connection." |
| 4.7.6 | Lab Analyst | Repeat with **Invalid result structure** — stages 1–3 succeed, stage 4 (Parsing) fails. | — | "Schema validation failure looks like this. Operator escalates to the integration team, not the lab." |
| 4.7.7 | Lab Analyst | Set dropdown back to **None — happy path**. Click **Start import** one more time. | The sequence completes successfully. The result row populates with staggered tiles. | "End on a happy path so the lot isn't stuck in a failed state for the next demo." |

---

## 4.8 · (Bonus, +60s) Activity feed → side Sheet detail

> **Goal:** prove the Activity Feed framework supports drill-down on any event.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.8.1 | Scroll the right rail to **Instrument activity feed**. | Vertical timeline with colored dots: blue (info), green (success), amber (warning), red (error). Live badge pulses at the top. | "Colored dots match the four severities. Newest first." |
| 4.8.2 | Click the most recent **Results imported successfully** entry. | A **Sheet** slides in from the right. | "Same Sheet primitive as the audit drawer — consistent UX everywhere a side drawer is appropriate." |
| 4.8.3 | Read the Sheet contents. | Header: severity icon, status badge, full title, message. Body: **Detail grid** rows for Timestamp, Source, Entity type, Entity ID. **Source context** sub-grid showing Instrument, Sample ID, Test name, Parameter count, Overall status, Duration ms. **Parameters captured** chips listing each parameter that landed. | "Phase 1.1 added a `meta` payload on every notification. The framework reads it generically and renders whatever the source supplied." |
| 4.8.4 | Close the Sheet. Click a **Specification validation completed** entry. | Different metadata: testCode, result = 'compliant', no parameter chips. | "Different event source, different meta keys, same drawer renders both. That's framework reuse — modules pump events through one pipe." |
| 4.8.5 | Close the Sheet. Click the receipt-created event near the bottom. | Source = Stores Executive. Minimal meta. | "Old-style events without rich `meta` still render — the drawer falls back to the basic detail grid. Backwards-compatible." |

---

## Wrap-up (30 seconds, optional)

> Stand back and call out what just happened.

- **One sample** triggered **six** synchronized framework reactions on every import (instrument simulation animation → result row populates with staggered tiles → activity feed receives event → quality insights recompute with parameter trends → audit entry created → two notifications fire). No manual refresh anywhere.
- **One role switcher** demonstrated separation of duties for all five roles. Every gated action is visibly tied to a specific role with a tooltip explaining the gate.
- **One workbench** ran the lot from receipt to release in a single screen. Sticky right rail kept the recommendation visible throughout.
- **One audit drawer** captures field-level diffs for every mutation, parameter-aware for result edits, searchable.
- This is the **Incoming Material Inspection module**. Heat Chemistry, Casting, Mechanical Testing, MTC & Dispatch register a different `WorkflowDefinition` and compose different sections — but use the same Workbench shell, the same Workflow Engine, the same Activity Feed, the same Quality Insights engine, the same Audit framework, the same Notification stream. Zero re-architecture.

---

## Reset between demos

The store is in-memory. Stop and restart the backend (`uvicorn` Ctrl+C, then re-run) and the seed data refreshes. The frontend reconnects within ~4 seconds via the notification stream poll.
