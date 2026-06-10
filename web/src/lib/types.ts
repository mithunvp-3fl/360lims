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

export interface AuthUser {
  name: string;
  email: string;
  role: RoleKey;
  title: string;
}

export interface RoleQueueItem {
  lotNumber: string;
  supplier: string;
  material: string;
  status: ReceiptStatus;
  riskLevel: RiskLevel;
  receiptDate: string;
  callout: string;
}

export interface RoleQueue {
  role: RoleKey;
  headline: string;
  description: string;
  items: RoleQueueItem[];
}

// =====================================================================
// Phase 2 — Process Material Qualification
// =====================================================================
export type ConsumptionArea = "Carbon Plant" | "Potline" | "Casthouse" | "R&D";

export type QualificationStatus =
  | "Pending Sampling"
  | "Pending Testing"
  | "Under Review"
  | "Released"
  | "Rejected"
  | "On Hold"
  | "Cancelled";

export type QualificationDecision = "Release" | "Hold" | "Reject";

export interface Qualification {
  id: string;
  qualificationNumber: string;
  materialId: string;
  batchNumber: string;
  supplierId?: string | null;
  sourceLotNumber?: string | null;
  consumptionArea: ConsumptionArea;
  quantity: number;
  uom: string;
  status: QualificationStatus;
  riskLevel: RiskLevel;
  assignedTo?: string | null;
  requestedAt: string;
  requestedBy: string;
  notes?: string | null;
}

export interface QualificationSample {
  id: string;
  sampleId: string;
  qualificationId: string;
  collectionDate: string;
  collectedBy: string;
  status: SampleStatus;
  notes?: string | null;
}

export interface QualificationTest {
  id: string;
  sampleId: string;
  code: string;
  name: string;
  parameters: string[];
  instrumentCode?: string | null;
  status: TestStatus;
  assignedAt?: string | null;
}

export interface QualificationResult {
  id: string;
  testId: string;
  sampleId: string;
  source: ResultSource;
  values: ResultValue[];
  enteredBy: string;
  enteredAt: string;
  instrumentCode?: string | null;
  reason?: string | null;
  fileName?: string | null;
  overallStatus: ResultStatus;
}

export interface QualificationApproval {
  id: string;
  qualificationId: string;
  decision: QualificationDecision;
  reason?: string | null;
  decidedBy: string;
  decidedAt: string;
}

export type ProcessRecommendation =
  | "RELEASE"
  | "REVIEW"
  | "HOLD"
  | "REJECT"
  | "AWAITING DATA";

export interface HistoricalBatch {
  qualificationNumber: string;
  batchNumber: string;
  requestedAt: string;
  outcome: string;
  readinessScore: number;
  riskLevel: RiskLevel;
}

export interface ProcessInsight {
  qualificationId: string;
  recommendedAction: ProcessRecommendation;
  recommendedTarget: string;
  rationale: string;
  riskLevel: RiskLevel;
  processReadiness: number;
  processReadinessTrend: number[];
  testsCompleted: number;
  testsTotal: number;
  observations: string[];
  historicalBatches: HistoricalBatch[];
  parameterTrends: ParameterTrend[];
  complianceScore: number;
  deviationCount: number;
}

// =====================================================================
// Phase 3 — Metal Quality Control
// =====================================================================
export type ProductGrade = "P1020" | "P0610" | "Primary Aluminum";

export type MetalBatchStatus =
  | "Pending Sampling"
  | "Pending Testing"
  | "Under Review"
  | "Released"
  | "Rejected"
  | "On Hold"
  | "Downgraded"
  | "Cancelled";

export type MetalBatchDecision = "Release" | "Hold" | "Reject" | "Downgrade";

export interface MetalBatch {
  id: string;
  metalBatchNumber: string;
  productGrade: ProductGrade;
  potline: string;
  shift?: string | null;
  productionDate: string;
  weight: number;
  uom: string;
  operator?: string | null;
  status: MetalBatchStatus;
  riskLevel: RiskLevel;
  assignedTo?: string | null;
  sourceQualificationNumber?: string | null;
  createdAt: string;
  createdBy: string;
  notes?: string | null;
}

export interface MetalSample {
  id: string;
  sampleId: string;
  metalBatchId: string;
  collectionDate: string;
  collectedBy: string;
  status: SampleStatus;
  notes?: string | null;
}

