# Quality360 — Phase 5 Demo Script

End-to-end walkthrough of the **Certificate & Dispatch** module. Same format as `DEMO_STEP2.md`: every action says **what to click**, **where to look**, **which role to be in**, and gives a **1–2 line brief** so you can narrate.

**Estimated run time:** ~15 minutes for the full script, ~6 minutes for the lightning version (chapters 0, 1, 3, 5).

---

## How Phase 5 connects to Phase 4 (and the whole chain)

Phase 4 (**Product Quality**) answered a production question:

> "Can this finished product be **approved** as meeting the product specification?"

Phase 5 (**Certificate & Dispatch**) answers the customer-facing question:

> "Can this product be **released to the customer**?"

This is the closing chapter — Steps 1 through 4 each generated quality evidence; Step 5 binds that evidence into a single signed document the customer (and the auditor) will sign for.

The hero batch flows the full ladder:

```
   ABC Metals ─┐ Step 1                                          ┌─► Export Customer
              ▼  LOT-2026-0042 (Receipt) — Approved              │  Step 5
   Step 2 — Process Qualification (PMQ-2026-001245) — Released   │  COA-2026-001245
   Step 3 — Metal Quality          (MB-2026-001245)  — Released  │  (Issued · Ready)
   Step 4 — Product Quality        (PB-2026-000210)  — Approved  │
   Step 5 — Certificate & Dispatch (COA-2026-001245) ───────────►┘
```

The certificate carries the **full 5-step lineage** as a single, audit-ready record. One QR scan resolves back to the receipt that brought the metal in the door.

**What's reused, not rebuilt:**

| Framework | Reused |
|---|---|
| Workbench shell | ✓ Same layout (header → workflow strip → genealogy → workspace → right rail) |
| Workflow engine concept | ✓ A 5-stage strip derived from `status` + `dispatchStatus` |
| Audit trail | ✓ Same `audit.record(...)` — entity type `certificate` |
| Notification framework | ✓ Same `notif.emit(...)` — generated, issued, approved, released |
| Approval framework | ✓ Same decision/reason pattern (Hold, Reject, Override require a reason) |
| Quality Insights pattern | ✓ Engine pattern reused; hero KPI swaps Product Compliance → **Release Confidence** |
| Genealogy framework | ✓ `build_chain(NodeType.CERTIFICATE, …)` walks the same 5-node graph from Phase 3/4 |
| Role permission | ✓ Same `RoleGate` — new permissions for certificate lifecycle |

**What's new (business logic only, per PRD §5–§14):**

- New entity — `Certificate` with `customerSpecs`, `qrCodeValue`, `barcodeValue`, `digitalSignaturePlaceholder`
- New comparison model — `CustomerSpec` (customer requirement vs actual result vs compliance status)
- New state machine — `DispatchStatus`: `Pending → Ready → Approved → Released`, with `Held / Rejected / Overridden` branches
- New roll-up — `/certificates/{n}/quality-summary` cross-step evidence card per upstream module
- New artefacts — QR code (SVG checkerboard placeholder), Barcode (CSS bars placeholder), Digital Signature placeholder
- New hero KPI — **Release Confidence (0–100)**: 60 pts customer-spec compliance + 25 pts upstream product compliance + 10 pts chain coverage + 5 base (PRD §11/§13)
- New recommendation set — `APPROVE DISPATCH` / `HOLD DISPATCH` / `REJECT DISPATCH` / `REQUEST REVIEW` / `AWAITING DATA`
- New role mapping — "Dispatch Executive" maps to `qa-manager`; "Customer Service" maps to `viewer` or `qa-engineer`

---

## Chapter 0 · Preflight (do this 60s before the demo)

> Goal: both servers running, hero data fresh, two URLs bookmarked.

