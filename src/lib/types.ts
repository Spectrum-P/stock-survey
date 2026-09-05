export type SurveyStatus = "draft" | "in_progress" | "completed" | "archived";
export type ElementStatus = "not_started" | "partial" | "completed" | "not_applicable" | "inaccessible";
export type ConditionRating = "A" | "B" | "C" | "D";
export type PriorityRating = "1" | "2" | "3" | "4";
export type PlanningHorizon = "1-10 years" | "11-20 years" | "21-30 years" | "Beyond 30 years" | "Overdue";

export interface PropertyInput {
  name: string;
  buildingName?: string;
  propertyType?: string;
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
  constructionYear?: number;
  reference?: string;
}

export interface UnitInput {
  propertyId: string;
  name: string;
  reference?: string;
  flatType?: string;
  floor?: string;
}

export interface SurveyInput {
  propertyId: string;
  unitId: string;
  inspectionDate: string;
  surveyorId?: string;
}

export interface DefectFindingInput {
  id: string;
  defectType: string;
  cause: string;
  condition: ConditionRating | "";
  priority: PriorityRating | "";
  notes: string;
  photoIds: string[];
}

export interface SurveyElementDraft {
  id: string;
  surveyId: string;
  category: string;
  element: string;
  categoryId?: string;
  elementId?: string;
  customComponentName?: string;
  customElementName?: string;
  accessibility: "inspection_required" | "not_applicable" | "inaccessible";
  accessibilityReason: string;
  constructionType: string;
  constructionNotes: string;
  installationYear?: number;
  typicalLifeYears?: number;
  lifeReference: string;
  remainingLife?: number;
  replacementYear?: number;
  planningHorizon: PlanningHorizon | "";
  planningOverrideReason: string;
  estimatedCost?: number;
  costBasis: string;
  defects: DefectFindingInput[];
  recommendedWorks: string;
  generalNotes: string;
  accessLimitations: string;
  furtherInvestigation: boolean;
  mediaIds: string[];
  status: ElementStatus;
  version: number;
  updatedAt: string;
}

export interface LifecycleCalculation {
  age: number | null;
  remainingLife: number | null;
  replacementYear: number | null;
  suggestedHorizon: PlanningHorizon | "";
}

export interface MediaUpload {
  id: string;
  surveyId: string;
  surveyElementId: string;
  findingId?: string;
  filename: string;
  contentType: string;
  size: number;
  status: "queued" | "uploading" | "uploaded" | "failed";
}

export interface SurveyCompletionRequest {
  surveyId: string;
  expectedVersion: number;
  acknowledgedIncomplete: boolean;
}

export interface ReportGenerationRequest {
  scope: { kind: "survey"; surveyId: string } | { kind: "property"; propertyId: string } | { kind: "portfolio" };
  reportType: "stock_condition";
}

export interface ReportMetadata {
  title: string;
  clientName: string;
  reportReference: string;
  reportDate: string;
  inspectionDates: string[];
  preparedBy: string;
  checkedBy: string;
}

export interface RatingSummary {
  label: string;
  count: number;
  percentage: number;
}

export interface ComponentReportSection {
  component: string;
  narrative: string;
  elements: Array<{
    surveyElementId: string;
    element: string;
    status: string;
    construction?: string;
    condition?: ConditionRating;
    priority?: PriorityRating;
    remainingLife?: number;
    replacementYear?: number;
    planningHorizon?: PlanningHorizon;
    defects: string[];
    recommendedWorks?: string;
    estimatedCost?: number;
    costBasis?: string;
    generalNotes?: string;
    accessLimitations?: string;
    photoIds: string[];
  }>;
}

export interface ReportNarrative {
  executiveSummary: string;
  introduction: string;
  methodology: string;
  limitations: string[];
  componentNarratives: Array<{ component: string; narrative: string }>;
  plannedMaintenance: string;
  recommendations: string[];
  dataQualityIssues: string[];
}

export interface ReportPhoto {
  id: string;
  mediaId: string;
  surveyElementId: string;
  sectionKey: string;
  caption: string;
  displayOrder: number;
  included: boolean;
}

