"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";
import type {
  AppNotification,
  Approval,
  ApprovalDecision,
  AuditLog,
  AuthUser,
  Certificate,
  CertificateEvent,
  CertificateInsight,
  CertificateStatus,
  DispatchApprovalRecord,
  VerifyPayload,
  ConsumptionArea,
  DashboardSummary,
  DispatchDecision,
  DispatchStatus,
  GenealogyChain,
  GenealogyNodeType,
  Instrument,
  JourneyTimeline,
  Material,
  MetalApproval,
  MetalBatch,
  MetalBatchDecision,
  MetalBatchStatus,
  MetalInsight,
  MetalResult,
  MetalSample,
  MetalTest,
  ProcessInsight,
  ProductApproval,
  ProductBatch,
  ProductBatchStatus,
  ProductDecision,
  ProductGrade,
  ProductInsight,
  ProductResult,
  ProductSample,
  ProductTest,
  ProductType,
  Qualification,
  QualificationApproval,
  QualificationDecision,
  QualificationResult,
  QualificationSample,
  QualificationStatus,
  QualificationTest,
  QualityInsight,
  QualitySummary,
  Receipt,
  Result,
  RoleKey,
  RoleQueue,
  Sample,
  Supplier,
  Test,
  TraceabilityDashboard,
  TraceabilitySearchHit,
  Workflow,
  MaterialLineage,
  WorkTask,
  WorkSummary,
  WorkflowApprovalDecision,
  ApprovalsResponse,
  ChainQualitySummary,
  ChainRiskPanel,
  ImpactAnalysis,
  QualityEventsResponse,
  QualityScorecard,
  RelatedRecords,
} from "./types";

const qk = {
  dashboard: ["dashboard"] as const,
  suppliers: ["suppliers"] as const,
  materials: ["materials"] as const,
  instruments: ["instruments"] as const,
  receipts: (params?: Record<string, string | undefined>) => ["receipts", params] as const,
  receipt: (lot: string) => ["receipt", lot] as const,
  workflow: (lot: string) => ["workflow", lot] as const,
  samples: (lot: string) => ["samples", lot] as const,
  tests: (lot: string) => ["tests", lot] as const,
  results: (lot: string) => ["results", lot] as const,
  approvals: (lot: string) => ["approvals", lot] as const,
  insights: (lot: string) => ["insights", lot] as const,
  audit: (lot: string) => ["audit", lot] as const,
  notifications: ["notifications"] as const,
};

// --- Master data ---
export function useSuppliers() {
  return useQuery({ queryKey: qk.suppliers, queryFn: () => api.get<Supplier[]>("/suppliers") });
}
export function useMaterials() {
  return useQuery({ queryKey: qk.materials, queryFn: () => api.get<Material[]>("/materials") });
}
export function useInstruments() {
  return useQuery({ queryKey: qk.instruments, queryFn: () => api.get<Instrument[]>("/instruments") });
}

// --- Dashboard ---
export function useDashboardSummary() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<DashboardSummary>("/dashboard/summary") });
}

export function useRoleQueue(role: RoleKey | undefined) {
  return useQuery({
    queryKey: ["role-queue", role],
    queryFn: () => api.get<RoleQueue>(`/dashboard/role-queue?role=${role}`),
    enabled: Boolean(role),
  });
}

// --- Auth ---
export function usePersonas() {
  return useQuery({
    queryKey: ["auth", "personas"],
    queryFn: () => api.get<AuthUser[]>("/auth/personas"),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<{ user: AuthUser; token: string }>("/auth/login", body),
  });
}

// --- Receipts ---
export function useReceipts(params?: { status?: string; supplier_id?: string; search?: string }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.supplier_id) search.set("supplier_id", params.supplier_id);
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: qk.receipts(params),
    queryFn: () => api.get<Receipt[]>(`/receipts${qs ? `?${qs}` : ""}`),
  });
}

export function useReceipt(lot: string) {
  return useQuery({
    queryKey: qk.receipt(lot),
    queryFn: () => api.get<Receipt>(`/receipts/${lot}`),
    enabled: Boolean(lot),
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      supplierId: string;
      materialId: string;
      quantity: number;
      uom?: string;
      vehicleNumber: string;
      poNumber: string;
      notes?: string;
    }) => api.post<Receipt>("/receipts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useCancelReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lot: string) => api.post<Receipt>(`/receipts/${lot}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useCloneReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lot: string) => api.post<Receipt>(`/receipts/${lot}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useWorkflow(lot: string) {
  return useQuery({
    queryKey: qk.workflow(lot),
    queryFn: () => api.get<Workflow>(`/receipts/${lot}/workflow`),
    enabled: Boolean(lot),
  });
}

// --- Samples ---
export function useSamples(lot: string) {
  return useQuery({
    queryKey: qk.samples(lot),
    queryFn: () => api.get<Sample[]>(`/receipts/${lot}/samples`),
    enabled: Boolean(lot),
  });
}

export function useCreateSample(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Sample>(`/receipts/${lot}/samples`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.samples(lot) });
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.receipt(lot) });
      qc.invalidateQueries({ queryKey: qk.workflow(lot) });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