| # | Action | UI pointer |
|---|---|---|
| 0.1 | Open two PowerShell windows. | — |
| 0.2 | **Window A** — `cd D:\srcCode\Vedant\fifthApproach\api` → `.\.venv\Scripts\Activate.ps1` → `uvicorn app.main:app --reload --port 8000`. | Wait for `Uvicorn running on http://127.0.0.1:8000`. |
| 0.3 | **Window B** — `cd D:\srcCode\Vedant\fifthApproach\web` → `npm run dev`. | Wait for `Ready in …`. |
| 0.4 | Open <http://localhost:3000> in a clean browser window. Sign in as **Priya Menon** (QA Manager — unlocks every dispatch action). | You should land on `/dashboard`. |
| 0.5 | Bookmark two URLs in tabs: `/certificates/COA-2026-001245` (active/issued hero) and `/certificates/COA-2026-001260` (fully dispatched happy-path closer). | Two tabs, ready to switch. |
| 0.6 | Confirm the **bell icon** in the topbar shows a count — the notification stream now spans all five phases. | Top-right, beside the role chip. |

**Talking point:** "Quality360 Phase 5 is **Certificate & Dispatch** — the document that tells the customer everything Phases 1 through 4 discovered. Same workbench shell, same audit, same notifications. The only thing new is the customer-facing roll-up and the dispatch state machine."

---

## Chapter 1 · The hand-off from Step 4 (Role: QA Manager)

> Goal: prove Phase 5 is the closing chapter of one chain, not a new app.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 1.1 | Sidebar → **Product Quality**. | Left rail, *Quality Operations* group. | "This is Phase 4. PB-2026-000210 is the hero — Primary Aluminum Billet, status Approved." |
| 1.2 | Click **`PB-2026-000210`**. | Product batch link. | "Workbench from Phase 4. All product tests green, batch approved by QA." |
| 1.3 | Scroll to the **Genealogy** card on the product-quality workbench. | Genealogy card with chain RM Lot → Qualification → Metal Batch → Product Batch. | "Four nodes today. Notice there's a slot for **Certificate** at the end — let's go fill it." |
| 1.4 | Sidebar → **Certificate & Dispatch** under *Quality Operations*. | Left rail, after Product Quality. | "Same sidebar. New module. Same shell." |
| 1.5 | Land on `/certificates`. | Queue page titled *Certificate & Dispatch*. | "This is the Phase 5 queue. Every customer-bound document lives here." |
| 1.6 | In the queue, point at the row **`COA-2026-001245`** (top). | Top row of the table. | "Hero certificate. Customer: Export Customer. Product batch: PB-2026-000210 — the same batch we just looked at in Phase 4. Status Issued, dispatch Ready." |
| 1.7 | Click **`COA-2026-001245`**. | Certificate link. | "Lands on the workbench. The chain is now five nodes long." |

**Talking point:** "Steps 1 through 4 each answered one quality question. Step 5 puts every answer into one document the customer signs for. The questions don't repeat — they roll up."

---

## Chapter 2 · The Certificate Queue (Role: QA Manager)

> Goal: prove the queue covers the full lifecycle and supports the four operator actions (Generate / View / Approve / Cancel) per PRD §7.

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 2.1 | Look at the **column headers**. | Certificate · Product batch · Customer · Status · Dispatch · Created · Action. | "Seven columns. Two status concepts side by side — certificate status (Draft / Issued / Revised / Cancelled) and dispatch status (Pending / Ready / Approved / Held / Rejected / Released / Overridden). Auditor-grade separation between *paper* and *shipment*." |
| 2.2 | Look at the **status pills** above the table. | Pills: All · Draft · Issued · Revised · Cancelled. | "Four certificate-lifecycle filters with counts." |
| 2.3 | Look at the **dispatch chips** on the top-right. | Chips: Any dispatch · Pending · Ready · Approved · Held · Released · Rejected · Overridden. | "Independent dispatch-status filter. A certificate can be Issued (paper good) but Held (shipment stalled) — operators need both axes." |
| 2.4 | Type `Export` into the **Customer** input. | Filter narrows. | "Customer filter — useful when one client has dozens of batches in flight." |
| 2.5 | Clear the customer filter, type `PB-2026-000210` into **Search**. | Single row. | "Full-text search across certificate number, product batch number, customer, notes. Phase 1 ergonomics, all the way through." |
| 2.6 | Clear search. Click the **⋯ menu** on `COA-2026-001245`. | Drop-down with **Cancel** option. | "Per-row actions. Cancel writes a status change *and* an audit log — you cannot silently disappear a customer document." |
| 2.7 | Close the menu. Click **Open** on `COA-2026-001245`. | Arrow button on the row. | "Lands on the workbench." |