export interface ReportDocument {
  metadata: ReportMetadata;
  executiveSummary: string;
  introduction: string;
  methodology: string;
  limitations: string[];
  stockProfile: Record<string, string | number>;
  conditionSummary: RatingSummary[];
  prioritySummary: RatingSummary[];
  componentSections: ComponentReportSection[];
  plannedMaintenance: string;
  lifecycleSchedule: Array<{ element: string; remainingLife?: number; replacementYear?: number; horizon?: PlanningHorizon }>;
  recommendations: string[];
  photoSchedule: ReportPhoto[];
  dataQualityIssues: string[];
}

export interface ReportGenerationProgress {
  reportId: string;
  runId: string;
  status: "queued" | "preparing" | "generating" | "assembling" | "ready" | "failed";
  completedSteps: number;
  totalSteps: number;
  currentStep?: string;
  error?: { message: string; code?: string };
}

export interface ReportSectionDraft {
  id?: string;
  sectionKey: string;
  title: string;
  content: unknown;
  included: boolean;
  version: number;
}

export interface ReportPhotoPlacement {
  id?: string;
  mediaId: string;
  surveyElementId: string;
  sectionKey: string;
  caption: string;
  displayOrder: number;
  included: boolean;
}

export interface ReportSaveRequest {
  expectedVersion: number;
  metadata: ReportMetadata;
  document: ReportDocument;
  sections?: ReportSectionDraft[];
  photos?: ReportPhotoPlacement[];
}

export interface ReportApprovalRequest {
  expectedVersion: number;
  acknowledgedWarnings: boolean;
}

export interface OfflineMutation {
  id: string;
  entity: "survey_element" | "media" | "survey";
  operation: "upsert" | "complete" | "upload";
  entityId: string;
  expectedVersion?: number;
  payload: unknown;
  createdAt: string;
  attempts: number;
  status: "queued" | "syncing" | "conflict" | "failed";
  error?: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  buildingName?: string;
  propertyType?: string;
  address: string;
  postcode: string;
  constructionYear?: number;
  units: number;
  surveyedUnits: number;
  inProgressUnits?: number;
  completedUnits?: number;
  urgentFindings: number;
}

export interface SurveyRecord {
  id: string;
  surveyId: string;
  propertyId: string;
  surveyDate: string;
  property: string;
  building: string;
  propertyType: string;
  unit: string;
  flatType: string;
  floor: string;
  surveyElementId: string;
  component: string;
  element: string;
  construction: string;
  defect: string;
  defectCause: string;
  defectNotes: string;
  condition: ConditionRating;
  priority: PriorityRating;
  planningHorizon: PlanningHorizon;
  remainingLife: number;
  replacementYear: number;
  surveyStatus: SurveyStatus;
  surveyor: string;
  photoCount: number;
  estimatedCost?: number;
  recommendedWorks: string;
}

export interface CustomSurveyElementInput {
  surveyId: string;
  componentName: string;
  elementName: string;
}

export interface SurveyNavigationResult {
  surveyId: string;
  unitId: string;
  unitName: string;
  direction: "next" | "previous";
}

export interface ReportSummary {
  id: string;
  surveyId?: string;
  scopeType?: "survey" | "property" | "portfolio";
  propertyId?: string;
  property: string;
  unit: string;
  status: "draft" | "approved" | "generating" | "failed";
  generationStatus?: "queued" | "preparing" | "generating" | "assembling" | "ready" | "failed";
  reviewStatus?: "draft" | "in_review" | "approved";
  progress?: number;
  currentStep?: string;
  errorMessage?: string;
  title?: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ReportJobSummary {
  id: string;
  reportId: string;
  runId: string;
  scopeType: "survey" | "property" | "portfolio";
  property: string;
  unit: string;
  reportTitle: string;
  status: "queued" | "processing" | "completed" | "failed";
  runStatus: "queued" | "running" | "completed" | "failed";
  attempts: number;
  currentStep?: string;
  availableAt: string;
  lockedAt?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
