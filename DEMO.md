# Quality360 — Phase 1 Demo Script

End-to-end walkthrough of the **Incoming Material Inspection** module. Designed to be read step-by-step while presenting; every action says **what to click**, **where to look**, **which role to be in**, and gives a **1–2 line brief** so you can narrate.

**Estimated run time:** ~15 minutes for the full script, ~6 minutes for the lightning version (chapters 0, 2, 4, 5).

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Close the browser DevTools — keep the demo clean. | Top of the window: sidebar on the left, topbar across the top, content in the middle. |
| 0.5 | Confirm the **bell icon** (top-right of topbar) shows a small purple badge with a number — that proves the notification stream is alive. | Top-right, beside the role chip. |

**Talking point:** "Quality360 is a manufacturing quality intelligence platform. Today I'll walk through the Incoming Material Inspection module — Phase 1 of what becomes Heat Chemistry, Casting, Mechanical Testing, MTC & Dispatch on the same framework."

---

## Chapter 1 · The Operations Dashboard (Role: QA Manager)

> Goal: prove the platform answers "what should I look at right now?" in under 5 seconds.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 1.1 | You should land on `/dashboard`. | Page title reads **"Good afternoon, Priya."** | "Personalized greeting, count of lots awaiting your review, and one-line context." |
| 1.2 | Look at the **KPI strip** — four cards across the top. | Cards labeled *Open Lots*, *Awaiting Review*, *Approval Rate*, *Instruments Online*. Each has a delta vs last week. | "These four are the four numbers I want my morning to be about. Approval rate and instrument uptime both trending up." |
| 1.3 | Look at the **Inspection throughput** chart (large card, left). | Area chart, violet line. Hover any week to see the tooltip. | "12-week volume. Steady upward trend — quality lab can scale." |
| 1.4 | Look at the **Status breakdown** donut (top-right card). | Six wedges colored by status. Legend below shows counts. | "Every open lot is sitting in one of six stages. The legend is the eye-test for the queue." |
| 1.5 | Scroll a little — point at **Supplier performance** stacked bars. | Bottom-left card. Hover a bar. | "Per-supplier mix of approved / held / rejected. ABC Metals dominates the approved column — that's our hero supplier today." |
| 1.6 | Point at the **Risk hotspots** card (right of supplier performance). | Held, rejected, or high-risk lots, one row each. | "Every held or rejected lot is one click away. Click any row to land in its workbench." |
| 1.7 | Point at the **Live activity** card (bottom right). | Dotted timeline of events. | "Same event stream that drives toasts. Notice each event is colored by severity." |

**Switching gears:** Click the **"Jump into demo workbench"** button (top-right of the dashboard, violet pill with sparkles icon). → Lands on `/inspection/LOT-2026-0042`.

---

## Chapter 2 · The Workbench, top to bottom (Role: QA Manager)

> Goal: show the marquee screen — every step of a lot's life on one workspace.

### 2.1 · Header

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.1.1 | Look at the header card at the top. | Lot number in 30px font, status pill, risk pill, "Incoming Material Inspection" badge. | "Lot number, current status, risk level — readable from the back of the room." |
| 2.1.2 | Scan the four mini-fields under the title. | *Supplier* (ABC Metals), *Material* (Aluminum Scrap), *Quantity* (24.5 MT), *Assigned* (Priya Menon). | "All the context an inspector needs before doing anything." |
| 2.1.3 | Hover the **View history** button (top-right of header). | Outline button with a clock icon. | "Every mutation on this lot — receipt, sample, results, decisions — is one click away. We'll open it later." |

### 2.2 · Workflow Progress

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.2.1 | Look at the **Workflow progress** card (just below the header). | Six dots connected by a line: Receipt → Sample → Testing → Validation → Review → Release. The completed ones are green check-marks; the in-progress one pulses. | "Six-stage workflow defined by the framework. ‘Review' is currently in progress — that's why this lot is on your dashboard." |
| 2.2.2 | Point at the timestamps under each completed stage. | "12h ago by Sneha Iyer", etc. | "Every stage transition records who did it and when. That's audit, not analytics." |

### 2.3 · Material Overview

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.3.1 | Scroll into the **Material overview** section (next card). | Three inset cards side by side: *Material*, *Supplier*, *Dispatch*. | "Material spec, supplier health, dispatch info. No more flipping between three tabs to know what's in front of you." |
| 2.3.2 | Look at the spec table at the bottom of the card. | Five rows — Al, Si, Fe, Cu, Moisture — with Min / Target / Max. | "These are the spec limits the chemistry results will be checked against. Defined once in master data." |

