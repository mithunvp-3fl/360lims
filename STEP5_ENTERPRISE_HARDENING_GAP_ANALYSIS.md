# Step 5 — Enterprise Hardening: Phase 1 Gap Analysis

**Branch:** `main`
**Hero record:** `COA-2026-001245` → `PB-2026-000210` → `MB-2026-000789`
**Stack confirmed:** FastAPI 0.115 / Pydantic 2.9 / Next 14 / Tailwind / shadcn / React Query / Recharts
**Scope:** Phase 1 only — review existing implementation, identify reuse, surface gaps. **No code changes.**

---

## 1. Verdict

Step 5 is **substantially implemented** and follows the established Phase 1–4 module pattern. The earlier audit (`STEP5_CERTIFICATE_DISPATCH_REVIEW.md`) is **still accurate today**: queue, workbench, customer-spec validation, release-confidence insights, dispatch state machine, genealogy, lineage, lifecycle, audit trail and activity feed are functional. The 14 enhancement phases are an **integration + presentation upgrade**, not a redesign.

Treat this as **enhance, not rebuild**. Every framework the enhancement PRD needs already exists; the gap is wiring + UI surfaces + document generation.

---

## 2. What already exists and is directly reusable (do not duplicate)

| Asset | Path | Reused by enhancement phase |
|---|---|---|
| **Task framework** (CRUD, blockers, SLA, escalation, approval decisions) | `api/app/frameworks/task_engine.py` + `api/app/routers/work.py` + `api/app/schemas/task.py` | Phase 10 (Task integration) — **no new engine** |
| **My Work queue projections** (`/work/my`, `/team`, `/approvals`, `/escalations`, `/blocked`, `/upcoming`, `/summary`, `/tasks?recordKey=…`) | `api/app/routers/work.py` | Phase 10 — tasks auto-surface once `recordKey` is set |
| **RelatedTasksPanel** (drop-in right-rail panel) | `web/src/components/work/related-tasks-panel.tsx` | Phase 10 — one-line embed into certificate workbench |
| **Audit framework** | `api/app/frameworks/audit.py` (already integrated by certificates router) | Phase 11 + Phase 12 timeline data source |
| **Notification framework** | `api/app/frameworks/notifications.py` (already wired) | Phase 12 timeline (filtered stream already exists in `certificate-activity-feed.tsx`) |
| **Certificate insights** (Release Confidence 0–100, recommendation, risk, observations, trend, customer-pass count) | `api/app/frameworks/certificate_insights.py` + `web/src/components/certificates/certificate-insights-panel.tsx` | Phase 4 (Certificate Health KPI sits beside this); Phase 5 (margin analysis reuses the per-spec data) |
| **Genealogy / Lineage / Lifecycle** (5-step chain, CERTIFICATE node already covered) | `api/app/frameworks/genealogy.py`, `lineage.py`, `web/src/components/genealogy/{genealogy-card,lifecycle-progress-panel,material-lineage-panel}.tsx` | Phase 13 (Traceability Summary card) — the data is *already on the workbench*; Phase 13 needs a condensed card composition only |
| **Quality summary endpoint** (already returns the 5-step rollup with status + compliance + href) | `GET /certificates/{n}/quality-summary` → `QualityResultsSummary` component | Phase 13 (90% there — needs a tighter card form) |
| **Customer spec validation table** (parameter / required / actual / unit / compliance) | `customer-spec-validation.tsx` + `_build_customer_specs()` | Phase 5 — extend each row with a margin column; the spec values (`requiredMin/Max/Target`, `actualValue`) are already computed |
| **Dispatch state machine** (Approve / Hold / Reject / Override / Release with reason modal + role gating) | `dispatch-approval-center.tsx` + `POST /certificates/{n}/dispatch` | Phase 11 — keep UX as-is; record an Approval entity in addition |
| **Workflow strip** (5 stages) | `certificate-workflow-strip.tsx` | Phase 12 timeline complements this, doesn't replace it |
| **RoleGate + permissions** | `web/src/components/kit/role-gate.tsx` (`certificate:issue`, `certificate:dispatch-approve`, `certificate:dispatch-hold`, `certificate:dispatch-reject`, `certificate:override`) | Phase 10 (task assignment by role) + Phase 6 (approval chain roles) |
| **Section card + glass surface kit** | `web/src/components/kit/section-card.tsx` | Phase 4 / 5 / 6 / 12 / 13 — every new panel reuses this primitive |
| **In-memory store + seed data** | `api/app/store.py`, `api/app/seed.py` (hero `COA-2026-001245` + 4 siblings) | All phases — extend the seed only |