---

## Chapter 3 · The Workbench, top to bottom (Role: QA Manager)

> Goal: show the marquee Phase 5 screen — five upstream phases compressed into one customer-ready document.

### 3.1 · Header

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.1.1 | Look at the header card. | Certificate number in 30px, certificate status pill (*Issued*), dispatch status pill (*Ready*), violet **Export Customer** chip on the right. | "Certificate number, certificate status, dispatch status, customer — readable from the back of the room." |
| 3.1.2 | Note the **Download Certificate** button. | Outline button, top-right. | "Placeholder today — in production this renders the PDF with QR, barcode, and digital signature embedded." |
| 3.1.3 | Hover the **View history** button. | Outline button with a clock icon. | "Same audit drawer as every other phase. Every mutation on this certificate — generation, issue, dispatch decision — is one click away." |

### 3.2 · Certificate Workflow Strip

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.2.1 | Look at the **Workflow progress** card. | Five circles: Generate → Customer Validation → QA Review → Dispatch Approval → Released. | "Same workflow primitive as Phases 1–4. Five stages here, derived from `status` + `dispatchStatus` — there's no separate state machine, just a deterministic projection." |
| 3.2.2 | Point at the hero's current stage. | Generate ✓, Customer Validation ✓, QA Review ✓, Dispatch Approval pulses, Released pending. | "Stage 4 of 5 — the paper is good, customer specs verified, awaiting the dispatch call." |

### 3.3 · Genealogy Card (the full ladder)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.3.1 | Scroll to the **Genealogy** card. | Five nodes: LOT-2026-0042 → PMQ-2026-001245 → MB-2026-001245 → PB-2026-000210 → COA-2026-001245. | "**Five nodes.** Last week this card had four — Phase 5 closes the chain." |
| 3.3.2 | Click any upstream node — e.g. `LOT-2026-0042`. | Opens the inspection workbench in a new tab. | "Every node is a deep link back into the originating workbench. The chain is navigable, not just decorative." |

### 3.4 · Certificate Overview

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.4.1 | Scroll into **Certificate overview**. | Left card: Identification fields (number, customer, product batch, status, issued, created). Right column: QR code + Barcode + Digital signature. | "Top half is the identification block — number, customer, product batch link, issued metadata. Bottom-left is the digital signature placeholder." |
| 3.4.2 | Point at the **QR code** panel. | 17×17 checkerboard SVG. | "Deterministic placeholder rendered from the certificate number. In production this is a real QR pointing at a customer-facing verification URL." |
| 3.4.3 | Point at the **Barcode** panel. | CSS-bar barcode. | "Same story — code-128 style placeholder today, PKI-signed in production." |
| 3.4.4 | Point at the **Digital signature** block. | Mono `—` placeholder + caption "PKCS#7 signing wired in production". | "Same disciplined honesty as the rest of the demo — placeholder labelled as placeholder. In production this is a real PKI signature." |