export function useRecollectSample(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Sample>(`/receipts/${lot}/samples/recollect`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.samples(lot) });
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.results(lot) });
    },
  });
}

// --- Tests + Results ---
export function useTests(lot: string) {
  return useQuery({
    queryKey: qk.tests(lot),
    queryFn: () => api.get<Test[]>(`/receipts/${lot}/tests`),
    enabled: Boolean(lot),
  });
}
export function useResults(lot: string) {
  return useQuery({
    queryKey: qk.results(lot),
    queryFn: () => api.get<Result[]>(`/receipts/${lot}/results`),
    enabled: Boolean(lot),
  });
}

export function useImportFromInstrument(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; instrumentCode: string }) =>
      api.post<Result>("/results/instrument-import", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.results(lot) });
      qc.invalidateQueries({ queryKey: qk.receipt(lot) });
      qc.invalidateQueries({ queryKey: qk.workflow(lot) });
      qc.invalidateQueries({ queryKey: qk.insights(lot) });
      qc.invalidateQueries({ queryKey: ["instruments"] });
    },
  });
}

export function useManualEntry(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      testId: string;
      reason: string;
      values: { parameter: string; value: number; unit: string }[];
    }) => api.post<Result>("/results/manual", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.results(lot) });
      qc.invalidateQueries({ queryKey: qk.receipt(lot) });
      qc.invalidateQueries({ queryKey: qk.workflow(lot) });
      qc.invalidateQueries({ queryKey: qk.insights(lot) });
    },
  });
}

export function useFileUpload(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; fileName: string }) =>
      api.post<Result>("/results/file-upload", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.results(lot) });
      qc.invalidateQueries({ queryKey: qk.receipt(lot) });
      qc.invalidateQueries({ queryKey: qk.workflow(lot) });
      qc.invalidateQueries({ queryKey: qk.insights(lot) });
    },
  });
}

export function useRetest(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resultId: string) => api.post<Test>(`/results/${resultId}/retest`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tests(lot) });
      qc.invalidateQueries({ queryKey: qk.results(lot) });
    },
  });
}

// --- Approvals ---
export function useApprovals(lot: string) {
  return useQuery({
    queryKey: qk.approvals(lot),
    queryFn: () => api.get<Approval[]>(`/receipts/${lot}/approvals`),
    enabled: Boolean(lot),
  });
}

export function useDecide(lot: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: ApprovalDecision; reason?: string }) =>
      api.post<Approval>(`/receipts/${lot}/approvals`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.approvals(lot) });
      qc.invalidateQueries({ queryKey: qk.receipt(lot) });
      qc.invalidateQueries({ queryKey: qk.workflow(lot) });
      qc.invalidateQueries({ queryKey: qk.insights(lot) });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// --- Insights + audit ---
export function useInsights(lot: string) {
  return useQuery({
    queryKey: qk.insights(lot),
    queryFn: () => api.get<QualityInsight>(`/receipts/${lot}/insights`),
    enabled: Boolean(lot),
  });
}

export function useAudit(lot: string) {
  return useQuery({
    queryKey: qk.audit(lot),
    queryFn: () => api.get<AuditLog[]>(`/receipts/${lot}/audit`),
    enabled: Boolean(lot),
  });
}

// --- Notifications ---
export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () => api.get<AppNotification[]>("/notifications?limit=30"),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ updated: number }>("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

// =====================================================================
// Phase 2 — Process Material Qualification
// =====================================================================
const qqk = {
  list: (params?: Record<string, string | undefined>) => ["qualifications", params] as const,
  detail: (n: string) => ["qualification", n] as const,
  workflow: (n: string) => ["qualification-workflow", n] as const,
  samples: (n: string) => ["qualification-samples", n] as const,
  tests: (n: string) => ["qualification-tests", n] as const,
  results: (n: string) => ["qualification-results", n] as const,
  approvals: (n: string) => ["qualification-approvals", n] as const,
  insights: (n: string) => ["qualification-insights", n] as const,
  audit: (n: string) => ["qualification-audit", n] as const,
};

function invalidateQualification(qc: ReturnType<typeof useQueryClient>, n: string) {
  qc.invalidateQueries({ queryKey: qqk.detail(n) });
  qc.invalidateQueries({ queryKey: qqk.workflow(n) });
  qc.invalidateQueries({ queryKey: qqk.samples(n) });
  qc.invalidateQueries({ queryKey: qqk.tests(n) });
  qc.invalidateQueries({ queryKey: qqk.results(n) });
  qc.invalidateQueries({ queryKey: qqk.approvals(n) });
  qc.invalidateQueries({ queryKey: qqk.insights(n) });
  qc.invalidateQueries({ queryKey: qqk.audit(n) });
  qc.invalidateQueries({ queryKey: ["qualifications"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useQualifications(params?: {
  status?: QualificationStatus;
  material_id?: string;
  consumption_area?: ConsumptionArea;
  search?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.material_id) search.set("material_id", params.material_id);
  if (params?.consumption_area) search.set("consumption_area", params.consumption_area);
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: qqk.list(params as Record<string, string | undefined>),
    queryFn: () => api.get<Qualification[]>(`/qualifications${qs ? `?${qs}` : ""}`),
  });
}

export function useQualification(n: string) {
  return useQuery({
    queryKey: qqk.detail(n),
    queryFn: () => api.get<Qualification>(`/qualifications/${n}`),
    enabled: Boolean(n),
  });
}

export function useCreateQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      materialId: string;
      batchNumber: string;
      consumptionArea: ConsumptionArea;
      quantity: number;
      uom?: string;
      supplierId?: string;
      sourceLotNumber?: string;
      notes?: string;
    }) => api.post<Qualification>("/qualifications", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualifications"] }),
  });
}

