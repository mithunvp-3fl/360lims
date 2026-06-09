# Quality360 — Phase 1

Modern Manufacturing Quality Intelligence Platform. Phase 1 ships the **Incoming Material Inspection** module on a reusable Workbench / Workflow / Approval / Audit / Notification / Insights framework. Not a LIMS — a control tower.

See [`CLAUDE.md`](./CLAUDE.md) for the canonical spec.

```
fifthApproach/
├── CLAUDE.md           # canonical spec
├── api/                # FastAPI + in-memory store
│   └── app/
│       ├── main.py
│       ├── schemas/      # Pydantic v2 models
│       ├── frameworks/   # workflow, audit, notifications, insights
│       └── routers/      # receipts, samples, results, approvals, …
└── web/                # Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
    └── src/
        ├── app/          # /dashboard, /inspection, /inspection/[lot], /instruments, /master-data
        ├── components/   # ui/, kit/, workbench/, shell/
        └── lib/          # api client, types, react-query hooks, role matrix
```

---

## Prerequisites

- **Python 3.11 or 3.12** — check with `python --version`
- **Node.js 18.18+** (20+ recommended) — check with `node --version`
- Two PowerShell windows (one for backend, one for frontend)

---

## 1. Start the backend (port 8000)

In a **new PowerShell window**:

```powershell
cd D:\srcCode\Vedant\fifthApproach\api

# create + activate a virtual environment (first time only)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# install dependencies (first time only)
pip install -r requirements.txt

# run the server
uvicorn app.main:app --reload --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`. The in-memory store seeds itself on first import (suppliers, materials, instruments, and 9 receipts including the hero lot `LOT-2026-0042`).

**Verify:** open <http://localhost:8000/docs> — Swagger UI lists 38 routes across receipts, samples, results, approvals, instruments, etc.

> If `Activate.ps1` is blocked by execution policy, run once:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 2. Start the frontend (port 3000)

In a **second PowerShell window** (leave the backend running):

```powershell
cd D:\srcCode\Vedant\fifthApproach\web

# install dependencies (first time only — takes 1–2 min)
npm install

# run the dev server
npm run dev
```

You should see `Ready in …` and `Local: http://localhost:3000`.

> The frontend reads `NEXT_PUBLIC_API_BASE` from `.env.local`. It's already set to `http://localhost:8000` — no edits needed.

---

## 3. Open the app

<http://localhost:3000> → redirects to **Dashboard**.

### Demo path

1. **Dashboard** — KPIs, throughput chart, supplier mix, risk hotspots, recent activity.
2. Click **"Jump into demo workbench"** (top right) → opens the marquee screen for `LOT-2026-0042`.
3. In the workbench, try:
   - **Approval Center** (right rail, bottom) → click **Approve**. Watch the toast, the workflow timeline advance to Release, and a new entry land in the bell.
   - **View history** (top right of the header) → audit trail for everything that's happened to this lot.
4. Go back to **Inspection Queue** (sidebar) → click **New Receipt** → fill the form → submit.
   - Toast fires, you land in the new lot's workbench with status **Pending Sampling**.
   - Click **Create Sample** → ~1s "Generating…" → sample appears, tests auto-assigned (XRF / OES / Moisture for Aluminum Scrap).
   - For one of the tests, click **Import** → **6-stage instrument simulation** (~4.5s) → results materialize with spec-compliance coloring.
   - Try **Manual** entry on another test (reason is mandatory).
   - Try **Upload** on a third test.
   - Watch the **Quality Insights** panel update its recommendation as more parameters come in.
5. **Role switcher** (top-right shield icon) — switch to **Viewer** and notice every action button greys out with a tooltip explaining the gate.
6. **Instrument Integrations** (sidebar) — see all 4 devices, their status, vendor, model, last import time.
7. **Master Data** (sidebar) — Suppliers / Materials / Instruments tabs.

---

## What's in this build

- **Dashboard** — KPI strip, throughput trend, status mix, supplier performance, risk hotspots, recent receipts, live activity.
- **Inspection Queue** — filterable, searchable list of every lot; row actions for open / clone / cancel; create-receipt dialog.
- **Inspection Workbench** — the marquee screen. Header, workflow timeline, material overview with spec table, sample management, test results workspace, instrument import flow with the 6-stage realistic sequence (≈4.5s), manual entry (reason mandatory), file upload, instrument activity feed, **Quality Insights** panel (no AI language), approval center with confirm dialog, audit drawer.
- **Instrument Integrations** — health KPIs, instrument cards with vendor/model/serial, supported parameters, last import.
- **Master Data** — Suppliers, Materials, Instruments under tabs; searchable.
- **Role switcher** — six roles in the topbar. Buttons disable with tooltips when current role can't perform an action.
- **Notification stream** — bell + Sonner toasts driven by API polling. Every mutation produces feedback.
- **Audit trail** — every mutation funnels through one framework call; viewable per-lot from the workbench header.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows "No notifications yet" and no data anywhere | Backend isn't running. Check the backend window for errors. |
| `npm install` errors on `peer dep` | Use Node 20+. Or rerun with `npm install --legacy-peer-deps`. |
| `uvicorn: command not found` | Virtual env not activated. Run `.\.venv\Scripts\Activate.ps1` again. |
| Port 8000 already in use | `uvicorn app.main:app --reload --port 8001` and set `web/.env.local` → `NEXT_PUBLIC_API_BASE=http://localhost:8001`. |
| Need to reset all data | Stop and restart the backend — store is in memory, restart = clean slate (seeded again). |

**Stopping:** Ctrl+C in each window.

---

## Architecture notes

- Frameworks (`api/app/frameworks/`) are module-agnostic. To add **Heat Chemistry**, register a new `WorkflowDefinition` and compose workbench sections — no framework changes.
- The frontend's `<WorkbenchHeader>`, `<WorkflowTimeline>`, `<SectionCard>`, `<RoleGate>`, etc. work with any entity that supplies a workflow + actions.
- The instrument simulation is server-agnostic: stages live in the client; the server records the final import as a single audited event with realistic values keyed off `(instrument, sample, test)` so demos are repeatable.

## Conventions

- Light theme is the default and only theme in Phase 1. Tokens live in `web/src/app/globals.css` and `web/tailwind.config.ts`.
- Never the word "AI" in user-facing copy — use "Quality Insights", "recommendation", "based on history".
- Every mutation: emit a notification + audit + invalidate React Query keys.