### 3.5 · Customer Specification Validation (PRD §10)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.5.1 | Scroll to **Customer specification validation**. | Table: Parameter · Customer requirement (min/max/target) · Actual · Compliance. | "**This is what the customer signed for.** Every row is one parameter the contract calls out." |
| 3.5.2 | Point at the customer name in the section header. | "Export Customer". | "Specs are derived from the upstream product batch results, optionally tightened per customer at certificate generation time." |
| 3.5.3 | Count the rows for the hero. | 11 rows, every Compliance cell green Pass. | "Eleven parameters. Eleven passes. Zero warnings, zero fails. This is the cleanest possible state for dispatch." |
| 3.5.4 | Point at one row, e.g. Iron / Fe. | Required range, actual value, green Pass. | "Required range on the left, actual on the right, compliance pill on the far right. If even one row showed Warn or Fail, the dispatch recommendation flips immediately." |

### 3.6 · Quality Results Summary — the cross-step roll-up (PRD §11)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.6.1 | Scroll to **Quality results summary**. | Four cards, one per upstream step: Incoming Inspection · Process Qualification · Metal Quality · Product Testing. | "**This is the roll-up auditors want.** One card per upstream module — status, compliance, and a link back to the workbench." |
| 3.6.2 | Point at the **Incoming Inspection** card. | LOT-2026-0042, status Approved, link to `/inspection/LOT-2026-0042`. | "Phase 1 evidence. One click away." |
| 3.6.3 | Point at the **Process Qualification** card. | PMQ-2026-001245, status Released. | "Phase 2 evidence. The carbon-plant clearance is here." |
| 3.6.4 | Point at the **Metal Quality** card. | MB-2026-001245, status Released. | "Phase 3 evidence. The melt chemistry passed." |
| 3.6.5 | Point at the **Product Testing** card. | PB-2026-000210, status Approved, compliance percentage. | "Phase 4 evidence. Mechanicals, dimensions, surface — all in spec." |
| 3.6.6 | Note that each card has its own link. | Hover any link. | "The customer gets a single document; the auditor gets a single document that *navigates*. Same data, two audiences." |

### 3.7 · Genealogy Expanded View (PRD §12)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.7.1 | Scroll to **Genealogy — expanded view**. | Five vertical nodes: RM Lot → Qualification → Metal Batch → Product Batch → Certificate, current node highlighted. | "Same chain as the top card, rendered vertically for printing. This is the page that goes into the auditor's binder." |
| 3.7.2 | Point at the highlighted node. | COA-2026-001245 is the active node. | "Customer scans the QR, lands here. Five clicks back to the supplier delivery." |

### 3.8 · Quality Insights — Release Confidence (right rail)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.8.1 | Look at the **Quality insights** panel on the right. | Glass card, violet tint, sparkle icon. | "Same panel as every other phase — but the **hero KPI is different again**." |
| 3.8.2 | Point at the **Release Confidence** card at the top. | Large tabular `99` / 100, gauge icon, violet progress bar. | "**Release Confidence — 99 out of 100.** Hero metric of Phase 5. Replaces Product Compliance from Phase 4 because once production is done, the question becomes ‘can we hand this over' — not ‘did we make it right'." |
| 3.8.3 | Point at the rationale. | "All 11 customer-spec parameters comply. Upstream chain coverage is 5/5 steps. Dispatch can proceed." | "The math is transparent: 60 points come from customer-spec pass-rate, 25 from upstream product compliance, 10 from chain coverage, 5 base. We never say ‘AI'." |
| 3.8.4 | Point at the **Recommended action** card just below. | "APPROVE DISPATCH" with green pill. | "Recommendation. Same language discipline as Phases 1–4 — *recommendation*, *based on history*, *compliance check*. Never *AI*." |
| 3.8.5 | Point at the Risk + customer-compliance tiles. | LOW risk, 11 of 11 customer parameters. | "Two reads, two seconds." |
| 3.8.6 | Point at **Key observations**. | "11 of 11 customer-spec parameters pass", "Upstream product batch compliance: 98%", "Genealogy coverage: 5 of 5 steps linked", "Certificate has been issued — dispatch decision pending". | "Generated, not canned. One observation per axis of confidence plus a status pulse." |
| 3.8.7 | Point at the sparkline. | 12 points climbing into the upper nineties. | "Release Confidence trend across the customer's last 12 deliveries. Trend is climbing — supplier discipline and process control compound." |

