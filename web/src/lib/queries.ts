"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";
import type {
  AppNotification,
  Approval,
  ApprovalDecision,
  AuditLog,
  DashboardSummary,
  Instrument,
  Material,
  QualityInsight,
  Receipt,
  Result,
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
