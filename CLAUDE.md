# Quality360 — Canonical Spec

**Project:** Quality360 Next — Phase 1 (Incoming Material Inspection)
**Location:** `D:\srcCode\Vedant\fifthApproach`
**Source documents:** `Claude Master Build Prompt.pdf`, `Quality360 Next PRD.pdf`

This file is the single source of truth. When the PDFs and this file diverge, this file wins (and update the file).

---

## 1. Product Vision

Quality360 is a Manufacturing Quality Intelligence Platform for Metals, Mining, Smelters, Carbon Plants, Aluminum, Steel, and process industries.

The application must feel like:
- Modern Manufacturing Control Tower
- Enterprise SaaS (Linear, Stripe, Datadog, Notion)
- Production application

It must NOT feel like:
- Traditional LIMS
- SAP transaction screen
- Excel replacement
- Wireframe / prototype

> Users should understand the current situation within 3–5 seconds on any screen.

The Phase 1 deliverable is **runnable with mock data** — frontend fully built, FastAPI scaffold backing every endpoint with an in-memory store. No Postgres in Phase 1.

---

## 2. Tech Stack

**Frontend** (`web/`)
- Next.js 14 (App Router) · TypeScript · TailwindCSS 3 · shadcn/ui primitives (inlined)
- React Query (`@tanstack/react-query`) for server state
- Recharts for KPI visuals
- `sonner` for toast notifications
- `lucide-react` for iconography

**Backend** (`api/`)
- Python 3.11 · FastAPI · Pydantic v2
- In-memory store (`app/store.py`) — production will swap to SQLAlchemy + Postgres + Alembic; surface is stable

---

## 3. Theme

**Semi-light only** (Linear / Stripe light). Hard-coded dark colors are a regression.

| Token | Value |
| --- | --- |
| `--bg-app` | `244 247 252` (#F4F7FC) |
| `--bg-surface` | `255 255 255` |
| `--bg-inset` | `237 242 248` |
| `--text` | `15 23 42` (slate-900) |
| `--text-muted` | `100 116 139` (slate-500) |
| `--border` | `226 232 240` (slate-200) |
| `--accent` (intel) | `124 58 237` (violet-600) |
| `--success` | `5 150 105` (emerald-600) |
| `--warning` | `217 119 6` (amber-600) |
| `--danger` | `220 38 38` (red-600) |
| `--info` | `37 99 235` (blue-600) |

Cards use white surfaces with subtle borders and shadow — *glassmorphism rendered for light mode*: low-opacity tinted gradient overlay, 1px slate-200 border, soft shadow. Backdrop blur reserved for the topbar.

---

## 4. Information Architecture

| Route | Page |
| --- | --- |
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Quality Operations Dashboard |
| `/inspection` | Incoming Material Inspection Queue |
| `/inspection/[lotNumber]` | Inspection Workbench (primary screen) |
| `/instruments` | Instrument Integrations |
| `/master-data` | Master Data (Suppliers, Materials, Tests, Instruments) |

Sidebar also shows Reports & Analytics and Settings as "Coming soon" — placeholders only.

---

## 5. Frameworks (reusable beyond Incoming Material Inspection)

These are first-class concerns. Do NOT bake Incoming-Material logic into them.

1. **Workbench Framework** — `<WorkbenchShell>` lays out: header, timeline, two-column body (workspace + sidecar), approval footer. Each module supplies sections. (`web/src/components/workbench/workbench-shell.tsx`)
2. **Workflow Engine** — generic stage machine driven by a `WorkflowDefinition`. Modules register stages; transitions emit notifications + audit events. (`api/app/frameworks/workflow_engine.py`)
3. **Approval Framework** — `decide(entityType, entityId, decision, reason)` with policy hooks per module.
4. **Audit Trail Framework** — `audit(actor, action, entityType, entityId, prev, next)` — every mutation in the API funnels through this.
5. **Notification Framework** — server emits structured events; client subscribes via polling (would be SSE in production). Every successful mutation produces a toast.
6. **Instrument Integration Framework** — `<InstrumentImportFlow>` runs the staged sequence (Connecting → Verifying → Reading → Parsing → Validating → Completed) over ~4.5s, then materializes results.
7. **Quality Insights Framework** — given a receipt + results, computes `recommendedAction`, `riskLevel`, `supplierHealth`, `observations[]`. Pure function on the server, fed to the always-visible Insights panel.

---

## 6. Data Model (entities)

`Supplier`, `Material`, `Receipt`, `Sample`, `Test`, `Result`, `Approval`, `Workflow`, `Instrument`, `Notification`, `AuditLog`. Detailed shapes live in `api/app/schemas/`.

**Receipt status** (canonical): `Pending Sampling`, `Pending Testing`, `Pending Review`, `Approved`, `Rejected`, `On Hold`.
**Workflow stages**: `Receipt → Sample → Testing → Validation → Review → Release`.

---

## 7. Roles

`Stores Executive`, `Sampler`, `Lab Analyst`, `QA Engineer`, `QA Manager`, `Viewer`. Active role is selected from the topbar (state lives in localStorage). Actions disabled with tooltip when role is insufficient.

---

## 8. Instrument Simulation (mandatory feel)

When the user clicks **Import from Instrument**, run the staged sequence over **4–5 seconds total** (≈750ms per stage). Stages:

```
Connecting to Instrument...
Verifying Communication...
Reading Sample...
Parsing Result File...
Validating Result Structure...
Import Successful
```

Each stage emits an activity feed entry. Only after `Import Successful` do the result rows materialize. Mock values are deterministic per `(instrumentId, sampleId)` so demos are repeatable.

---

## 9. Quality Insights Panel

Always visible in the workbench right rail. Surfaces:

- **Recommended Action** — `APPROVE` / `HOLD` / `REJECT` with a one-line rationale
- **Risk Level** — `LOW` / `MEDIUM` / `HIGH`
- **Supplier Health** — 0–100 with sparkline
- **Tests Completed** — `n / total`
- **Key Observations** — 2–4 bullets, business language
- **Historical Comparison** — last 5 deliveries from same supplier+material

**Never use the word "AI".** Use "Quality Insights", "recommendation", "based on history", "compliance check".

---

## 10. Notifications

Every successful mutation produces a toast. Examples: *Receipt Created*, *Sample Created*, *Results Imported*, *Validation Completed*, *Material Approved*. Errors get destructive variants. The bell in the topbar opens a Notification Center with the same events persisted.

---

## 11. Demo Data Anchors

- **Suppliers:** ABC Metals, Premium Scrap Resources, Global Alloy Traders
- **Materials:** Aluminum Scrap, Primary Aluminum, Silicon Metal, Calcined Coke
- **Instruments:** Thermo OES-01, Panalytical XRF-01, LECO CS-01, Moisture-01
- **Hero lot for the demo:** `LOT-2026-0042` — Aluminum Scrap from ABC Metals, the workbench opens straight into this one.

---

## 12. How to run

```bash
# Backend (port 8000)
cd api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (port 3000)
cd web
npm install
npm run dev
```

The frontend reads `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8000`).

---

## 13. Future modules (must reuse, not rebuild)

Heat Chemistry · Casting Quality · Mechanical Testing · MTC & Dispatch · Instrument Integration Hub · Reports & Analytics

Adding a new module = registering a `WorkflowDefinition` + a workbench section composition. No new framework code.