### 2.4 · Sample Management

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.4.1 | Scroll to **Sample management** card. | One sample card: `SMP-2026-0042-A`, Collected, by Sneha Iyer. | "One composite sample already drawn. Sampler role created it — note ‘Collected' status." |
| 2.4.2 | Note the **Recollect** button (top-right of the card). | Outline button. | "If results look off, the Sampler can recollect. The old sample is marked Discarded and the workflow rolls back — automatic." |

### 2.5 · Test Results Workspace

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.5.1 | Look at the **Test results workspace**. | Three test rows: XRF Chemistry, OES Chemistry, Moisture. Each has a green "Compliant" pill. | "Three tests, all complete, all in spec." |
| 2.5.2 | Look at the parameter tiles directly under each test row. | Mini-cards: Al 98.12%, Si 0.71%, Fe 0.34%, Cu 0.09% with green dots. | "Per-parameter readout. Each tile shows value, unit, and spec range. Green dot = in spec, amber = variance, red = fail." |
| 2.5.3 | Note the **Source** column. | XRF shows a wand icon = Instrument; OES shows a wand; Moisture shows a pencil = Manual. | "Three result sources: instrument, manual, file upload. The Moisture result was entered manually because the moisture analyzer is degraded today." |
| 2.5.4 | Scroll the entry metadata row. | "Entered by System (Panalytical XRF-01) · 5h ago" etc. | "Every result is signed — system name for instrument imports, user name for manual entry, plus the reason if applicable." |

### 2.6 · Quality Insights (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.6.1 | Look at the **Quality insights** panel on the right. | Glass card with violet tint and a sparkle icon. | "This is the differentiator. Notice — we never say ‘AI'. We say ‘recommendation', ‘based on history'. Business language." |
| 2.6.2 | Point at the headline. | "**Approve** · APPROVE pill" with rationale below. | "Recommendation is APPROVE — rationale is one line, business-grade." |
| 2.6.3 | Point at Risk + Tests-completed tiles. | LOW risk, 3/3 tests. | "Risk read, completeness read. Two reads, two seconds." |
| 2.6.4 | Point at **Supplier health** with the sparkline. | 87/100, green trend line. | "Supplier-level health, 12-week trend. ABC Metals is well above 70." |
| 2.6.5 | Point at **Key observations** — bulleted list. | "3 of 3 tests completed", "10 of 10 parameters within specification", "Chemistry profile is consistent with historical accepted batches", etc. | "Human-readable observations. No magic numbers — every claim is grounded in the data above." |
| 2.6.6 | Point at **Recent deliveries from this supplier**. | List of previous lot numbers with Approved/Held/Rejected. | "Historical context. This isn't the first time we've bought from ABC Metals." |

### 2.7 · Approval Center (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.7.1 | Point at the **Approval center** card below Quality Insights. | Three big buttons: green Approve, amber Hold, red Reject. | "Three actions, one click each. Hold and Reject open a modal that requires a reason — audited." |
| 2.7.2 | **Don't approve yet** — we'll do that in chapter 4 with a fresh lot to keep the demo state clean. | — | "We'll come back to this." |

### 2.8 · Instrument Activity Feed (right rail, bottom)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.8.1 | Point at **Instrument activity feed**. | Live pill (pulsing green dot), then a vertical list of events. | "Server-pushed stream of everything that's happened to this lot. Newest first." |

---

## Chapter 3 · Audit Trail (Role: QA Manager)

> Goal: prove every action is traceable. Two clicks.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.1 | Click **View history** (top-right of the header). | A wide modal opens, full of audit entries. | "Same modal works for any lot. Each row shows entity, action, actor, role, timestamp." |
| 3.2 | Click the small **▸ View change** triangle on any entry. | JSON diff before/after expands. | "Field-level diff. Auditors love this. Pharma, automotive, aerospace — this passes the regulator test." |
| 3.3 | Close the modal. | Click the **×** top-right. | — |

---

## Chapter 4 · The full lifecycle on a fresh lot (5 roles)

> Goal: show the platform end-to-end by playing the parts of all five roles.