export interface MetalTest {
  id: string;
  sampleId: string;
  code: string;
  name: string;
  parameters: string[];
  instrumentCode?: string | null;
  status: TestStatus;
  assignedAt?: string | null;
}

export interface MetalResult {
  id: string;
  testId: string;
  sampleId: string;
  source: ResultSource;
  values: ResultValue[];
  enteredBy: string;
  enteredAt: string;
  instrumentCode?: string | null;
  reason?: string | null;
  fileName?: string | null;
  overallStatus: ResultStatus;
}

export interface MetalApproval {
  id: string;
  metalBatchId: string;
  decision: MetalBatchDecision;
  reason?: string | null;
  targetGrade?: ProductGrade | null;
  decidedBy: string;
  decidedAt: string;
}

export type MetalRecommendation =
  | "RELEASE FOR CASTING"
  | "CORRECT CHEMISTRY"
  | "HOLD METAL BATCH"
  | "DOWNGRADE GRADE"
  | "REJECT"
  | "AWAITING DATA";

export type CastingReadiness = "READY" | "REVIEW" | "HOLD" | "NOT READY";

export interface HistoricalMetalBatch {
  metalBatchNumber: string;
  productGrade: ProductGrade;
  potline: string;
  createdAt: string;
  outcome: string;
  complianceScore: number;
  riskLevel: RiskLevel;
}

export interface ChemistryCorrection {
  parameter: string;
  currentValue: number;
  targetValue: number;
  delta: number;
  additionMaterial: string;
  additionKg: number;
  expectedAfter: number;
  rationale: string;
  unit: string;
}

export interface MetalInsight {
  metalBatchId: string;
  recommendedAction: MetalRecommendation;
  rationale: string;
  riskLevel: RiskLevel;
  metalCompliance: number;
  metalComplianceTrend: number[];
  castingReadiness: CastingReadiness;
  testsCompleted: number;
  testsTotal: number;
  observations: string[];
  historicalBatches: HistoricalMetalBatch[];
  parameterTrends: ParameterTrend[];
  chemistryCorrections: ChemistryCorrection[];
  deviationCount: number;
}

// =====================================================================
// Quality Genealogy & Traceability
// =====================================================================
export type GenealogyNodeType =
  | "raw-material"
  | "process-qualification"
  | "metal-batch"
  | "product-batch"
  | "certificate";

export type JourneyStepKey =
  | "step-1"
  | "step-2"
  | "step-3"
  | "step-4"
  | "step-5";

export type JourneyStepStatus =
  | "Complete"
  | "In Progress"
  | "Pending"
  | "Blocked"
  | "Skipped";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "neutral";

export interface GenealogyNode {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  entityId: string;
  title: string;
  subtitle?: string | null;
  status: string;
  statusTone: StatusTone;
  timestamp?: string | null;
  href?: string | null;
  badges: string[];
}

export interface GenealogyLink {
  fromKey: string;
  toKey: string;
  relation: string;
  direction: string;
}

export interface GenealogyChain {
  currentKey: string;
  nodes: GenealogyNode[];
  links: GenealogyLink[];
  coverage: number;
}

export interface JourneyStep {
  key: JourneyStepKey;
  order: number;
  label: string;
  status: JourneyStepStatus;
  nodeKey?: string | null;
  nodeType?: GenealogyNodeType | null;
  timestamp?: string | null;
  href?: string | null;
}

export interface JourneyEvent {
  timestamp: string;
  actor: string;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  nodeKey?: string | null;
  nodeType?: GenealogyNodeType | null;
  notes?: string | null;
}

export interface JourneyTimeline {
  currentKey: string;
  steps: JourneyStep[];
  events: JourneyEvent[];
}

export interface TraceabilitySearchHit {
  nodeType: GenealogyNodeType;
  nodeKey: string;
  title: string;
  subtitle?: string | null;
  status: string;
  href?: string | null;
}

export interface TraceabilityDashboard {
  activeLots: number;
  inTesting: number;
  awaitingApproval: number;
  released: number;
  certificatesGenerated: number;
  coveragePct: number;
}

// =====================================================================
// Phase 4 — Product Quality Testing
// =====================================================================
export type ProductType = "Primary Aluminum Ingot" | "Primary Aluminum Billet";

export type ProductBatchStatus =
  | "Pending Sampling"
  | "Pending Testing"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "On Hold"
  | "Retest"
  | "Cancelled";

export type ProductDecision = "Approve" | "Hold" | "Reject" | "Retest";

