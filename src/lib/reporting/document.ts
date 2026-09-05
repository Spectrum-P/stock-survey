/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ConditionRating, PlanningHorizon, PriorityRating, ReportDocument, ReportNarrative } from "@/lib/types";

export type ReportScope = { kind: "survey"; surveyId: string; sectionKey?: string } | { kind: "property"; propertyId: string; sectionKey?: string } | { kind: "portfolio"; sectionKey?: string };
export type ReportEvidenceRow = Record<string, any>;

export const REPORT_NARRATIVE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["executiveSummary", "introduction", "methodology", "limitations", "componentNarratives", "plannedMaintenance", "recommendations", "dataQualityIssues"],
  properties: {
    executiveSummary: { type: "string", minLength: 1 },
    introduction: { type: "string", minLength: 1 },
    methodology: { type: "string", minLength: 1 },
    limitations: { type: "array", items: { type: "string" } },
    componentNarratives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["component", "narrative"],
        properties: { component: { type: "string", minLength: 1 }, narrative: { type: "string", minLength: 1 } },
      },
    },
    plannedMaintenance: { type: "string", minLength: 1 },
    recommendations: { type: "array", items: { type: "string" } },
    dataQualityIssues: { type: "array", items: { type: "string" } },
  },
} as const;

function rows(value: unknown): ReportEvidenceRow[] {
  return Array.isArray(value) ? value.filter((item): item is ReportEvidenceRow => !!item && typeof item === "object") : [];
}

function one(value: unknown): ReportEvidenceRow | undefined {
  if (Array.isArray(value)) return rows(value)[0];
  return value && typeof value === "object" ? value as ReportEvidenceRow : undefined;
}

function condition(value: unknown): ConditionRating | undefined {
  return value === "A" || value === "B" || value === "C" || value === "D" ? value : undefined;
}

function priority(value: unknown): PriorityRating | undefined {
  return value === "1" || value === "2" || value === "3" || value === "4" ? value : undefined;
}