### 4.1 · Stores Executive — receive a new lot

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | **Switch role** | Click the shield-icon chip on the topbar → choose **Stores Executive**. | Top right; the chip text changes to "Stores Executive". | "Role switcher in production would be SSO-driven; here it's instant for the demo." |
| 4.1.2 | Stores Executive | Click **Inspection Queue** in the sidebar. | Left rail, "Operate" section. | "This is the queue. Every lot, every status." |
| 4.1.3 | Stores Executive | Click **+ New Receipt** (top-right of the page). | Primary button. | "Dialog opens — note the role gating: only Stores Executive and QA Manager can create receipts." |
| 4.1.4 | Stores Executive | Fill the form: Supplier = **ABC Metals**, Material = **Aluminum Scrap**, Quantity = **22**, Vehicle = **HR-55-AB-9999**, PO = **PO-2026-200**. | Two-column grid in the dialog. | "Vehicle and PO are mandatory. The system generates the next lot number automatically." |
| 4.1.5 | Stores Executive | Click **Create receipt**. | Bottom-right of the dialog. | "Toast confirms ‘Receipt Created'. Bell increments. We land directly on the new lot's workbench." |
| 4.1.6 | — | Look at the workflow timeline. | First circle (Receipt) is green; second (Sample) pulses. | "Workflow auto-advanced. The lot is now waiting on a sampler." |

### 4.2 · Sampler — draw a sample

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar role chip → **Sampler**. | Now the *Create Receipt* button on the queue is disabled with a tooltip; the *Approve* buttons on the workbench are too. | "Notice the gating — Sampler can create samples, but can't approve. Hover any disabled button to see why." |
| 4.2.2 | Sampler | Scroll to **Sample management**, click **Create Sample**. | Primary button on that card. Briefly shows "Generating…" spinner. | "Sample ID auto-generated. The required tests for this material (XRF, OES, Moisture) are assigned to the sample automatically — that's the workflow engine reading material spec." |
| 4.2.3 | — | Note the workflow timeline. | Sample circle is now green; Testing pulses. | "Stage 2 of 6 complete." |

### 4.3 · Lab Analyst — capture results three ways

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.3.1 | **Switch role** | Role chip → **Lab Analyst**. | — | "Lab Analyst can capture results, but can't approve or create receipts." |
| 4.3.2 | Lab Analyst | Scroll to the **Test results workspace**. Three pending rows. | "Awaiting capture" in each. | "Three sources: Import (from instrument), Manual, Upload. Let me show each." |
| **Import (the wow moment)** | | | | |
| 4.3.3 | Lab Analyst | On the **XRF Chemistry** row, click **Import**. | Violet primary button on the row. | "Triggering the integration with the Panalytical XRF-01." |
| 4.3.4 | — | Watch the 6-stage modal. | Connecting → Verifying → Reading → Parsing → Validating → Import Successful. ~4.5 seconds total. Each stage has its own icon + animation. | "**Talking point**: every stage is a real failure point in production. Connectivity, protocol handshake, file parsing, schema validation. The user feels what the instrument is doing." |
| 4.3.5 | — | Modal closes; results row populates with 4 parameter tiles all in spec. | Toast: ‘Results Imported'. | "Values are deterministic per (instrument, sample, test) so demos are repeatable. In production these come straight from the device driver." |
| **Manual entry** | | | | |
| 4.3.6 | Lab Analyst | On the **OES Chemistry** row, click **Manual**. | Outline button. | "Mandatory reason — Instrument Offline, Integration Unavailable, External Lab, Emergency Entry, Other." |
| 4.3.7 | Lab Analyst | Select reason **External Lab**. Enter values: Al = **98.2**, Si = **0.7**, Fe = **0.35**, Mg = **0.2**, Mn = **0.1**, Zn = **0.05**. Click **Save entry**. | Grid of inputs. | "Reason is audited. If a result is ever challenged we know it was external lab, not an instrument fault." |
| **File upload** | | | | |
| 4.3.8 | Lab Analyst | On the **Moisture** row, click **Upload**. | Ghost button. | — |
| 4.3.9 | Lab Analyst | Click the drop zone. Pick any file from your machine (any extension — this is a demo flow). | A 3-step parser flow runs: File uploaded → Extracting values → Validation complete. | "PDF, CSV, Excel, scanned image — the platform extracts values and runs the same spec checks." |
| 4.3.10 | — | All three tests now show green Compliant pills. | Workflow timeline: Validation circle pulses. | "When the last test completes, the workflow advances and the lot lands on the QA Manager's queue." |

### 4.4 · Quality Insights updates in real time

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.4.1 | Look at the **Quality insights** panel (right rail). | Recommendation should read **Approve**. | "The recommendation engine re-runs every time a result is captured. Notice the rationale string has changed — it now mentions ‘All parameters compliant'." |
| 4.4.2 | Point at **Spec compliance** gauge. | Likely 100%, green bar. | "Compliance score is a single number a manager can look at across hundreds of lots." |
| 4.4.3 | Point at the observations bullets. | Updated count. | "Observations regenerate every time. They're not canned strings." |

