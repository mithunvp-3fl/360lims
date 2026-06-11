# Step 5 — Certificate & Dispatch: Implementation Status Audit

## Executive Summary

**Overall Status: MOSTLY COMPLETE (~78% implemented)**

Step 5 "Certificate & Dispatch" is substantially implemented with a functional queue, certificate workbench, customer spec validation, dispatch approval workflow, release confidence insights, activity feed, audit trail, and end-to-end traceability. Core flows work end-to-end. Critical gaps:

1. **No Task Engine integration** — `task_engine.py` exists but is not called from the certificate flow.
2. **No Approval Framework integration** — dispatch decisions mutate `certificate.dispatchStatus` directly; no entry in the approval framework.
3. **PDF generation stubbed** — download button shows a toast: *"PDF generation will be wired in production."*
4. **Customer Release Approval workflow missing** — no formal customer sign-off gate.
5. **Shipment / Customer Package not implemented** — no manifest, packing slip, shipping label, customer portal.
6. **QR / barcode / digital signature are visual placeholders** — no real encoding or PKCS#7 signing.
7. **Role-based gating is UI-only** — no permission enforcement at API endpoints.

---

## 1. Implementation Inventory

### Frontend (`web/`)

| File | Purpose | Status |
|---|---|---|
| `web/src/app/certificates/page.tsx` | Certificate Queue — list, filter by status/dispatch/customer, search | Implemented |
| `web/src/app/certificates/[certificateNumber]/page.tsx` | Certificate Workbench layout (header, workflow strip, panels) | Implemented |
| `web/src/components/certificates/certificate-header.tsx` | Header w/ status badges, Download PDF button (placeholder) | Partial |
| `web/src/components/certificates/certificate-workflow-strip.tsx` | 5-stage progress (Generate → Validation → QA Review → Dispatch → Released) | Implemented |
| `web/src/components/certificates/certificate-overview.tsx` | ID, QR (mock), barcode (mock), digital signature (placeholder "—") | Partial |
| `web/src/components/certificates/customer-spec-validation.tsx` | Parameter / Required / Actual / Unit / Compliance table | Implemented |
| `web/src/components/certificates/quality-results-summary.tsx` | Upstream product-batch test rollup | Implemented |
| `web/src/components/certificates/genealogy-expanded-view.tsx` | Chain visualizer | Implemented |
| `web/src/components/certificates/certificate-insights-panel.tsx` | Release Confidence, recommendation, risk, observations | Implemented |
| `web/src/components/certificates/dispatch-approval-center.tsx` | Approve / Hold / Reject / Override / Release w/ reason modal, role-gated | Implemented |
| `web/src/components/certificates/certificate-activity-feed.tsx` | Filtered notification stream | Implemented |
| `web/src/components/certificates/certificate-audit-drawer.tsx` | Audit trail viewer | Implemented |
| `web/src/components/certificates/certificate-status-pill.tsx` / `dispatch-status-pill.tsx` | Status badges | Implemented |
| `web/src/components/certificates/generate-certificate-dialog.tsx` | Create certificate from approved product batch | Implemented |
| `web/src/components/genealogy/lifecycle-progress-panel.tsx` | 5-step journey panel (Incoming → Qual → Metal → Product → Certificate) | Implemented |
| `web/src/components/genealogy/material-lineage-panel.tsx` | Parents / Current / Children typed lineage | Implemented |
| `web/src/components/shell/sidebar.tsx` | Nav entries for Certificate & Dispatch | Implemented |
| `web/src/lib/queries.ts` | React Query hooks (useCertificates, useCertificate, useIssueCertificate, useDispatchCertificate, useCertificateInsights, useCertificateQualitySummary, useCertificateAudit) | Implemented |
| `web/src/lib/types.ts` | CertificateStatus, DispatchStatus, DispatchDecision, Certificate, CustomerSpec, CertificateInsight, QualitySummary | Implemented |

### Backend (`api/`)