function horizon(value: unknown): PlanningHorizon | undefined {
  return value === "Overdue" || value === "1-10 years" || value === "11-20 years" || value === "21-30 years" || value === "Beyond 30 years" ? value : undefined;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function fallbackReportDocument(title = "Stock condition report"): ReportDocument {
  return {
    metadata: { title, clientName: "", reportReference: "", reportDate: new Date().toISOString().slice(0, 10), inspectionDates: [], preparedBy: "", checkedBy: "" },
    executiveSummary: "",
    introduction: "",
    methodology: "",
    limitations: [],
    stockProfile: {},
    conditionSummary: [],
    prioritySummary: [],
    componentSections: [],
    plannedMaintenance: "",
    lifecycleSchedule: [],
    recommendations: [],
    photoSchedule: [],
    dataQualityIssues: [],
  };
}

export function normalizeReportDocument(value: unknown, title = "Stock condition report"): ReportDocument {
  const fallback = fallbackReportDocument(title);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const document = value as ReportEvidenceRow;
  const metadata = one(document.metadata) ?? {};
  const strings = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
  const text = (input: unknown, defaultValue = "") => typeof input === "string" ? input : defaultValue;
  const stockProfile = Object.fromEntries(Object.entries(one(document.stockProfile) ?? {}).filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number"));
  const summary = (input: unknown) => rows(input).filter((item) => typeof item.label === "string").map((item) => ({ label: item.label as string, count: numeric(item.count) ?? 0, percentage: numeric(item.percentage) ?? 0 }));
  const componentSections = rows(document.componentSections).filter((section) => typeof section.component === "string").map((section) => ({
    component: section.component as string,
    narrative: text(section.narrative),
    elements: rows(section.elements).map((element) => ({
      surveyElementId: text(element.surveyElementId), element: text(element.element, "Element not recorded"), status: text(element.status, "not recorded"),
      ...(typeof element.construction === "string" ? { construction: element.construction } : {}),
      ...(condition(element.condition) ? { condition: condition(element.condition) } : {}),
      ...(priority(element.priority) ? { priority: priority(element.priority) } : {}),
      ...(numeric(element.remainingLife) !== undefined ? { remainingLife: numeric(element.remainingLife) } : {}),
      ...(numeric(element.replacementYear) !== undefined ? { replacementYear: numeric(element.replacementYear) } : {}),
      ...(horizon(element.planningHorizon) ? { planningHorizon: horizon(element.planningHorizon) } : {}),
      defects: strings(element.defects),
      ...(typeof element.recommendedWorks === "string" ? { recommendedWorks: element.recommendedWorks } : {}),
      ...(numeric(element.estimatedCost) !== undefined ? { estimatedCost: numeric(element.estimatedCost) } : {}),
      ...(typeof element.costBasis === "string" ? { costBasis: element.costBasis } : {}),
      ...(typeof element.generalNotes === "string" ? { generalNotes: element.generalNotes } : {}),
      ...(typeof element.accessLimitations === "string" ? { accessLimitations: element.accessLimitations } : {}),
      photoIds: strings(element.photoIds),
    })),
  }));
  const lifecycleSchedule = rows(document.lifecycleSchedule).filter((item) => typeof item.element === "string").map((item) => ({
    element: item.element as string,
    ...(numeric(item.remainingLife) !== undefined ? { remainingLife: numeric(item.remainingLife) } : {}),
    ...(numeric(item.replacementYear) !== undefined ? { replacementYear: numeric(item.replacementYear) } : {}),
    ...(horizon(item.horizon) ? { horizon: horizon(item.horizon) } : {}),
  }));
  const photoSchedule = rows(document.photoSchedule).map((photo, index) => ({
    id: text(photo.id, `legacy-photo-${index + 1}`), mediaId: text(photo.mediaId), surveyElementId: text(photo.surveyElementId), sectionKey: text(photo.sectionKey, "photo_schedule"),
    caption: text(photo.caption), displayOrder: numeric(photo.displayOrder) ?? index, included: typeof photo.included === "boolean" ? photo.included : true,
  })).filter((photo) => photo.mediaId);
  return {
    metadata: {
      title: text(metadata.title).trim() || title,
      clientName: text(metadata.clientName), reportReference: text(metadata.reportReference), reportDate: text(metadata.reportDate, fallback.metadata.reportDate),
      inspectionDates: strings(metadata.inspectionDates), preparedBy: text(metadata.preparedBy), checkedBy: text(metadata.checkedBy),
    },
    executiveSummary: text(document.executiveSummary), introduction: text(document.introduction), methodology: text(document.methodology),
    limitations: strings(document.limitations), stockProfile, conditionSummary: summary(document.conditionSummary), prioritySummary: summary(document.prioritySummary),
    componentSections, plannedMaintenance: text(document.plannedMaintenance), lifecycleSchedule, recommendations: strings(document.recommendations), photoSchedule,
    dataQualityIssues: strings(document.dataQualityIssues),
  };
}

export function buildDeterministicReportDocument(surveys: ReportEvidenceRow[], scope: ReportScope, organizationName = ""): ReportDocument {
  const assessedElements = surveys.flatMap((survey) => rows(survey.survey_elements)).filter((element) => element.status !== "not_started");
  const findings = assessedElements.flatMap((element) => rows(element.defect_findings));
  const media = assessedElements.flatMap((element) => rows(element.media));
  const uniqueProperties = [...new Map(surveys.map((survey) => {
    const property = one(survey.properties);
    return [survey.property_id, property];
  })).values()].filter(Boolean) as ReportEvidenceRow[];
  const uniqueUnits = [...new Map(surveys.map((survey) => [survey.unit_id, one(survey.units)])).values()].filter(Boolean) as ReportEvidenceRow[];
  const firstProperty = uniqueProperties[0];
  const firstUnit = uniqueUnits[0];
  const title = scope.kind === "portfolio"
    ? "Portfolio stock condition report"
    : scope.kind === "property"
      ? `${firstProperty?.name ?? "Property"} stock condition report`
      : `${firstProperty?.name ?? "Property"} · ${firstUnit?.name ?? "Unit"} stock condition survey report`;
  const ratingSummary = (labels: string[], field: "condition" | "priority") => labels.map((label) => {
    const count = findings.filter((finding) => finding[field] === label).length;
    return { label, count, percentage: findings.length ? Math.round((count / findings.length) * 100) : 0 };
  });
  const grouped = new Map<string, ReportEvidenceRow[]>();
  for (const element of assessedElements) {
    const component = one(element.component_categories)?.name ?? element.custom_component_name ?? "Custom component";
    grouped.set(component, [...(grouped.get(component) ?? []), element]);
  }
  const componentSections = [...grouped.entries()].map(([component, elements]) => ({
    component,
    narrative: "Information was not available within the survey dataset.",
    elements: elements.map((element) => {
      const elementFindings = rows(element.defect_findings);
      return {
        surveyElementId: String(element.id),
        element: String(one(element.elements)?.name ?? element.custom_element_name ?? "Custom element"),
        status: String(element.status ?? "not recorded"),
        construction: element.construction_type ? String(element.construction_type) : undefined,
        condition: condition(elementFindings[0]?.condition),
        priority: priority(elementFindings[0]?.priority),
        remainingLife: numeric(element.remaining_life),
        replacementYear: numeric(element.replacement_year),
        planningHorizon: horizon(element.planning_horizon),
        defects: elementFindings.map((finding) => typeof finding.defect_type_label === "string" ? finding.defect_type_label.trim() : "").filter(Boolean),
        recommendedWorks: element.recommended_works ? String(element.recommended_works) : undefined,
        estimatedCost: numeric(element.estimated_cost),
        costBasis: element.cost_basis ? String(element.cost_basis) : undefined,
        generalNotes: element.general_notes ? String(element.general_notes) : undefined,
        accessLimitations: element.access_limitations ? String(element.access_limitations) : undefined,
        photoIds: rows(element.media).map((item) => String(item.id)),
      };
    }),
  }));
  const surveyors = [...new Set(surveys.map((survey) => one(survey.profiles)?.full_name).filter((name): name is string => typeof name === "string" && !!name.trim()))];
  const inspectionDates = [...new Set(surveys.map((survey) => survey.inspection_date).filter((date): date is string => typeof date === "string"))].sort();
  const estimatedCost = assessedElements.reduce((sum, element) => sum + (numeric(element.estimated_cost) ?? 0), 0);
  const recordedLimitations = [...new Set(assessedElements.flatMap((element) => [element.access_limitations, element.accessibility_reason]).filter((item): item is string => typeof item === "string" && !!item.trim()))];
  const recordedRecommendations = [...new Set(assessedElements.map((element) => element.recommended_works).filter((item): item is string => typeof item === "string" && !!item.trim()))];
  const dataQualityIssues: string[] = [];
  if (!assessedElements.length) dataQualityIssues.push("No assessed elements were available for this report scope.");
  if (assessedElements.some((element) => element.status === "partial")) dataQualityIssues.push("The report scope contains partially completed element assessments.");
  if (surveys.some((survey) => survey.status !== "completed")) dataQualityIssues.push("The report scope includes surveys that are not marked completed.");
  return {
    metadata: {
      title,
      clientName: organizationName,
      reportReference: scope.kind === "portfolio" ? "" : String(firstProperty?.reference ?? ""),
      reportDate: new Date().toISOString().slice(0, 10),
      inspectionDates,
      preparedBy: surveyors.join(", "),
      checkedBy: "",
    },
    executiveSummary: "Information was not available within the survey dataset.",
    introduction: "Information was not available within the survey dataset.",
    methodology: "The report is based on the stored survey records and recorded access limitations.",
    limitations: ["The report is limited to the evidence recorded in the survey dataset.", ...recordedLimitations],
    stockProfile: {
      properties: uniqueProperties.length,
      units: uniqueUnits.length,
      assessedElements: assessedElements.length,
      findings: findings.length,
      photographs: media.length,
      estimatedCost,
      ...(scope.kind !== "portfolio" && firstProperty?.name ? { property: String(firstProperty.name) } : {}),
      ...(scope.kind !== "portfolio" && firstProperty?.reference ? { propertyReference: String(firstProperty.reference) } : {}),
      ...(scope.kind !== "portfolio" && firstProperty?.building_name ? { buildingName: String(firstProperty.building_name) } : {}),
      ...(scope.kind !== "portfolio" && firstProperty?.property_type ? { propertyType: String(firstProperty.property_type) } : {}),
      ...(scope.kind !== "portfolio" && numeric(firstProperty?.construction_year) !== undefined ? { constructionYear: numeric(firstProperty.construction_year)! } : {}),
      ...(scope.kind === "survey" && firstUnit?.name ? { unit: String(firstUnit.name) } : {}),
      ...(scope.kind === "survey" && firstUnit?.reference ? { unitReference: String(firstUnit.reference) } : {}),
      ...(scope.kind === "survey" && firstUnit?.flat_type ? { flatType: String(firstUnit.flat_type) } : {}),
      ...(scope.kind === "survey" && firstUnit?.floor ? { floor: String(firstUnit.floor) } : {}),
      ...(scope.kind !== "portfolio" && firstProperty ? { address: [firstProperty.address_line_1, firstProperty.town, firstProperty.postcode].filter(Boolean).join(", ") } : {}),
    },
    conditionSummary: ratingSummary(["A", "B", "C", "D"], "condition"),
    prioritySummary: ratingSummary(["1", "2", "3", "4"], "priority"),
    componentSections,
    plannedMaintenance: "Information was not available within the survey dataset.",
    lifecycleSchedule: assessedElements.map((element) => ({
      element: String(one(element.elements)?.name ?? element.custom_element_name ?? "Custom element"),
      remainingLife: numeric(element.remaining_life),
      replacementYear: numeric(element.replacement_year),
      horizon: horizon(element.planning_horizon),
    })),
    recommendations: recordedRecommendations.length ? recordedRecommendations : ["Review the recorded findings and agree actions with the appointed surveyor."],
    photoSchedule: media.map((item, index) => ({ id: crypto.randomUUID(), mediaId: String(item.id), surveyElementId: String(item.survey_element_id), sectionKey: "photo_schedule", caption: String(item.caption ?? item.filename ?? `Photograph ${index + 1}`), displayOrder: index, included: true })),
    dataQualityIssues,
  };
}

export function mergeReportNarrative(base: ReportDocument, narrative: ReportNarrative): ReportDocument {
  const componentNarratives = new Map(narrative.componentNarratives.map((item) => [item.component, item.narrative]));
  return {
    ...base,
    executiveSummary: narrative.executiveSummary,
    introduction: narrative.introduction,
    methodology: narrative.methodology,
    limitations: narrative.limitations,
    componentSections: base.componentSections.map((section) => ({ ...section, narrative: componentNarratives.get(section.component) ?? section.narrative })),
    plannedMaintenance: narrative.plannedMaintenance,
    recommendations: narrative.recommendations,
    dataQualityIssues: [...new Set([...base.dataQualityIssues, ...narrative.dataQualityIssues])],
  };
}

export function mergeGeneratedSection(current: ReportDocument, generated: ReportDocument, sectionKey?: string): ReportDocument {
  if (!sectionKey || !(sectionKey in current)) return generated;
  if (sectionKey === "metadata" || sectionKey === "stockProfile" || sectionKey === "conditionSummary" || sectionKey === "prioritySummary" || sectionKey === "lifecycleSchedule" || sectionKey === "photoSchedule") return current;
  if (sectionKey === "componentSections") {
    const generatedNarratives = new Map(generated.componentSections.map((section) => [section.component, section.narrative]));
    return { ...current, componentSections: current.componentSections.map((section) => ({ ...section, narrative: generatedNarratives.get(section.component) ?? section.narrative })) };
  }
  return { ...current, [sectionKey]: generated[sectionKey as keyof ReportDocument] } as ReportDocument;
}