export function useCancelQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<Qualification>(`/qualifications/${n}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualifications"] }),
  });
}

export function useCloneQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<Qualification>(`/qualifications/${n}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualifications"] }),
  });
}

export function useQualificationWorkflow(n: string) {
  return useQuery({
    queryKey: qqk.workflow(n),
    queryFn: () => api.get<Workflow>(`/qualifications/${n}/workflow`),
    enabled: Boolean(n),
  });
}

export function useQualificationSamples(n: string) {
  return useQuery({
    queryKey: qqk.samples(n),
    queryFn: () => api.get<QualificationSample[]>(`/qualifications/${n}/samples`),
    enabled: Boolean(n),
  });
}

export function useCreateQualificationSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<QualificationSample>(`/qualifications/${n}/samples`, {}),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useRecollectQualificationSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<QualificationSample>(`/qualifications/${n}/samples/recollect`, {}),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useQualificationTests(n: string) {
  return useQuery({
    queryKey: qqk.tests(n),
    queryFn: () => api.get<QualificationTest[]>(`/qualifications/${n}/tests`),
    enabled: Boolean(n),
  });
}

export function useQualificationResults(n: string) {
  return useQuery({
    queryKey: qqk.results(n),
    queryFn: () => api.get<QualificationResult[]>(`/qualifications/${n}/results`),
    enabled: Boolean(n),
  });
}

export function useQualificationImportFromInstrument(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; instrumentCode: string }) =>
      api.post<QualificationResult>("/qualification-results/instrument-import", body),
    onSuccess: () => {
      invalidateQualification(qc, n);
      qc.invalidateQueries({ queryKey: ["instruments"] });
    },
  });
}

export function useQualificationManualEntry(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      testId: string;
      reason: string;
      values: { parameter: string; value: number; unit: string }[];
    }) => api.post<QualificationResult>("/qualification-results/manual", body),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useQualificationFileUpload(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; fileName: string }) =>
      api.post<QualificationResult>("/qualification-results/file-upload", body),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useQualificationRetest(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resultId: string) =>
      api.post<QualificationTest>(`/qualification-results/${resultId}/retest`),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useQualificationApprovals(n: string) {
  return useQuery({
    queryKey: qqk.approvals(n),
    queryFn: () => api.get<QualificationApproval[]>(`/qualifications/${n}/approvals`),
    enabled: Boolean(n),
  });
}

export function useDecideQualification(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: QualificationDecision; reason?: string }) =>
      api.post<QualificationApproval>(`/qualifications/${n}/approvals`, body),
    onSuccess: () => invalidateQualification(qc, n),
  });
}

export function useProcessInsights(n: string) {
  return useQuery({
    queryKey: qqk.insights(n),
    queryFn: () => api.get<ProcessInsight>(`/qualifications/${n}/insights`),
    enabled: Boolean(n),
  });
}

export function useQualificationAudit(n: string) {
  return useQuery({
    queryKey: qqk.audit(n),
    queryFn: () => api.get<AuditLog[]>(`/qualifications/${n}/audit`),
    enabled: Boolean(n),
  });
}

// =====================================================================
// Phase 3 — Metal Quality Control
// =====================================================================
const mqk = {
  list: (params?: Record<string, string | undefined>) => ["metal-batches", params] as const,
  detail: (n: string) => ["metal-batch", n] as const,
  workflow: (n: string) => ["metal-batch-workflow", n] as const,
  samples: (n: string) => ["metal-batch-samples", n] as const,
  tests: (n: string) => ["metal-batch-tests", n] as const,
  results: (n: string) => ["metal-batch-results", n] as const,
  approvals: (n: string) => ["metal-batch-approvals", n] as const,
  insights: (n: string) => ["metal-batch-insights", n] as const,
  audit: (n: string) => ["metal-batch-audit", n] as const,
};