**Reuse target: ~75% of the enhancement is wiring + small UI components on top of existing frameworks. ~20% is new presentation (preview, timeline, traceability card, verification page). ~5% is new code (PDF + real QR/barcode libraries, versioning persistence).**

---

## 3. What is missing or stubbed (the gap)

### 3.1 Backend gaps

| # | Capability | Current state | Needed for phase |
|---|---|---|---|
| B1 | **Task framework integration** in certificate flow | `task_engine` is **never imported** by `api/app/routers/certificates.py` (grep confirmed) | Phase 10 — emit Review / Approve / Approve Dispatch / Release tasks on `POST /certificates`, `/issue`, `/dispatch`; complete tasks on the matching transitions |
| B2 | **Formal approval record** | Dispatch decisions mutate `certificate.dispatchStatus` directly; no row written to a `dispatch_approvals` collection | Phase 11 — persist one record per decision with actor / role / decision / reason / timestamp |
| B3 | **Approval chain identities** (Generated / Reviewed / Approved / Released By) | `certificate.createdBy` and `issuedBy` exist; no `reviewedBy` / `releasedBy` / per-stage timestamps | Phase 6 — add 4 optional `*By` + `*At` fields to `Certificate` (or derive from audit log) |
| B4 | **Certificate versioning** | `Certificate.status` has a `REVISED` enum value but no `version`, `parentCertificateId`, `revisionReason`; no list-versions endpoint | Phase 3 — add fields + `POST /certificates/{n}/revise` |
| B5 | **PDF generation** | Header Download button toasts `"PDF generation will be wired in production."`; no endpoint | Phase 9 — `GET /certificates/{n}/pdf` (and `/preview` for HTML) |
| B6 | **QR generator** | Frontend draws a deterministic hash pattern — **not a scannable QR** | Phase 7 — server returns SVG/PNG from a real encoder; payload is a verification URL |
| B7 | **Barcode generator** | Frontend draws random-width bars — **not Code128** | Phase 8 — server returns SVG/PNG; payload is `certificateNumber` |
| B8 | **Verification endpoint** | No `/verify/certificates/{number}` (or token-signed equivalent) | Phase 14 — public read-only payload (cert number, customer, status, dispatch status, issuedAt, compliance summary) |
| B9 | **Margin computation** | `_build_customer_specs()` only emits `complianceStatus`; margin (distance to nearest spec bound, % of band) is not computed | Phase 5 — extend `CustomerSpec` schema with `marginPct` + `marginValue` + a `marginStatus` (safe / tight / breach) and compute in `_build_customer_specs` |
| B10 | **Quality events timeline source** | Audit logs + notifications exist separately; no combined chronological feed endpoint | Phase 12 — `GET /certificates/{n}/events` that merges audit rows + dispatch decisions + task transitions, sorted by time |
| B11 | **Certificate Health KPI** | Insights returns `releaseConfidence`; no separate `certificateHealth` (data completeness, signature presence, version freshness, spec coverage) | Phase 4 — add a `certificateHealth` field on the insights payload (or a sibling endpoint) computed from cert fields, not from product results |

### 3.2 Frontend gaps