### 3.9 · Dispatch Approval Center (right rail) — PRD §14

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.9.1 | Point at the **Dispatch approval** card below Quality Insights. | Four big buttons: green **Approve Dispatch**, amber **Hold Dispatch**, red **Reject Dispatch**, outline **Request Review**. Plus a small *Override decision (QA Manager only)* link. | "Four-button grammar — Approve / Hold / Reject / Review. Hold, Reject, Review and Override all require a reason. Override is the supervisor bypass for emergency customer commitments." |
| 3.9.2 | Hover **Reject Dispatch** as QA Engineer. | Disabled with tooltip "Requires qa-manager role." | "Role gating is enforced visually — same `RoleGate` component as every other phase." |
| 3.9.3 | **Don't dispatch yet** — we'll do it in chapter 4 on a fresh certificate to keep state clean. | — | "We'll come back." |

### 3.10 · Activity Feed + Audit Drawer (right rail, bottom)

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 3.10.1 | Point at **Activity feed**. | Live pulsing pill, vertical event list. | "Server-pushed stream filtered for this certificate. Same component as every other phase, different entity-type filter." |
| 3.10.2 | Click **View history** in the header. | Side drawer opens. | "Audit drawer — generation, issue, every dispatch decision with its reason. The customer-facing record auditors trust." |
| 3.10.3 | Click any row to expand it. | Field-level diff. | "Same auditor-ready diff as Phases 1–4. Closes the loop on regulator-grade traceability." |

---

## Chapter 4 · The full lifecycle on a fresh certificate (multi-role)

> Goal: prove the platform end-to-end by playing three roles — QA Engineer, QA Manager, and the Dispatch Executive (mapped to QA Manager per PRD §4).

### 4.1 · QA Engineer — generate the certificate

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.1.1 | **Switch role** | Topbar role chip → **QA Engineer**. | Chip text changes. | "QA Engineer can generate certificates. They cannot issue, cannot approve dispatch — separation of duties, just like every other phase." |
| 4.1.2 | QA Engineer | Sidebar → **Certificate & Dispatch**. | Left rail, *Quality Operations* group. | — |
| 4.1.3 | QA Engineer | Click **+ Generate Certificate** (top-right of the queue). | Primary button. | "Dialog opens. Only QA Engineer and QA Manager see this button." |
| 4.1.4 | QA Engineer | In the dialog, pick product batch **`PB-2026-000209`** from the dropdown (any Approved batch will do). Enter customer **Domestic Client A**. Leave the optional customer-requirements override blank. | Two fields. | "Customer specs auto-populate from the product batch results. The optional override is for clients whose spec is tighter than the product spec — narrow Mg, tighter Fe, etc." |
| 4.1.5 | QA Engineer | Click **Generate certificate**. | Bottom-right. | "Toast: ‘Certificate generated · COA-2026-001299 for Domestic Client A'. Bell increments. We land on the new workbench." |
| 4.1.6 | — | Look at the certificate-status header. | Pill: **Draft**. Dispatch pill: **Pending**. Workflow strip: Generate ✓, Customer Validation pulses. | "Status Draft, dispatch Pending — paper exists, not yet issued. Stage 1 of 5 complete." |