| File | Endpoint / Purpose | Status |
|---|---|---|
| `api/app/routers/certificates.py` | `GET /certificates`, `POST /certificates`, `GET /certificates/{n}`, `POST /certificates/{n}/issue`, `POST /certificates/{n}/dispatch`, `POST /certificates/{n}/cancel`, `GET /certificates/{n}/insights`, `GET /certificates/{n}/quality-summary`, `GET /certificates/{n}/audit`, `GET /certificates/queue/summary` | Implemented |
| `api/app/schemas/certificate.py` | CertificateStatus, DispatchStatus, DispatchDecision, CustomerSpec, Certificate, QualitySummary | Implemented |
| `api/app/schemas/certificate_insights.py` | CertificateInsight (releaseConfidence, trend, recommendation, rationale, riskLevel, observations) | Implemented |
| `api/app/frameworks/certificate_insights.py` | Pure function: 0–100 score from customer spec compliance + product compliance + chain coverage | Implemented |
| `api/app/frameworks/genealogy.py` | Chain builder, includes CERTIFICATE node | Implemented |
| `api/app/frameworks/lineage.py` | Typed lineage edges incl. CERTIFICATE → PRODUCT_BATCH | Implemented |
| `api/app/frameworks/task_engine.py` | Generic task framework | **Exists but NOT called by certificates** |
| `api/app/frameworks/workflow_engine.py` | Stage machine | **Exists but NOT explicitly used by certificates** |
| `api/app/frameworks/approval.py` (referenced) | Approval recording | **NOT integrated with dispatch decisions** |
| `api/app/frameworks/audit.py` | Audit recording | Integrated |
| `api/app/frameworks/notifications.py` | Notification emission | Integrated |
| `api/app/store.py` | `db.certificates` dict + `certificate_by_number()` lookup | Implemented |
| `api/app/seed.py` | `_seed_certificates()` — hero `COA-2026-001245` + siblings across dispatch statuses | Implemented |

---

## 2. Screen Inventory

| Screen | Status | Evidence |
|---|---|---|
| Certificate Queue | Implemented | `web/src/app/certificates/page.tsx` — filters, search, action menu, counts |
| Certificate Workbench | Implemented | `[certificateNumber]/page.tsx` — full panel composition |
| Certificate View / Overview | Partial | QR + barcode are mock visuals; signature is "—" placeholder |
| Dispatch Approval | Implemented | `dispatch-approval-center.tsx` — Approve/Hold/Reject/Override/Release w/ reason modal |
| Customer Spec Validation | Implemented | `customer-spec-validation.tsx` |
| Genealogy View | Implemented | Genealogy card + lifecycle + material-lineage panels |
| Certificate PDF | Not Implemented | Header download button → toast placeholder; no `/pdf` endpoint |
| Customer Package / Manifest | Not Implemented | No shipment entity, no packing slip |

---

## 3. Data Model Review

### Certificate (`api/app/schemas/certificate.py`)
Fields: `id`, `certificateNumber`, `productBatchNumber`, `productBatchId`, `customer`, `customerSpecs[]`, `status`, `dispatchStatus`, `issuedAt/By`, `createdAt/By`, `qrCodeValue`, `barcodeValue`, `digitalSignaturePlaceholder`, `notes`.
Relationship: 1:1 to ProductBatch by number; chains upstream via product → metal → qualification → receipt.
Status: Implemented.

### CustomerSpec (embedded)
Fields: `parameter`, `unit`, `requiredMin/Max/Target`, `actualValue`, `complianceStatus`.
Derived at certificate creation by `_build_customer_specs()`; not persisted independently. Implemented.

### DispatchStatus / DispatchDecision (enums)
States: Pending, Ready, Approved, Held, Rejected, Released, Overridden.
Actions: Approve, Hold, Reject, Override, Release. Implemented.

### Missing Entities
| Entity | Status |
|---|---|
| DispatchApproval (formal approval record) | NOT IMPLEMENTED — state stored on certificate only |
| Customer (master, contact, requirements) | NOT IMPLEMENTED — string field only |
| Shipment / Package / Manifest | NOT IMPLEMENTED |
| Release record (cert ↔ customer ack) | NOT IMPLEMENTED |
| COA Template | NOT IMPLEMENTED |
| Generated PDF / Signed file | NOT IMPLEMENTED |

---

## 4. Feature Coverage Matrix

| Capability | Status | Notes |
|---|---|---|
| Certificate Queue | Implemented | Filters + search + actions |
| Certificate Workbench | Implemented | Full layout, all panels wired |
| COA Generation | Implemented | POST /certificates from product batch |
| Customer Specification Validation | Implemented | Compliance badges + counts |
| Product Batch Link | Implemented | `_build_customer_specs()` pulls product batch results |
| Metal Batch Link | Implemented | `_chain_for_certificate()` walks via product batch |
| Material Lineage | Implemented | Lineage framework covers CERTIFICATE node |
| Lifecycle Progress | Implemented | 5-step journey panel |
| PDF Generation | Missing | Toast placeholder only |
| QR Code | Partial | Visual hash pattern, not real QR encoding |
| Barcode | Partial | Visual stripes, not real Code128 |
| Dispatch Approval | Implemented | Buttons + reason modal + role gating |
| Customer Package | Missing | No shipment/manifest |
| Activity Feed | Implemented | Filtered notifications |
| Audit Trail | Implemented | Every mutation recorded |
| Notifications | Partial | emit() on create/issue/dispatch; no channel routing |
| Workflow | Partial | State-machine only; no workflow_engine integration |
| Tasks | Missing | task_engine never called from cert flow |
| Approvals | Partial | Audit + notification, but no Approval framework record |
| Release Confidence | Implemented | 0–100 from `certificate_insights.py` |