| # | Capability | Current state | Needed for phase |
|---|---|---|---|
| F1 | **Certificate Preview** before final COA | Direct render only; no modal/page that shows the COA layout pre-issue | Phase 2 — `<CertificatePreviewDialog>` opened from header (and from issue confirm) |
| F2 | **Versioning UI** | No version selector, no diff vs prior, no "revise" button | Phase 3 — version dropdown in header + revision dialog |
| F3 | **Certificate Health KPI tile** | Insights panel shows Release Confidence only | Phase 4 — add a sibling tile in `certificate-insights-panel.tsx` (or split into two cards) |
| F4 | **Margin Analysis column** | `customer-spec-validation.tsx` shows parameter / required / actual / unit / compliance | Phase 5 — add a Margin column with a tone-coded bar (safe / tight / breach) |
| F5 | **Approval Chain panel** | No combined view of Generated / Reviewed / Approved / Released roles + names + timestamps | Phase 6 — new panel under workbench right rail |
| F6 | **Real QR rendering** | `certificate-overview.tsx` `qrFromValue()` draws random squares | Phase 7 — `<img src="/api/v1/certificates/{n}/qr.svg">` or client-side `qrcode` library |
| F7 | **Real barcode rendering** | `certificate-overview.tsx` `barWidthsFromValue()` draws random bars | Phase 8 — `<img src="/api/v1/certificates/{n}/barcode.svg">` or `jsbarcode` |
| F8 | **PDF preview / download / print** | Header Download → toast placeholder | Phase 9 — wire Download to the PDF endpoint; add Preview + Print actions |
| F9 | **My Work surfacing** | Certificate workbench does NOT mount `<RelatedTasksPanel recordKey={n} moduleKey="certificates" />` | Phase 10 — single-line embed |
| F10 | **Quality Events Timeline** | Activity Feed exists (filtered notifications) but is event-typed; no chronological merged timeline with stage labels | Phase 12 — new `<QualityEventsTimeline certificateNumber={n}>` component |
| F11 | **Traceability Summary card** | Three panels render the chain (genealogy card, lifecycle, lineage, quality results summary) — no single compact card | Phase 13 — new `<TraceabilitySummaryCard>` composing the existing data into one tight card (5 rows: Supplier Lot / Qual / Metal / Product / Cert) |
| F12 | **Public Verification Page** | No `/verify/[certificateNumber]` route | Phase 14 — new public route, AppShell-less, read-only |

### 3.3 Dependency / packaging gaps

| Need | Where | Library |
|---|---|---|
| Real QR | `api/requirements.txt` | `qrcode[pil]==7.4.2` (Pillow as transitive) — or do it client-side with `qrcode` npm and skip server work |
| Code128 barcode | `api/requirements.txt` | `python-barcode==0.15.1` — or client-side `jsbarcode` |
| PDF generation | `api/requirements.txt` | `reportlab==4.2.x` (recommended — no external binary, deterministic deploy) **or** `weasyprint` (HTML→PDF, but adds GTK on Windows). **Recommendation: `reportlab` for parity with the lean stack.** |
| (PDF preview) | already covered by Next.js | — |

**Decision needed (Phase 9):** server-rendered PDF (`reportlab`) vs HTML→PDF (`weasyprint`) vs client-side (`react-pdf`). Recommended default: **`reportlab` + a `/pdf` endpoint** so the same artifact powers download, print, and email delivery.

---

## 4. Phase-by-phase reuse map

| Phase | Reuse | Net new |
|---|---|---|
| **2 — Certificate Preview** | All existing components rendered in a Dialog wrapper | `<CertificatePreviewDialog>` — composition only |
| **3 — Versioning** | `Certificate` schema extension; `audit.record` for revision events | Fields `version`, `parentCertificateId`, `revisionReason`; `POST /revise`; version dropdown UI |
| **4 — Certificate Health KPI** | `certificate_insights.compute()` extended; insights panel grid | `certificateHealth` computation + tile |
| **5 — Margin Analysis** | `_build_customer_specs` already has bounds + actual | Margin compute + extra column; tone bar |
| **6 — Approval Chain** | Audit log already records every decision with actor + role | Derive panel by reading audit rows (no schema change strictly required) **or** add 4 optional `*By/*At` fields for direct render |
| **7 — Real QR** | Existing layout slot in `certificate-overview.tsx` | Encoder (server or client) |
| **8 — Real Barcode** | Existing layout slot | Encoder |
| **9 — PDF** | Template renders the same data already on the workbench | Generator + endpoint + 3 buttons |
| **10 — Tasks** | `task_engine` + `RelatedTasksPanel` already built | Wire `create_task` into `POST /certificates`, `/issue`, `/dispatch`; mount panel; emit 4 task types per cert |
| **11 — Approvals** | `audit` + `notifications` integrated; dispatch endpoint mutates state | Persist a `DispatchApproval` record per decision (lightweight schema) |
| **12 — Timeline** | Activity feed + audit drawer already exist | Combined chronological component sourced from audit + tasks + dispatch decisions |
| **13 — Traceability Card** | `quality-summary` endpoint returns the rollup; 4 panels already render it | New compact card variant |
| **14 — Verification Page** | Public payload is a subset of the existing certificate fields | New public route + read-only endpoint (no auth) |

