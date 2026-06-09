export type RiskLevel = "Low" | "Medium" | "High";

export type ReceiptStatus =
  | "Pending Sampling"
  | "Pending Testing"
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "On Hold";

export type RoleKey =
  | "stores-executive"
  | "sampler"
  | "lab-analyst"
  | "qa-engineer"
  | "qa-manager"
  | "viewer";

export interface Role {
  key: RoleKey;
  label: string;
  description: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  healthScore: number;
  riskLevel: RiskLevel;
  acceptedDeliveries: number;
  rejectedDeliveries: number;
  onHoldDeliveries: number;
  lastDeliveryDate?: string;
  location?: string;
  category?: string;
}

export interface Specification {
  parameter: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  uom: string;
  specifications: Specification[];
  requiredTests: string[];
}

export interface Receipt {
  id: string;
  lotNumber: string;
  supplierId: string;
  materialId: string;
  quantity: number;
  uom: string;
  vehicleNumber: string;
  poNumber: string;
  receiptDate: string;
  status: ReceiptStatus;
  riskLevel: RiskLevel;
  assignedTo?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export type SampleStatus = "Collected" | "Recollected" | "Discarded";

export interface Sample {
  id: string;
  sampleId: string;
  receiptId: string;
  collectionDate: string;
  collectedBy: string;
  status: SampleStatus;
  notes?: string;
}

export type TestStatus = "Pending" | "In Progress" | "Completed" | "Failed";

export interface Test {
  id: string;
  sampleId: string;
  code: string;
  name: string;
  parameters: string[];
  instrumentCode?: string;
  status: TestStatus;
  assignedAt?: string;
}

export type ResultSource = "Instrument" | "Manual" | "File Upload";
export type ResultStatus = "Pass" | "Fail" | "Warning" | "Pending";

export interface ResultValue {
  parameter: string;
  value: number;
  unit: string;
  specMin?: number;
  specMax?: number;
  status: ResultStatus;
}

export interface Result {
  id: string;
  testId: string;
  sampleId: string;
  source: ResultSource;
  values: ResultValue[];
  enteredBy: string;
  enteredAt: string;
  instrumentCode?: string;
  reason?: string;
  fileName?: string;
  overallStatus: ResultStatus;
}

export type ApprovalDecision = "Approved" | "Hold" | "Rejected";

export interface Approval {
  id: string;
  receiptId: string;
  decision: ApprovalDecision;
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

export type StageStatus = "Pending" | "In Progress" | "Completed" | "Skipped";

export interface WorkflowStage {
  key: string;
  label: string;
  order: number;
  status: StageStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface Workflow {
  id: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  stages: WorkflowStage[];
}

export type InstrumentStatus = "Online" | "Offline" | "Degraded" | "Maintenance";

export interface Instrument {
  id: string;
  code: string;
  name: string;
  type: "XRF" | "OES" | "Carbon-Sulphur" | "Moisture" | "Other";
  vendor: string;
  model: string;
  serialNumber: string;
  status: InstrumentStatus;
  location?: string;
  lastImportAt?: string;
  lastHeartbeatAt?: string;
  importsThisWeek: number;
  supportedParameters: string[];
}

export type NotificationSeverity = "info" | "success" | "warning" | "danger";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  read: boolean;
  meta?: Record<string, unknown> | null;
}

export interface AuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  timestamp: string;
  notes?: string;
}

export type RecommendedAction = "APPROVE" | "HOLD" | "REJECT" | "AWAITING DATA";

export interface HistoricalDelivery {
  lotNumber: string;
  receiptDate: string;
  outcome: string;
  riskLevel: RiskLevel;
}

export interface ParameterTrend {
  parameter: string;
  unit: string;
  current: number | null;
  previousAverage: number | null;
  delta: number | null;
  deltaPct: number | null;
  samples: number;
}

export interface QualityInsight {
  receiptId: string;
  recommendedAction: RecommendedAction;
  rationale: string;
  riskLevel: RiskLevel;
  supplierHealth: number;
  supplierHealthTrend: number[];
  testsCompleted: number;
  testsTotal: number;
  observations: string[];
  historicalDeliveries: HistoricalDelivery[];
  parameterTrends: ParameterTrend[];
  complianceScore: number;
}

export interface DashboardKPI {
  label: string;
  value: number;
  unit?: string;
  deltaPct?: number;
  accent: "info" | "success" | "warning" | "danger";
}

export interface DashboardSummary {
  kpis: DashboardKPI[];
  statusBreakdown: { status: string; count: number }[];
  supplierMix: { supplierName: string; approved: number; rejected: number; onHold: number }[];
  weeklyVolume: number[];
  riskHotspots: { lotNumber: string; supplier: string; material: string; status: string; risk: string }[];
}
