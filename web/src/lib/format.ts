import type {
  ProcessRecommendation,
  QualificationStatus,
  ReceiptStatus,
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
