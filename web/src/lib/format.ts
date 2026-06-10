import type {
  CastingReadiness,
  CertificateRecommendation,
  CertificateStatus,
  DispatchStatus,
  MetalBatchStatus,
  MetalRecommendation,
  ProcessRecommendation,
  ProductBatchStatus,
  ProductRecommendation,
  QualificationStatus,
  ReceiptStatus,
  ReleaseReadiness,
  ResultStatus,
  RiskLevel,
} from "./types";

export function statusToAccent(status: ReceiptStatus): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Approved": return "success";
    case "Rejected": return "danger";
    case "On Hold": return "warning";
    case "Pending Review": return "info";
    case "Pending Testing": return "info";
    case "Pending Sampling": return "muted";
    default: return "muted";
  }
}

export function riskToAccent(level: RiskLevel): "success" | "warning" | "danger" {
  if (level === "Low") return "success";
  if (level === "Medium") return "warning";
  return "danger";
}

export function resultStatusToAccent(status: ResultStatus): "success" | "warning" | "danger" | "muted" {
  if (status === "Pass") return "success";
  if (status === "Warning") return "warning";
  if (status === "Fail") return "danger";
  return "muted";
}

export function formatNumber(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, ...opts }).format(n);
}

export function qualificationStatusToAccent(
  status: QualificationStatus,
): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Released": return "success";
    case "Rejected": return "danger";
    case "On Hold": return "warning";
    case "Under Review": return "info";
    case "Pending Testing": return "info";
    case "Pending Sampling": return "muted";
    case "Cancelled": return "muted";
    default: return "muted";
  }
}

export function recommendationToAccent(
  action: ProcessRecommendation,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (action) {
    case "RELEASE": return "success";
    case "REVIEW": return "info";
    case "HOLD": return "warning";
    case "REJECT": return "danger";
    default: return "muted";
  }
}

export function metalBatchStatusToAccent(
  status: MetalBatchStatus,
): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Released": return "success";
    case "Rejected": return "danger";
    case "On Hold": return "warning";
    case "Downgraded": return "warning";
    case "Under Review": return "info";
    case "Pending Testing": return "info";
    case "Pending Sampling": return "muted";
    case "Cancelled": return "muted";
    default: return "muted";
  }
}

export function metalRecommendationToAccent(
  action: MetalRecommendation,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (action) {
    case "RELEASE FOR CASTING": return "success";
    case "CORRECT CHEMISTRY": return "info";
    case "HOLD METAL BATCH": return "warning";
    case "DOWNGRADE GRADE": return "warning";
    case "REJECT": return "danger";
    default: return "muted";
  }
}

export function castingReadinessToAccent(
  readiness: CastingReadiness,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (readiness) {
    case "READY": return "success";
    case "REVIEW": return "info";
    case "HOLD": return "warning";
    case "NOT READY": return "danger";
    default: return "muted";
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function productBatchStatusToAccent(
  status: ProductBatchStatus,
): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Approved": return "success";
    case "Rejected": return "danger";
    case "On Hold": return "warning";
    case "Retest": return "warning";
    case "Under Review": return "info";
    case "Pending Testing": return "info";
    case "Pending Sampling": return "muted";
    case "Cancelled": return "muted";
    default: return "muted";
  }
}

export function productRecommendationToAccent(
  action: ProductRecommendation,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (action) {
    case "APPROVE PRODUCT": return "success";
    case "HOLD PRODUCT": return "warning";
    case "REJECT PRODUCT": return "danger";
    case "RETEST PRODUCT": return "info";
    default: return "muted";
  }
}

export function releaseReadinessToAccent(
  readiness: ReleaseReadiness,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (readiness) {
    case "READY": return "success";
    case "REVIEW": return "info";
    case "HOLD": return "warning";
    case "NOT READY": return "danger";
    default: return "muted";
  }
}

export function certificateStatusToAccent(
  status: CertificateStatus,
): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Issued": return "success";
    case "Draft": return "info";
    case "Revised": return "warning";
    case "Cancelled": return "muted";
    default: return "muted";
  }
}

export function dispatchStatusToAccent(
  status: DispatchStatus,
): "info" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "Approved":
    case "Released":
      return "success";
    case "Ready":
      return "info";
    case "Held":
      return "warning";
    case "Overridden":
      return "warning";
    case "Rejected":
      return "danger";
    case "Pending":
      return "muted";
    default:
      return "muted";
  }
}

export function certificateRecommendationToAccent(
  action: CertificateRecommendation,
): "success" | "info" | "warning" | "danger" | "muted" {
  switch (action) {
    case "APPROVE DISPATCH": return "success";
    case "HOLD DISPATCH": return "warning";
    case "REJECT DISPATCH": return "danger";
    case "REQUEST REVIEW": return "info";
    default: return "muted";
  }
}