### 4.2 · QA Manager — issue the certificate

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.2.1 | **Switch role** | Topbar → **QA Manager**. | — | "Only QA Manager can issue. QA Engineer drafted; QA Manager signs." |
| 4.2.2 | QA Manager | Scroll into **Customer specification validation**. | Table of 11 rows, all green Pass. | "Auto-populated from the product batch. Specs match, compliance computed parameter by parameter." |
| 4.2.3 | QA Manager | Scroll back to the header. Click **Issue Certificate**. | Primary action. | "Confirm dialog — ‘Certificate will be issued and made available for dispatch.'" |
| 4.2.4 | QA Manager | Confirm. | — | "Toast: ‘Certificate issued'. Status flips Draft → **Issued**, dispatch flips Pending → **Ready**. Workflow strip advances to Stage 3 of 5." |

### 4.3 · Release Confidence updates in real time

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.3.1 | Look at the **Quality insights** panel. | Release Confidence climbs into the upper nineties. | "Score recomputes as customer specs validate. The engine adds 25 points for upstream product compliance the moment the certificate links to an Approved batch." |
| 4.3.2 | Point at the **Recommended action** card. | "APPROVE DISPATCH" with green pill. | "Recommendation flipped to APPROVE DISPATCH. Rationale: ‘All 11 parameters comply. Upstream chain coverage is 5/5 steps.'" |
| 4.3.3 | Point at the customer-compliance tile. | 11 / 11. | "All customer parameters in spec. Risk Low. Ready for the dispatch decision." |

### 4.4 · Dispatch Executive (QA Manager role) — approve dispatch

| # | Role | Action | UI pointer | What to call out |
|---|---|---|---|---|
| 4.4.1 | **Role stays** | QA Manager. (PRD §4: "Dispatch Executive" maps to qa-manager.) | — | "In production, ‘Dispatch Executive' is a real role on the warehouse floor. The PRD maps it to the qa-manager permission set." |
| 4.4.2 | Dispatch Executive | Scroll to **Dispatch approval**. Click **Approve Dispatch**. | Big green button. | "Confirm modal — ‘Dispatch will be approved and the certificate released to the customer.' Reason optional on Approve, mandatory on Hold/Reject/Override." |
| 4.4.3 | Dispatch Executive | Click **Confirm Approve**. | — | "Toast: ‘Dispatch approved'. Bell increments. Dispatch status flips Ready → **Approved**, workflow advances to Stage 4 of 5." |
| 4.4.4 | — | Scroll to the workflow strip. | Generate ✓, Customer Validation ✓, QA Review ✓, Dispatch Approval ✓, Released pulses. | "Four of five complete. The shipment is cleared to leave the warehouse." |
| 4.4.5 | Dispatch Executive | Click **Approve Dispatch** is now disabled. Instead, hover the **Override decision** link. | Visible to QA Manager only. | "After approval, the next physical event is the actual dispatch. In production that's wired to the shipment system; in the demo we treat ‘Released' as a follow-up dispatch decision." |

### 4.5 · The audit drawer recap

| # | Action | UI pointer | What to call out |
|---|---|---|---|
| 4.5.1 | Click **View history** (top-right of header). | Audit drawer opens. | "Read down the list: certificate created (QA Engineer), certificate issued (QA Manager), dispatch approved (QA Manager / Dispatch Executive)." |
| 4.5.2 | Click **▸ View change** on the dispatch entry. | Field-level diff showing `dispatchStatus: Ready → Approved`. | "Same auditor-ready diff as Phases 1–4. The reason field is captured even when blank — explicit ‘no reason on approve' is itself audited." |
| 4.5.3 | — | Close the drawer. | — | "Every role's contribution is recorded. Every decision is justifiable on paper." |

### 4.6 · Hold, Reject, Override — what each one does

| # | Decision | Behaviour | When to use |
|---|---|---|---|
| 4.6.1 | **Hold Dispatch** | Sets dispatchStatus = **Held**, requires a reason, emits a warning notification. | Customer paperwork pending, transport not arranged, edge-case spec needs verification. |
| 4.6.2 | **Reject Dispatch** | Sets dispatchStatus = **Rejected**, requires a reason, emits a danger notification. | Customer-spec failure discovered after issue, batch quality concern surfaced post-approval. |
| 4.6.3 | **Request Review** | Sends back for QA review (internally a Hold with `Review` UX label). | Compliance ambiguity — get a second pair of eyes before committing. |
| 4.6.4 | **Override decision** | QA Manager-only supervisor bypass. Sets dispatchStatus = **Overridden**, requires a reason. | Emergency customer commitment that overrides a Hold or Reject. Audited, never silent. |