---

## 5. Traceability Review

**Chain: Certificate → Product Batch → Metal Batch → Qualification → Supplier Lot — fully wired.**

Evidence in `api/app/routers/certificates.py` `_chain_for_certificate()`:
- Resolves product batch via `db.product_batch_by_number(cert.productBatchNumber)`
- Extracts `sourceMetalBatchNumber` → metal batch
- Extracts `sourceQualificationNumber` → qualification
- Extracts `sourceLotNumber` → receipt (supplier lot)
- Returns full 5-step chain

Consumers:
- Quality Summary endpoint populates `QualitySummary.steps[]` with links to each upstream entity.
- Insights endpoint uses chain coverage to weight Release Confidence.
- Frontend genealogy + lineage + lifecycle panels render the chain visually.

Status: **Implemented end-to-end.**

---

## 6. Workflow Review

### Stages (UI strip in `certificate-workflow-strip.tsx`)
1. Generate — on certificate create
2. Customer Validation — on status ≥ Issued
3. QA Review — on dispatchStatus ≥ Ready
4. Dispatch Approval — on dispatchStatus ≥ Approved/Overridden
5. Released — on dispatchStatus = Released

### Transitions (`/certificates/{n}/issue`, `/certificates/{n}/dispatch`)
Pure state-machine over `certificate.status` + `certificate.dispatchStatus`.

### Framework integration
| Framework | Wired? |
|---|---|
| `workflow_engine` | No (state lives directly on the entity) |
| `task_engine` | No |
| `approval` | No (dispatch decisions update state directly) |
| `audit` | Yes |
| `notifications` | Yes |

**Gap:** No parallel tasks, no SLAs, no escalations, no formal approval objects. Demo-grade.

---

## 7. Customer Release Review

| Sub-capability | Status |
|---|---|
| Customer-specific requirements | Partial — `CustomerRequirement` overrides at creation; no Customer master |
| Customer specification validation | Implemented — compliance table with pass/warn/fail |
| Customer release approval | Not Implemented — QA approves; no customer sign-off |
| Customer package generation | Not Implemented |
| Customer traceability (external) | Not Implemented — no customer-facing URL |
| Digital certificate delivery | Not Implemented — no email / portal / signed file |

---

## 8. Document Generation Review

| Artifact | Status | Evidence |
|---|---|---|
| Certificate PDF | Not Implemented | `certificate-header.tsx` Download button → `toast.info("PDF generation will be wired in production.")` |
| Report Generation | Not Implemented | No export endpoints |
| Printable documents | Not Implemented | Screen layout only |
| Export (CSV/Excel/JSON) | Not Implemented | None |
| Digital signature | Not Implemented | UI placeholder "PKCS#7 signing wired in production" |
| QR | Partial | `certificate-overview.tsx` deterministic visual; not a real QR encoding |
| Barcode | Partial | `certificate-overview.tsx` stripes; not Code128/Code39 |

---

## 9. Demo Readiness Scores (0–10)

| Area | Score | Reasoning |
|---|---|---|
| Certificate Management | 8 | Queue, workbench, status flow work end-to-end |
| Dispatch Management | 8 | All 5 decisions work, role-gated; missing approval record |
| Traceability | 9 | Full 5-step chain visible and wired through genealogy/lineage |
| Workflow | 5 | State-machine only; no engine/tasks/approvals |
| Tasks | 0 | Not integrated |
| Audit | 8 | Every mutation recorded |
| Notifications | 7 | Emit works; channels/routing missing |
| User Experience | 8 | Polished panels, good gating, placeholders clearly labeled |
| Vedanta Relevance | 6 | Covers cert + dispatch; missing logistics/customer handoff |
| **Demo Readiness** | **7** | Internal demo: yes. Customer demo: marginal due to placeholders |
| **Production Readiness** | **3** | Missing tasks, approvals, real PDF/signature, customer release, shipment |

---

## 10. Gap Analysis