**Cumulative reuse: ~75%. New backend code surface: ~6 endpoints + 4 schema additions + 1 PDF template. New frontend components: ~7 new components, ~3 existing components edited.**

---

## 5. Risks and decisions to lock in before Phase 2

| # | Decision | Recommendation |
|---|---|---|
| D1 | Versioning model — copy-on-revise (new `Certificate` row pointing at parent) vs `versions[]` array on one row | **Copy-on-revise.** Matches the way `Certificate` is keyed by `certificateNumber`; lets us keep the historic immutable. Number scheme: `COA-2026-001245-R1`, `R2`. |
| D2 | Approval Chain source — derive from audit log vs add explicit fields | **Hybrid.** Add `reviewedBy/At`, `releasedBy/At` for cheap render; keep audit log as the audit source. Avoids a join per render. |
| D3 | PDF generator | **`reportlab`.** Single Python dep, no system libs, works on Render and Windows dev box. |
| D4 | QR / barcode rendering | **Server-rendered SVG endpoint** (`/certificates/{n}/qr.svg`, `.../barcode.svg`). Identical artifact in webview and PDF; the PDF generator can embed the same SVG. |
| D5 | Verification URL payload | Verification URL = `${PUBLIC_BASE}/verify/${certificateNumber}`. QR encodes that URL. Public endpoint returns: cert number, customer, status, dispatchStatus, issuedAt, compliance summary (counts), product batch, source metal batch. Never returns customerSpecs' raw numbers unless flag is set. |
| D6 | Task model for Phase 10 | Mirror Phase 4 (`product_batches`): emit `Review Certificate` on create → blocks `Approve Certificate` → blocks `Approve Dispatch` → blocks `Release Certificate`. All four under `moduleKey="certificates"` with `recordKey=certificateNumber`. Roles: QA Engineer / QA Manager / QA Manager / QA Manager. |
| D7 | Certificate Health formula | 4 weighted components: (a) data completeness 25 — cert has customer + ≥1 spec + product batch link; (b) spec coverage 25 — % parameters with non-null actual; (c) signature presence 25 — issued + signature !== "—"; (d) freshness 25 — issuedAt within 30 days of now. Tone: ≥90 success, ≥75 accent, ≥60 warning, else danger. |

If the user disagrees with any of D1–D7 I will adjust before Phase 2. Otherwise Phase 2 begins with these as the working assumptions.

---

## 6. Acceptance bar after Phase 14

| Metric | Target | How verified |
|---|---|---|
| Demo readiness | ≥9/10 | Workbench shows: preview ✓, version selector ✓, Release Confidence + Certificate Health side-by-side ✓, margin column ✓, approval chain ✓, real QR scannable ✓, real Code128 ✓, PDF downloadable + printable ✓, 4 related tasks visible ✓, timeline shows 8+ events ✓, traceability summary card ✓, public verify page resolves QR ✓ |
| Production readiness | ≥8/10 | Plus: approval records persisted, audit trail unbroken, versioning produces immutable history, role gating enforced at API for dispatch endpoints, PDF/QR generation deterministic, verification endpoint rate-limited (deferred OK if noted) |
| Framework reuse | 100% | No new task engine; no new approval engine; no new workflow engine; no new audit; no new notification system |

---

## 7. Awaiting confirmation to start Phase 2

Phase 1 complete. Holding before any code changes. Recommended sequencing for Phases 2–14:

```
Phase 2  Preview            ─┐
Phase 4  Health KPI          │  light-touch presentation work
Phase 5  Margin column       │  (1–2 days)
Phase 6  Approval Chain      │
Phase 13 Traceability card  ─┘

Phase 7  Real QR            ─┐
Phase 8  Real Code128        │  generator wiring
Phase 14 Verification page  ─┘  (~1 day)

Phase 10 Task integration   ─┐  framework wiring
Phase 11 Approval records    │  (1–2 days)
Phase 12 Events timeline    ─┘

Phase 3  Versioning         ─┐  schema + immutable history
Phase 9  PDF                ─┘  (~2 days)
```

This ordering front-loads quick visual wins for the demo and keeps the higher-effort PDF + versioning at the end, where they benefit from every preceding panel being final.