**Talking point:** "Same three-button grammar you've seen since Phase 1 — Approve / Hold / Reject — plus Review and Override as escalations. Every one of those decisions is one row in the audit log."

---

## Chapter 5 · The framework angle — closing the loop (Role: any)

> Goal: 60-second close — why Phase 5 was the cheapest module to build, and why the next four will be cheaper still.

| # | Talking point | What to show |
|---|---|---|
| 5.1 | "The certificate workbench is the **product-quality workbench** with three sections swapped." | Toggle between `/product-quality/PB-2026-000210` and `/certificates/COA-2026-001245` — show that the layout (header → strip → genealogy → workspace → right rail) is identical. Only the workspace sections and the hero KPI changed. |
| 5.2 | "Workflow strip, audit, notifications, Quality Insights pattern — **composed, not rewritten**." | Optional: open `api/app/frameworks/certificate_insights.py` for 5 seconds — show that it's the same shape as `product_insights.py` and `metal_insights.py`. |
| 5.3 | "The genealogy framework now pays full dividend. Every upstream phase's data flows into the **Quality Results Summary** unchanged." | Scroll the four roll-up cards. "Phase 1 status, Phase 2 status, Phase 3 status, Phase 4 compliance — one document, four sources, zero copying." |
| 5.4 | "Heat Chemistry, Casting, Mechanical Testing, MTC & Dispatch all dock into the same chain. Each will add one more node to the **Genealogy Expanded View**." | Sidebar → point at the *Future modules* group. "The framework is proven across five modules. The next four cost weeks, not months." |
| 5.5 | "Customer scans the QR → lands on COA-2026-001245 → five clicks back to LOT-2026-0042. **One chain. One audit. One document.**" | Point at the QR placeholder, then at the genealogy expanded view, then at the audit drawer. |

---

## Quick reference · Roles & what they can do (Phase 5)

| Role | Can do | Cannot do |
|---|---|---|
| **Stores Executive** | (Phase 1–4 actions) | Any certificate action |
| **Sampler** | (Phase 1–3 actions) | Any certificate action |
| **Lab Analyst** | (Phase 1–4 actions) | Any certificate action |
| **QA Engineer** | Generate certificate, Hold dispatch, Request review | Issue, Approve dispatch, Reject, Override |
| **QA Manager** *(also maps to Dispatch Executive)* | All certificate actions: Generate, Issue, Approve / Hold / Reject / Review / Override dispatch, Cancel | (super-role) |
| **Viewer** *(also maps to Customer Service)* | Read only | Anything that mutates |

**Permissions enforced** (defined in `web/src/lib/roles.ts`):

- `certificate:create` — QA Engineer, QA Manager
- `certificate:issue` — QA Manager
- `certificate:dispatch-approve` — QA Manager
- `certificate:dispatch-hold` — QA Engineer, QA Manager
- `certificate:dispatch-reject` — QA Manager
- `certificate:override` — QA Manager

> Every disabled button has a tooltip explaining *why* — hover any greyed-out button to demonstrate.

---

## Quick reference · Hero data (Phase 5)

**Active hero — `COA-2026-001245`** (the workbench you spend most of chapter 3 on):

