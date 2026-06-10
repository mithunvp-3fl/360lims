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
  ConsumptionArea,
  DashboardSummary,
  Instrument,
  Material,
  ProcessInsight,
  Qualification,
  QualificationApproval,
  QualificationDecision,
  QualificationResult,
  QualificationSample,
  QualificationStatus,
  QualificationTest,
  QualityInsight,
  Receipt,
  Result,
  RoleKey,
  RoleQueue,
  Sample,
  Supplier,
  Test,
  Workflow,
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