function invalidateMetalBatch(qc: ReturnType<typeof useQueryClient>, n: string) {
  qc.invalidateQueries({ queryKey: mqk.detail(n) });
  qc.invalidateQueries({ queryKey: mqk.workflow(n) });
  qc.invalidateQueries({ queryKey: mqk.samples(n) });
  qc.invalidateQueries({ queryKey: mqk.tests(n) });
  qc.invalidateQueries({ queryKey: mqk.results(n) });
  qc.invalidateQueries({ queryKey: mqk.approvals(n) });
  qc.invalidateQueries({ queryKey: mqk.insights(n) });
  qc.invalidateQueries({ queryKey: mqk.audit(n) });
  qc.invalidateQueries({ queryKey: ["metal-batches"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useMetalBatches(params?: {
  status?: MetalBatchStatus;
  product_grade?: ProductGrade;
  potline?: string;
  risk?: string;
  search?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.product_grade) search.set("product_grade", params.product_grade);
  if (params?.potline) search.set("potline", params.potline);
  if (params?.risk) search.set("risk", params.risk);
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: mqk.list(params as Record<string, string | undefined>),
    queryFn: () => api.get<MetalBatch[]>(`/metal-batches${qs ? `?${qs}` : ""}`),
  });
}

export function useMetalBatch(n: string) {
  return useQuery({
    queryKey: mqk.detail(n),
    queryFn: () => api.get<MetalBatch>(`/metal-batches/${n}`),
    enabled: Boolean(n),
  });
}

export function useCreateMetalBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      productGrade: ProductGrade;
      potline: string;
      weight: number;
      shift?: string;
      operator?: string;
      notes?: string;
    }) => api.post<MetalBatch>("/metal-batches", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metal-batches"] }),
  });
}

export function useCancelMetalBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<MetalBatch>(`/metal-batches/${n}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metal-batches"] }),
  });
}

export function useCloneMetalBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<MetalBatch>(`/metal-batches/${n}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metal-batches"] }),
  });
}

export function useMetalBatchWorkflow(n: string) {
  return useQuery({
    queryKey: mqk.workflow(n),
    queryFn: () => api.get<Workflow>(`/metal-batches/${n}/workflow`),
    enabled: Boolean(n),
  });
}

export function useMetalSamples(n: string) {
  return useQuery({
    queryKey: mqk.samples(n),
    queryFn: () => api.get<MetalSample[]>(`/metal-batches/${n}/samples`),
    enabled: Boolean(n),
  });
}

export function useCreateMetalSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<MetalSample>(`/metal-batches/${n}/samples`, {}),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useRecollectMetalSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<MetalSample>(`/metal-batches/${n}/samples/recollect`, {}),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useMetalTests(n: string) {
  return useQuery({
    queryKey: mqk.tests(n),
    queryFn: () => api.get<MetalTest[]>(`/metal-batches/${n}/tests`),
    enabled: Boolean(n),
  });
}

export function useMetalResults(n: string) {
  return useQuery({
    queryKey: mqk.results(n),
    queryFn: () => api.get<MetalResult[]>(`/metal-batches/${n}/results`),
    enabled: Boolean(n),
  });
}

export function useMetalImportFromInstrument(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; instrumentCode: string }) =>
      api.post<MetalResult>("/metal-results/instrument-import", body),
    onSuccess: () => {
      invalidateMetalBatch(qc, n);
      qc.invalidateQueries({ queryKey: ["instruments"] });
    },
  });
}

export function useMetalManualEntry(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      testId: string;
      reason: string;
      values: { parameter: string; value: number; unit: string }[];
    }) => api.post<MetalResult>("/metal-results/manual", body),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useMetalFileUpload(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; fileName: string }) =>
      api.post<MetalResult>("/metal-results/file-upload", body),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useMetalRetest(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resultId: string) =>
      api.post<MetalTest>(`/metal-results/${resultId}/retest`),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useMetalApprovals(n: string) {
  return useQuery({
    queryKey: mqk.approvals(n),
    queryFn: () => api.get<MetalApproval[]>(`/metal-batches/${n}/approvals`),
    enabled: Boolean(n),
  });
}

export function useDecideMetalBatch(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      decision: MetalBatchDecision;
      reason?: string;
      targetGrade?: ProductGrade;
    }) => api.post<MetalApproval>(`/metal-batches/${n}/approvals`, body),
    onSuccess: () => invalidateMetalBatch(qc, n),
  });
}

export function useMetalInsights(n: string) {
  return useQuery({
    queryKey: mqk.insights(n),
    queryFn: () => api.get<MetalInsight>(`/metal-batches/${n}/insights`),
    enabled: Boolean(n),
  });
}