### 4.5 · QA Manager — approve the lot

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.5.1 | **Switch role** | Role chip → **QA Manager**. | — | "Only QA Manager can approve or reject. QA Engineer can hold but not approve — separation of duties." |
| 4.5.2 | QA Manager | Scroll to **Approval center**. Click **Approve**. | Big green button. | "Confirmation modal appears. Reason is optional on approve, mandatory on hold/reject." |
| 4.5.3 | QA Manager | Click **Confirm Approved** in the modal. | — | "Toast: ‘Material approved successfully'. Bell increments. Workflow advances to Release. The lot is now consumable." |
| 4.5.4 | — | Look at the workflow timeline. | All six circles green. The full lifecycle. | "From receipt to release in one workspace. No screen switching, no Excel, no email." |

### 4.6 · The audit pays off

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.6.1 | Click **View history** (top-right of header). | Modal opens. | "Read down the list: receipt created (Stores Executive), sample created (Sampler), XRF imported (System / Lab Analyst), OES manual entry with reason (Lab Analyst), moisture file uploaded (Lab Analyst), validation completed (system), approval (QA Manager)." |
| 4.6.2 | — | Close the modal. | — | "Every role's contribution is recorded. Auditor-ready." |

---

## Chapter 5 · The framework angle (Role: any)

> Goal: 60-second close — why this isn't a one-module demo.

| # | Talking point | What to show |
|---|---|---|
| 5.1 | "Same workbench, different module." | Sidebar → point at the *Future modules* section (Reports, Heat Chemistry, Settings — all marked Coming soon). |
| 5.2 | "Adding Heat Chemistry is one workflow definition + a section composition. No framework code changes." | Optional: open `api/app/frameworks/workflow_engine.py` in the editor for 5 seconds — show the registry pattern. |
| 5.3 | "Same audit, same notifications, same insights engine — they're framework-level, not module-level." | Click the bell icon to show the cross-module notification stream. |
| 5.4 | "Instrument Integrations and Master Data are pure configuration — no module knows about specific instruments or suppliers." | Sidebar → *Instrument Integrations* (5s glance) → *Master Data* (5s glance). |

---

## Quick reference · Roles & what they can do

| Role | Can do | Cannot do |
|---|---|---|
| **Stores Executive** | Create / edit receipts | Sample, results, approval |
| **Sampler** | Create / recollect samples | Receipts, results, approval |
| **Lab Analyst** | Enter results (instrument / manual / upload) | Receipts, samples, approval |
| **QA Engineer** | Hold, recommend | Approve, reject, create entities |
| **QA Manager** | All actions + override | (super-role) |
| **Viewer** | Read only | Anything that mutates |

> Every disabled button has a tooltip explaining *why* — hover any greyed-out button to demonstrate.

---

## Quick reference · Hero data

- **Demo lot:** `LOT-2026-0042` — Aluminum Scrap from ABC Metals, 24.5 MT, status **Pending Review**.
- **Suppliers:** ABC Metals (health 87, hero), Premium Scrap Resources (health 74), Global Alloy Traders (health 92), Northern Smelters (health 63 — the risky one).
- **Materials:** Aluminum Scrap, Primary Aluminum, Silicon Metal, Calcined Coke.
- **Instruments:** Thermo OES-01, Panalytical XRF-01, LECO CS-01, Moisture-01 (degraded — that's why moisture comes via manual entry in the hero scenario).

---

## Quick reference · Reset between demos

The store is in-memory. **Restart the `uvicorn` process** (Ctrl+C in Window A, re-run `uvicorn app.main:app --reload --port 8000`) and the seed data refreshes. The frontend will reconnect automatically within ~4 seconds (notification stream poll interval).

---

## Lightning version (6 minutes)

If you only have 6 minutes:

1. **Dashboard** (60s) — KPIs + risk hotspots, then "Jump into demo workbench".
2. **Workbench tour** (90s) — header, workflow timeline, then walk the right rail: Insights → Approval → Activity.
3. **Instrument import** (60s) — switch to Lab Analyst, click Import on one test row, narrate the 6-stage flow.
4. **Approve** (45s) — switch to QA Manager, approve, watch the workflow finish.
5. **Audit** (30s) — open View history, read down the events.
6. **Framework close** (30s) — sidebar reveal that Heat Chemistry, MTC, etc. reuse the same shell.