export interface ProductBatch {
  id: string;
  productBatchNumber: string;
  productType: ProductType;
  weight: number;
  uom: string;
  sourceMetalBatchNumber?: string | null;
  customer?: string | null;
  status: ProductBatchStatus;
  riskLevel: RiskLevel;
  operator?: string | null;
  productionDate: string;
  assignedTo?: string | null;
  createdAt: string;
  createdBy: string;
  notes?: string | null;
}

export interface ProductSample {
  id: string;
  sampleId: string;
  productBatchId: string;
  collectionDate: string;
  collectedBy: string;
  status: SampleStatus;
  notes?: string | null;
}

export interface ProductTest {
  id: string;
  sampleId: string;
  code: string;
  name: string;
  parameters: string[];
  instrumentCode?: string | null;
  status: TestStatus;
  assignedAt?: string | null;
  category?: string | null;
}

export interface ProductResult {
  id: string;
  testId: string;
  sampleId: string;
  source: ResultSource;
  values: ResultValue[];
  enteredBy: string;
  enteredAt: string;
  instrumentCode?: string | null;
  reason?: string | null;
  fileName?: string | null;
  overallStatus: ResultStatus;
}

export interface ProductApproval {
  id: string;
  productBatchId: string;
  decision: ProductDecision;
  reason?: string | null;
  decidedBy: string;
  decidedAt: string;
}

export type ProductRecommendation =
  | "APPROVE PRODUCT"
  | "HOLD PRODUCT"
  | "REJECT PRODUCT"
  | "RETEST PRODUCT"
  | "AWAITING DATA";

export type ReleaseReadiness = "READY" | "REVIEW" | "HOLD" | "NOT READY";

export interface HistoricalProductBatch {
  productBatchNumber: string;
  productType: ProductType;
  createdAt: string;
  outcome: string;
  complianceScore: number;
  riskLevel: RiskLevel;
}

export interface ProductInsight {
  productBatchId: string;
  recommendedAction: ProductRecommendation;
  rationale: string;
  riskLevel: RiskLevel;
  productCompliance: number;
  productComplianceTrend: number[];
  releaseReadiness: ReleaseReadiness;
  testsCompleted: number;
  testsTotal: number;
  observations: string[];
  historicalBatches: HistoricalProductBatch[];
  parameterTrends: ParameterTrend[];
  deviationCount: number;
}

// =====================================================================
// Phase 5 — Certificate & Dispatch
// =====================================================================
export type CertificateStatus = "Draft" | "Issued" | "Revised" | "Cancelled";

export type DispatchStatus =
  | "Pending"
  | "Ready"
  | "Approved"
  | "Held"
  | "Rejected"
  | "Released"
  | "Overridden";

export type DispatchDecision =
  | "Approve"
  | "Hold"
  | "Reject"
  | "Override"
  | "Release";

export interface CustomerSpec {
  parameter: string;
  unit: string;
  requiredMin?: number | null;
  requiredMax?: number | null;
  requiredTarget?: number | null;
  actualValue?: number | null;
  complianceStatus: ResultStatus;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  productBatchNumber: string;
  productBatchId: string;
  customer: string;
  customerSpecs: CustomerSpec[];
  status: CertificateStatus;
  dispatchStatus: DispatchStatus;
  issuedAt?: string | null;
  issuedBy?: string | null;
  createdAt: string;
  createdBy: string;
  qrCodeValue: string;
  barcodeValue: string;
  digitalSignaturePlaceholder: string;
  notes?: string | null;
}

export type CertificateRecommendation =
  | "APPROVE DISPATCH"
  | "HOLD DISPATCH"
  | "REJECT DISPATCH"
  | "REQUEST REVIEW"
  | "AWAITING DATA";

export interface CertificateInsight {
  certificateId: string;
  releaseConfidence: number;
  releaseConfidenceTrend: number[];
  recommendedAction: CertificateRecommendation;
  rationale: string;
  riskLevel: RiskLevel;
  customerComplianceCount: number;
  customerComplianceTotal: number;
  observations: string[];
}

export interface QualityStepSummary {
  label: string;
  nodeKey?: string | null;
  nodeType?: GenealogyNodeType | null;
  status?: string | null;
  compliance?: number | null;
  href?: string | null;
}

export interface QualitySummary {
  certificateNumber: string;
  productBatchNumber: string;
  metalBatchNumber?: string | null;
  qualificationNumber?: string | null;
  rawMaterialLotNumber?: string | null;
  steps: QualityStepSummary[];
}