| Capability | Current | Required | Gap | Effort |
|---|---|---|---|---|
| Certificate Queue | Full | — | None | — |
| Certificate Workbench | Full | — | None | — |
| Customer Spec Validation | Full | — | None | — |
| Dispatch Approval (UI) | Full | — | None | — |
| Release Confidence | Full | — | None | — |
| Traceability Chain | Full | — | None | — |
| Audit Trail | Full | — | None | — |
| **Task Engine Integration** | None | Dispatch task created/completed; populates `/work` queues | Wire `task_engine` into `/dispatch` endpoint | **High** |
| **Approval Framework Integration** | None | DispatchApproval record per decision | Add schema + record on dispatch | Low |
| **PDF Generation** | Placeholder | `/certificates/{n}/pdf` w/ template + QR/barcode/signature | reportlab/wkhtmltopdf + template | **High** |
| **Digital Signature** | Placeholder | PKCS#7 / X.509 signed PDF | PKI library, CA, key mgmt | **High** |
| **QR Code (real)** | Visual | Real encoding | `qrcode` library | Low |
| **Barcode (real)** | Visual | Code128/Code39 | `python-barcode` | Low |
| **Customer Package / Manifest** | None | Shipment entity, packing slip, label | New entity + UI | **High** |
| **Customer Release Approval** | None | Customer sign-off / portal | Email/portal + acceptance tracking | **High** |
| **Customer Portal** | None | Customer-facing COA download | Separate app/portal module | **High** |
| **Customer Master Entity** | String | Customer entity w/ requirements + contact | New schema + UI | Medium |
| **API-level Role Enforcement** | UI only | FastAPI permission deps | Decorators on endpoints | Medium |
| **Notification Routing** | App emit only | Email/SMS to QA mgr, customer, logistics | Channels + rules | Medium |
| **Shipment / Logistics Integration** | None | External API / async events | Third-party integration | **High** |
| **Report Export** | None | CSV/Excel/JSON | Export endpoints | Low |

---

## 11. Reuse Analysis

| Category | % | Notes |
|---|---|---|
| **Reuse as-is** | ~70% | Queue/workbench/panel pattern (matches Phase 1–4), schemas, audit + notification emits, genealogy/lineage frameworks already support CERTIFICATE |
| **Enhance** | ~20% | Dispatch approval (+ task & approval framework wiring), insights (richer observations), overview (real QR/barcode/signature) |
| **Replace** | ~5% | PDF stub → real generator + endpoint |
| **Remove** | ~5% | Visual placeholders for digital signature once real PKI lands |

No architectural refactor needed — Step 5 follows the same `<queue/> + <workbench>` shape as prior modules.

---

## 12. Final Recommendation

### **(B) Step 5 Needs Enhancement**

**Justification:** The module is not a rebuild candidate — queue, workbench, dispatch decisions, customer spec validation, release confidence, audit, notifications, and full upstream traceability are all functional. Architecture follows the established Phase 1–4 patterns and the genealogy/lineage frameworks already cover the CERTIFICATE node.

The remaining work is **integration + document generation**, not redesign:

| Phase | Work | Est. Effort |
|---|---|---|
| **5A (immediate)** | Wire `task_engine` into dispatch flow; integrate `approval` framework; real QR + barcode libraries | ~3 days |
| **5B (next sprint)** | PDF generator + endpoint + template; digital signature (PKCS#7) | ~1.5 weeks |
| **5C (post-MVP)** | Customer Master + Customer Release Approval + Shipment/Manifest + Customer Portal + logistics integration | ~4–8 weeks |

After 5A the module reaches ~85% demo-ready. After 5B it is customer-demo ready. 5C is production scope.

---

## Deliverable Structure Recap

1. **Executive Summary** — ~78% complete; needs enhancement, not rebuild.
2. **Architecture Review** — Follows established module pattern; clean separation; genealogy/lineage already wired. Weak spots: task_engine and approval framework not consumed; PDF/signature stubbed.
3. **Feature Coverage Matrix** — 13 Implemented, 4 Partial (PDF/QR/barcode/notifications), 5 Missing (Tasks, Approvals record, Customer Package, Customer Release Approval, Customer Portal).
4. **Gap Analysis** — Top priorities: Task Engine, Approval Framework, PDF, Customer Release, Shipment.
5. **Reuse Analysis** — 70% reuse / 20% enhance / 5% replace / 5% remove.
6. **Demo Readiness Score** — **7/10**.
7. **Production Readiness Score** — **3/10**.
8. **Recommendation** — **(B) Needs Enhancement**.