export function useMetalAudit(n: string) {
  return useQuery({
    queryKey: mqk.audit(n),
    queryFn: () => api.get<AuditLog[]>(`/metal-batches/${n}/audit`),
    enabled: Boolean(n),
  });
}

// =====================================================================
// Quality Genealogy & Traceability
// =====================================================================
export function useGenealogyChain(nodeType: GenealogyNodeType | undefined, nodeKey: string | undefined) {
  return useQuery({
    queryKey: ["traceability", "chain", nodeType, nodeKey],
    queryFn: () => api.get<GenealogyChain>(`/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}`),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useJourneyTimeline(nodeType: GenealogyNodeType | undefined, nodeKey: string | undefined) {
  return useQuery({
    queryKey: ["traceability", "journey", nodeType, nodeKey],
    queryFn: () => api.get<JourneyTimeline>(`/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/journey`),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useTraceabilitySearch(query: string) {
  return useQuery({
    queryKey: ["traceability", "search", query],
    queryFn: () => api.get<TraceabilitySearchHit[]>(`/traceability/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}

export function useTraceabilityDashboard() {
  return useQuery({
    queryKey: ["traceability", "dashboard"],
    queryFn: () => api.get<TraceabilityDashboard>("/traceability/dashboard"),
  });
}

export function useMaterialLineage(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "lineage", nodeType, nodeKey],
    queryFn: () =>
      api.get<MaterialLineage>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/lineage`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

// --- Traceability Center V2 ---
export function useScopedTraceabilitySearch(
  query: string,
  scope: GenealogyNodeType[] | undefined,
) {
  const params = new URLSearchParams();
  params.set("q", query);
  if (scope && scope.length > 0) params.set("scope", scope.join(","));
  return useQuery({
    queryKey: ["traceability", "search-scoped", query, scope],
    queryFn: () =>
      api.get<TraceabilitySearchHit[]>(`/traceability/search?${params.toString()}`),
    enabled: query.trim().length > 0,
  });
}

export function useChainEvents(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "events", nodeType, nodeKey],
    queryFn: () =>
      api.get<QualityEventsResponse>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/events`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useChainApprovals(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "approvals", nodeType, nodeKey],
    queryFn: () =>
      api.get<ApprovalsResponse>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/approvals`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useChainSummary(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "summary", nodeType, nodeKey],
    queryFn: () =>
      api.get<ChainQualitySummary>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/summary`,
      ),
    enabled: Boolean(nodeType && nodeKey),
    refetchInterval: 60_000,
  });
}

export function useChainScorecard(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "scorecard", nodeType, nodeKey],
    queryFn: () =>
      api.get<QualityScorecard>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/scorecard`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useChainImpact(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "impact", nodeType, nodeKey],
    queryFn: () =>
      api.get<ImpactAnalysis>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/impact`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

export function useChainRisk(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "risk", nodeType, nodeKey],
    queryFn: () =>
      api.get<ChainRiskPanel>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/risk`,
      ),
    enabled: Boolean(nodeType && nodeKey),
    refetchInterval: 60_000,
  });
}

export function useChainRelated(
  nodeType: GenealogyNodeType | undefined,
  nodeKey: string | undefined,
) {
  return useQuery({
    queryKey: ["traceability", "related", nodeType, nodeKey],
    queryFn: () =>
      api.get<RelatedRecords>(
        `/traceability/${nodeType}/${encodeURIComponent(nodeKey!)}/related`,
      ),
    enabled: Boolean(nodeType && nodeKey),
  });
}

// =====================================================================
// Platform — My Workspace (tasks, approvals, escalations)
// =====================================================================
const wqk = {
  summary: (role?: string) => ["work", "summary", role ?? "all"] as const,
  my: (role: string) => ["work", "my", role] as const,
  team: (role: string) => ["work", "team", role] as const,
  approvals: (role?: string) => ["work", "approvals", role ?? "all"] as const,
  escalations: (role?: string) => ["work", "escalations", role ?? "all"] as const,
  completed: (role?: string) => ["work", "completed", role ?? "all"] as const,
  blocked: (role?: string) => ["work", "blocked", role ?? "all"] as const,
  upcoming: (role?: string) => ["work", "upcoming", role ?? "all"] as const,
  byEntity: (entityType: string, entityId: string) =>
    ["work", "by-entity", entityType, entityId] as const,
  byRecord: (recordKey: string, moduleKey?: string) =>
    ["work", "by-record", recordKey, moduleKey ?? "any"] as const,
};

function qs(role?: string): string {
  return role ? `?role=${encodeURIComponent(role)}` : "";
}

export function useWorkSummary(role?: string) {
  return useQuery({
    queryKey: wqk.summary(role),
    queryFn: () => api.get<WorkSummary>(`/work/summary${qs(role)}`),
    refetchInterval: 30_000,
  });
}

export function useMyWork(role: string | undefined) {
  return useQuery({
    queryKey: wqk.my(role ?? ""),
    queryFn: () => api.get<WorkTask[]>(`/work/my?role=${encodeURIComponent(role!)}`),
    enabled: Boolean(role),
    refetchInterval: 30_000,
  });
}

export function useTeamWork(role: string | undefined) {
  return useQuery({
    queryKey: wqk.team(role ?? ""),
    queryFn: () => api.get<WorkTask[]>(`/work/team?role=${encodeURIComponent(role!)}`),
    enabled: Boolean(role),
  });
}

export function usePendingApprovals(role?: string) {
  return useQuery({
    queryKey: wqk.approvals(role),
    queryFn: () => api.get<WorkTask[]>(`/work/approvals${qs(role)}`),
  });
}

export function useEscalations(role?: string) {
  return useQuery({
    queryKey: wqk.escalations(role),
    queryFn: () => api.get<WorkTask[]>(`/work/escalations${qs(role)}`),
  });
}

export function useCompletedWork(role?: string) {
  return useQuery({
    queryKey: wqk.completed(role),
    queryFn: () => api.get<WorkTask[]>(`/work/completed${qs(role)}`),
  });
}

export function useBlockedWork(role?: string) {
  return useQuery({
    queryKey: wqk.blocked(role),
    queryFn: () => api.get<WorkTask[]>(`/work/blocked${qs(role)}`),
  });
}

export function useUpcomingWork(role?: string) {
  return useQuery({
    queryKey: wqk.upcoming(role),
    queryFn: () => api.get<WorkTask[]>(`/work/upcoming${qs(role)}`),
  });
}

/**
 * Tasks attached to a specific business entity (any module).
 * Powers the reusable RelatedTasksPanel on every workbench.
 */
export function useTasksForEntity(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: wqk.byEntity(entityType ?? "", entityId ?? ""),
    queryFn: () =>
      api.get<WorkTask[]>(
        `/work/tasks?entityType=${encodeURIComponent(entityType!)}&entityId=${encodeURIComponent(entityId!)}`,
      ),
    enabled: Boolean(entityType && entityId),
    refetchInterval: 30_000,
  });
}

/**
 * Tasks that share a record key (e.g. a batch number) — picks up child entity
 * tasks (per-test) as well as the parent batch tasks.
 */
export function useTasksForRecord(
  recordKey: string | undefined,
  moduleKey?: string,
) {
  return useQuery({
    queryKey: wqk.byRecord(recordKey ?? "", moduleKey),
    queryFn: () => {
      const params = new URLSearchParams();
      if (recordKey) params.set("recordKey", recordKey);
      if (moduleKey) params.set("moduleKey", moduleKey);
      return api.get<WorkTask[]>(`/work/tasks?${params.toString()}`);
    },
    enabled: Boolean(recordKey),
    refetchInterval: 30_000,
  });
}

function invalidateWork(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["work"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post<WorkTask>(`/work/tasks/${taskId}/start`, {}),
    onSuccess: (t) => {
      toast.message("Task started", { description: t.title });
      invalidateWork(qc);
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post<WorkTask>(`/work/tasks/${taskId}/complete`, {}),
    onSuccess: (t) => {
      toast.success("Task completed", { description: t.title });
      invalidateWork(qc);
    },
  });
}

export function useEscalateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      api.post<WorkTask>(
        `/work/tasks/${taskId}/escalate${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
        {},
      ),
    onSuccess: (t) => {
      toast.warning("Task escalated", { description: t.title });
      invalidateWork(qc);
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      decision,
      reason,
    }: {
      taskId: string;
      decision: WorkflowApprovalDecision;
      reason?: string;
    }) => api.post<WorkTask>(`/work/tasks/${taskId}/decide`, { decision, reason }),
    onSuccess: (t) => {
      const verb = t.decision ?? "Decision";
      toast.success(`${verb} recorded`, { description: t.title });
      invalidateWork(qc);
    },
  });
}

// =====================================================================
// Phase 4 — Product Quality Testing
// =====================================================================
const pqk = {
  list: (params?: Record<string, string | undefined>) => ["product-batches", params] as const,
  detail: (n: string) => ["product-batch", n] as const,
  workflow: (n: string) => ["product-batch-workflow", n] as const,
  samples: (n: string) => ["product-batch-samples", n] as const,
  tests: (n: string) => ["product-batch-tests", n] as const,
  results: (n: string) => ["product-batch-results", n] as const,
  approvals: (n: string) => ["product-batch-approvals", n] as const,
  insights: (n: string) => ["product-batch-insights", n] as const,
  audit: (n: string) => ["product-batch-audit", n] as const,
};

export function invalidateProductBatch(qc: ReturnType<typeof useQueryClient>, n: string) {
  qc.invalidateQueries({ queryKey: pqk.detail(n) });
  qc.invalidateQueries({ queryKey: pqk.workflow(n) });
  qc.invalidateQueries({ queryKey: pqk.samples(n) });
  qc.invalidateQueries({ queryKey: pqk.tests(n) });
  qc.invalidateQueries({ queryKey: pqk.results(n) });
  qc.invalidateQueries({ queryKey: pqk.approvals(n) });
  qc.invalidateQueries({ queryKey: pqk.insights(n) });
  qc.invalidateQueries({ queryKey: pqk.audit(n) });
  qc.invalidateQueries({ queryKey: ["product-batches"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useProductBatches(params?: {
  status?: ProductBatchStatus;
  productType?: ProductType;
  risk?: string;
  search?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.productType) search.set("product_type", params.productType);
  if (params?.risk) search.set("risk", params.risk);
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: pqk.list(params as Record<string, string | undefined>),
    queryFn: () => api.get<ProductBatch[]>(`/product-batches${qs ? `?${qs}` : ""}`),
  });
}

export function useProductBatch(n: string) {
  return useQuery({
    queryKey: pqk.detail(n),
    queryFn: () => api.get<ProductBatch>(`/product-batches/${n}`),
    enabled: Boolean(n),
  });
}

export function useCreateProductBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      productType: ProductType;
      weight: number;
      sourceMetalBatchNumber?: string;
      customer?: string;
      operator?: string;
      notes?: string;
    }) => api.post<ProductBatch>("/product-batches", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-batches"] }),
  });
}

export function useCancelProductBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<ProductBatch>(`/product-batches/${n}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-batches"] }),
  });
}

export function useCloneProductBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: string) => api.post<ProductBatch>(`/product-batches/${n}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-batches"] }),
  });
}

export function useProductBatchWorkflow(n: string) {
  return useQuery({
    queryKey: pqk.workflow(n),
    queryFn: () => api.get<Workflow>(`/product-batches/${n}/workflow`),
    enabled: Boolean(n),
  });
}

export function useProductSamples(n: string) {
  return useQuery({
    queryKey: pqk.samples(n),
    queryFn: () => api.get<ProductSample[]>(`/product-batches/${n}/samples`),
    enabled: Boolean(n),
  });
}

export function useCreateProductSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ProductSample>(`/product-batches/${n}/samples`, {}),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useRecollectProductSample(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ProductSample>(`/product-batches/${n}/samples/recollect`, {}),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useProductTests(n: string) {
  return useQuery({
    queryKey: pqk.tests(n),
    queryFn: () => api.get<ProductTest[]>(`/product-batches/${n}/tests`),
    enabled: Boolean(n),
  });
}

export function useProductResults(n: string) {
  return useQuery({
    queryKey: pqk.results(n),
    queryFn: () => api.get<ProductResult[]>(`/product-batches/${n}/results`),
    enabled: Boolean(n),
  });
}

export function useProductImportFromInstrument(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; instrumentCode: string }) =>
      api.post<ProductResult>("/product-results/instrument-import", body),
    onSuccess: () => {
      invalidateProductBatch(qc, n);
      qc.invalidateQueries({ queryKey: ["instruments"] });
    },
  });
}

export function useProductManualEntry(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      testId: string;
      reason: string;
      values: { parameter: string; value: number; unit: string }[];
    }) => api.post<ProductResult>("/product-results/manual", body),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useProductFileUpload(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { testId: string; fileName: string }) =>
      api.post<ProductResult>("/product-results/file-upload", body),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useProductRetest(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resultId: string) =>
      api.post<ProductTest>(`/product-results/${resultId}/retest`),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useProductApprovals(n: string) {
  return useQuery({
    queryKey: pqk.approvals(n),
    queryFn: () => api.get<ProductApproval[]>(`/product-batches/${n}/approvals`),
    enabled: Boolean(n),
  });
}

export function useDecideProductBatch(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: ProductDecision; reason?: string }) =>
      api.post<ProductApproval>(`/product-batches/${n}/approvals`, body),
    onSuccess: () => invalidateProductBatch(qc, n),
  });
}

export function useProductInsights(n: string) {
  return useQuery({
    queryKey: pqk.insights(n),
    queryFn: () => api.get<ProductInsight>(`/product-batches/${n}/insights`),
    enabled: Boolean(n),
  });
}

export function useProductAudit(n: string) {
  return useQuery({
    queryKey: pqk.audit(n),
    queryFn: () => api.get<AuditLog[]>(`/product-batches/${n}/audit`),
    enabled: Boolean(n),
  });
}

// =====================================================================
// Phase 5 — Certificate & Dispatch
// =====================================================================
const cqk = {
  list: (params?: Record<string, string | undefined>) => ["certificates", params] as const,
  detail: (n: string) => ["certificate", n] as const,
  insights: (n: string) => ["certificate-insights", n] as const,
  quality: (n: string) => ["certificate-quality-summary", n] as const,
  audit: (n: string) => ["certificate-audit", n] as const,
};

export function invalidateCertificate(qc: ReturnType<typeof useQueryClient>, n: string) {
  qc.invalidateQueries({ queryKey: cqk.detail(n) });
  qc.invalidateQueries({ queryKey: cqk.insights(n) });
  qc.invalidateQueries({ queryKey: cqk.quality(n) });
  qc.invalidateQueries({ queryKey: cqk.audit(n) });
  qc.invalidateQueries({ queryKey: ["certificates"] });
  qc.invalidateQueries({ queryKey: qk.notifications });
}

export function useCertificates(params?: {
  status?: CertificateStatus;
  dispatchStatus?: DispatchStatus;
  customer?: string;
  search?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.dispatchStatus) search.set("dispatch_status", params.dispatchStatus);
  if (params?.customer) search.set("customer", params.customer);
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: cqk.list(params as Record<string, string | undefined>),
    queryFn: () => api.get<Certificate[]>(`/certificates${qs ? `?${qs}` : ""}`),
  });
}

export function useCertificate(n: string) {
  return useQuery({
    queryKey: cqk.detail(n),
    queryFn: () => api.get<Certificate>(`/certificates/${n}`),
    enabled: Boolean(n),
  });
}

export function useCreateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      productBatchNumber: string;
      customer: string;
      customerRequirements?: { parameter: string; min?: number; max?: number; target?: number }[];
    }) => api.post<Certificate>("/certificates", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates"] }),
  });
}

export function useIssueCertificate(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Certificate>(`/certificates/${n}/issue`),
    onSuccess: () => invalidateCertificate(qc, n),
  });
}

export function useCancelCertificate(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Certificate>(`/certificates/${n}/cancel`),
    onSuccess: () => invalidateCertificate(qc, n),
  });
}

export function useDispatchCertificate(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: DispatchDecision; reason?: string }) =>
      api.post<Certificate>(`/certificates/${n}/dispatch`, body),
    onSuccess: () => invalidateCertificate(qc, n),
  });
}

export function useCertificateInsights(n: string) {
  return useQuery({
    queryKey: cqk.insights(n),
    queryFn: () => api.get<CertificateInsight>(`/certificates/${n}/insights`),
    enabled: Boolean(n),
  });
}

export function useCertificateQualitySummary(n: string) {
  return useQuery({
    queryKey: cqk.quality(n),
    queryFn: () => api.get<QualitySummary>(`/certificates/${n}/quality-summary`),
    enabled: Boolean(n),
  });
}

export function useCertificateAudit(n: string) {
  return useQuery({
    queryKey: cqk.audit(n),
    queryFn: () => api.get<AuditLog[]>(`/certificates/${n}/audit`),
    enabled: Boolean(n),
  });
}

// --- Phase 5 enterprise hardening ---
export function useCertificateVersions(n: string) {
  return useQuery({
    queryKey: ["certificate-versions", n],
    queryFn: () => api.get<Certificate[]>(`/certificates/${n}/versions`),
    enabled: Boolean(n),
  });
}

export function useReviseCertificate(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      revisionReason: string;
      customerRequirements?: { parameter: string; min?: number; max?: number; target?: number }[];
      notes?: string;
    }) => api.post<Certificate>(`/certificates/${n}/revise`, body),
    onSuccess: (next) => {
      invalidateCertificate(qc, n);
      qc.invalidateQueries({ queryKey: ["certificate-versions"] });
      qc.invalidateQueries({ queryKey: ["certificate", next.certificateNumber] });
    },
  });
}

export function useCertificateDispatchApprovals(n: string) {
  return useQuery({
    queryKey: ["certificate-dispatch-approvals", n],
    queryFn: () => api.get<DispatchApprovalRecord[]>(`/certificates/${n}/dispatch-approvals`),
    enabled: Boolean(n),
  });
}

export function useCertificateEvents(n: string) {
  return useQuery({
    queryKey: ["certificate-events", n],
    queryFn: () => api.get<CertificateEvent[]>(`/certificates/${n}/events`),
    enabled: Boolean(n),
    refetchInterval: 30_000,
  });
}

export function useCertificatePreview(n: string, enabled = true) {
  return useQuery({
    queryKey: ["certificate-preview", n],
    queryFn: () => api.get<unknown>(`/certificates/${n}/preview`),
    enabled: enabled && Boolean(n),
  });
}

export function useVerifyCertificate(n: string) {
  return useQuery({
    queryKey: ["verify-certificate", n],
    queryFn: () => api.get<VerifyPayload>(`/verify/certificates/${n}`),
    enabled: Boolean(n),
  });
}

export function certificateAssetUrls(certificateNumber: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const encoded = encodeURIComponent(certificateNumber);
  return {
    qr: `${base}/api/v1/certificates/${encoded}/qr.svg`,
    barcode: `${base}/api/v1/certificates/${encoded}/barcode.svg`,
    pdf: `${base}/api/v1/certificates/${encoded}/pdf`,
  };
}