- Customer: **Export Customer**
- Product batch: **PB-2026-000210** (Primary Aluminum Billet)
- Status: **Issued** · Dispatch: **Ready**
- Customer specs: **11 of 11 passing**, zero warn, zero fail
- Release Confidence: **99/100** (per backend math: 60 pts customer + 25 pts product + 10 pts coverage + 5 base, with ±0.5 deterministic jitter)
- Recommendation: **APPROVE DISPATCH**
- Risk: **Low**
- Genealogy chain: `LOT-2026-0042 → PMQ-2026-001245 → MB-2026-001245 → PB-2026-000210 → COA-2026-001245` (5/5 coverage)

**Happy-path hero — `COA-2026-001260`** (the demo closer):

- Customer: **Hindalco International**
- Product batch: **PB-2026-000225** (Primary Aluminum Billet, 100 MT)
- Status: **Issued** · Dispatch: **Released**
- Full chain: `LOT-2026-0050 → PMQ-2026-001260 → MB-2026-001260 → PB-2026-000225 → COA-2026-001260`
- Audit trail: receipt created/approved, qualification created/released, metal batch created/released, product batch created/approved, certificate created/issued/dispatch-released — every step on the record

> Use this one to close the demo. "This is what a complete, audited, customer-ready record looks like — five modules, one chain, zero copy-paste."

**Sibling certificates** (for queue depth + state variety):

| Number | Product batch | Customer | Status | Dispatch | Notes |
|---|---|---|---|---|---|
| COA-2026-001260 | PB-2026-000225 | Hindalco International | Issued | **Released** | Happy-path demo chain |
| COA-2026-001245 | PB-2026-000210 | Export Customer | **Issued** | Ready | Active hero |
| COA-2026-001243 | (sibling) | Export Customer | Issued | Released | Earlier export delivery |
| COA-2026-001242 | (sibling) | Domestic Client A | Issued | **Held** | Customer documentation pending |
| COA-2026-001241 | (sibling) | Extrusion Co. | **Draft** | Pending | Awaiting QA sign-off |
| COA-2026-001240 | (sibling) | Domestic Client B | **Cancelled** | Pending | Customer order withdrawn |

- **Hero metric:** Release Confidence (0–100) — 60 pts customer-spec pass rate, 25 pts upstream product compliance, 10 pts chain coverage, 5 pts base.
- **Recommendation set:** APPROVE DISPATCH · HOLD DISPATCH · REJECT DISPATCH · REQUEST REVIEW · AWAITING DATA.

---

## Quick reference · Reset between demos

The store is in-memory. **Restart the `uvicorn` process** (Ctrl+C in Window A, re-run `uvicorn app.main:app --reload --port 8000`) and Phase 1 through Phase 5 seed data refresh together — both hero certificates and the full five-node happy-path chain are reseeded. The frontend reconnects automatically within ~4 seconds.

---

## Lightning version (6 minutes)

If you only have 6 minutes:

1. **The hand-off** (45s) — Product Quality → `PB-2026-000210` (Approved) → Genealogy card → click certificate node → land on `/certificates/COA-2026-001245`. "Same chain, fifth and final question."
2. **Workbench tour** (90s) — header (Issued · Ready · Export Customer), workflow strip (Generate → Released), right-rail walk-through with focus on **Release Confidence 99/100** and **APPROVE DISPATCH** recommendation.
3. **Quality Results Summary** (60s) — walk the four upstream cards (Incoming Inspection · Process Qualification · Metal Quality · Product Testing). "One document, four phases, every link live."
4. **Generate + issue a fresh certificate** (90s) — switch to QA Engineer → Generate Certificate for `PB-2026-000209` / Domestic Client A → switch to QA Manager → Issue Certificate. Watch the workflow strip advance and Release Confidence climb.
5. **Approve Dispatch** (45s) — Dispatch Approval Center → Approve Dispatch → Confirm. Toast: "Dispatch approved". Workflow strip lands on Stage 4 of 5.
6. **Closing happy-path screen** (30s) — open `/certificates/COA-2026-001260`. "Hindalco International. Status Issued, dispatch Released. Five nodes from supplier to customer, every decision audited. This is the chain proven across all five modules."
