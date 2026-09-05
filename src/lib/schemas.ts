import { z } from "zod";

export const propertySchema = z.object({
  name: z.string().min(2, "Enter a property name"),
  buildingName: z.string().optional(),
  propertyType: z.string().optional(),
  addressLine1: z.string().min(3, "Enter the first address line"),
  addressLine2: z.string().optional(),
  town: z.string().min(2, "Enter a town or city"),
  postcode: z.string().min(5, "Enter a valid postcode"),
  constructionYear: z.coerce.number().int().min(1600).max(new Date().getFullYear()).optional(),
  reference: z.string().optional()
});

export const unitSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1),
  reference: z.string().optional(),
  flatType: z.string().optional(),
  floor: z.string().optional()
});

export const findingSchema = z.object({
  id: z.string().uuid(),
  defectType: z.string(),
  cause: z.string(),
  condition: z.enum(["A", "B", "C", "D"]),
  priority: z.enum(["1", "2", "3", "4"]),
  notes: z.string(),
  photoIds: z.array(z.string())
});

export const surveyElementSchema = z.object({
  id: z.string().uuid(),
  surveyId: z.string().uuid(),
  category: z.string().min(1),
  element: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
  customComponentName: z.string().optional(),
  customElementName: z.string().optional(),
  accessibility: z.enum(["inspection_required", "not_applicable", "inaccessible"]),
  accessibilityReason: z.string(),
  constructionType: z.string(),
  constructionNotes: z.string(),
  installationYear: z.coerce.number().int().min(1600).max(new Date().getFullYear()).optional(),
  typicalLifeYears: z.coerce.number().positive().optional(),
  lifeReference: z.string(),
  remainingLife: z.number().optional(),
  replacementYear: z.number().optional(),
  planningHorizon: z.enum(["1-10 years", "11-20 years", "21-30 years", "Beyond 30 years", "Overdue", ""]),
  planningOverrideReason: z.string(),
  estimatedCost: z.coerce.number().min(0).optional(),
  costBasis: z.string(),
  defects: z.array(findingSchema),
  recommendedWorks: z.string(),
  generalNotes: z.string(),
  accessLimitations: z.string(),
  furtherInvestigation: z.boolean(),
  mediaIds: z.array(z.string()),
  status: z.enum(["not_started", "partial", "completed", "not_applicable", "inaccessible"]),
  version: z.number().int().nonnegative(),
  updatedAt: z.string()
}).superRefine((value, context) => {
  if (value.accessibility === "inaccessible" && !value.accessibilityReason.trim()) {
    context.addIssue({ code: "custom", path: ["accessibilityReason"], message: "Explain why the element is inaccessible" });
  }
  if (value.accessibility === "inspection_required" && value.status === "completed") {
    if (!value.constructionType.trim()) context.addIssue({ code: "custom", path: ["constructionType"], message: "Enter the construction type" });
    if (!value.planningHorizon) context.addIssue({ code: "custom", path: ["planningHorizon"], message: "Select a planning horizon" });
  }
});

export const reportGenerationSchema = z.object({
  scope: z.union([
    z.object({ kind: z.literal("survey"), surveyId: z.string().uuid() }),
    z.object({ kind: z.literal("property"), propertyId: z.string().uuid() }),
    z.object({ kind: z.literal("portfolio") })
  ]),
  reportType: z.literal("stock_condition")
});

export const reportMetadataSchema = z.object({
  title: z.string().min(1),
  clientName: z.string(),
  reportReference: z.string(),
  reportDate: z.string(),
  inspectionDates: z.array(z.string()),
  preparedBy: z.string(),
  checkedBy: z.string(),
});

export const reportDocumentSchema = z.object({
  metadata: reportMetadataSchema,
  executiveSummary: z.string(),
  introduction: z.string(),
  methodology: z.string(),
  limitations: z.array(z.string()),
  stockProfile: z.record(z.union([z.string(), z.number()])),
  conditionSummary: z.array(z.object({ label: z.string(), count: z.number(), percentage: z.number() })),
  prioritySummary: z.array(z.object({ label: z.string(), count: z.number(), percentage: z.number() })),
  componentSections: z.array(z.object({
    component: z.string(),
    narrative: z.string(),
    elements: z.array(z.object({
      surveyElementId: z.string(), element: z.string(), status: z.string(),
      construction: z.string().optional(), condition: z.enum(["A", "B", "C", "D"]).optional(),
      priority: z.enum(["1", "2", "3", "4"]).optional(), remainingLife: z.number().optional(),
      replacementYear: z.number().optional(), planningHorizon: z.enum(["Overdue", "1-10 years", "11-20 years", "21-30 years", "Beyond 30 years"]).optional(), defects: z.array(z.string()),
      recommendedWorks: z.string().optional(), estimatedCost: z.number().nonnegative().optional(), costBasis: z.string().optional(),
      generalNotes: z.string().optional(), accessLimitations: z.string().optional(), photoIds: z.array(z.string()),
    })),
  })),
  plannedMaintenance: z.string(),
  lifecycleSchedule: z.array(z.object({ element: z.string(), remainingLife: z.number().optional(), replacementYear: z.number().optional(), horizon: z.enum(["Overdue", "1-10 years", "11-20 years", "21-30 years", "Beyond 30 years"]).optional() })),
  recommendations: z.array(z.string()),
  photoSchedule: z.array(z.object({ id: z.string(), mediaId: z.string(), surveyElementId: z.string(), sectionKey: z.string(), caption: z.string(), displayOrder: z.number(), included: z.boolean() })),
  dataQualityIssues: z.array(z.string()),
});

export const reportNarrativeSchema = z.object({
  executiveSummary: z.string().min(1),
  introduction: z.string().min(1),
  methodology: z.string().min(1),
  limitations: z.array(z.string()),
  componentNarratives: z.array(z.object({ component: z.string().min(1), narrative: z.string().min(1) }).strict()),
  plannedMaintenance: z.string().min(1),
  recommendations: z.array(z.string()),
  dataQualityIssues: z.array(z.string()),
}).strict();

export const reportSaveSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  metadata: reportMetadataSchema,
  document: reportDocumentSchema,
  sections: z.array(z.object({ id: z.string().uuid().optional(), sectionKey: z.string(), title: z.string(), content: z.unknown(), included: z.boolean(), version: z.number().int().nonnegative() })).optional(),
  photos: z.array(z.object({ id: z.string().uuid().optional(), mediaId: z.string().uuid(), surveyElementId: z.string().uuid(), sectionKey: z.string(), caption: z.string(), displayOrder: z.number().int().nonnegative(), included: z.boolean() })).optional(),
});

export const reportApprovalSchema = z.object({ expectedVersion: z.number().int().nonnegative(), acknowledgedWarnings: z.boolean() });

export const surveyCompletionSchema = z.object({
  surveyId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  acknowledgedIncomplete: z.boolean()
});
