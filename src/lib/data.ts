/* eslint-disable @typescript-eslint/no-explicit-any */
import { demoProperties, demoRecords, demoReports, demoUnits } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaginatedResult, PropertySummary, ReportJobSummary, ReportSummary, SurveyElementDraft, SurveyRecord } from "@/lib/types";
import { reportErrorMessage } from "@/lib/reporting/queue";
import { catalog, type CatalogElement } from "@/lib/catalog";
import { demoElementStatuses } from "@/lib/demo-data";

export async function getProperties(): Promise<PropertySummary[]> {
  if (!hasSupabaseConfig) return demoProperties;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id,name,building_name,property_type,address_line_1,address_line_2,town,postcode,construction_year,number_of_storeys,reference,units(id,flat_type,floor,surveys(id,status,inspection_date,survey_elements(defect_findings(priority))))")
    .eq("archived", false)
    .order("name");
  if (error || !data) {
    console.error("[data] getProperties failed", error?.message ?? "No data returned");
    return [];
  }
  return data.map((property: any) => {
    const units = property.units ?? [];
    const latestSurveys = units.map((unit: any) => [...(unit.surveys ?? [])].sort((a: any, b: any) => String(b.inspection_date ?? "").localeCompare(String(a.inspection_date ?? "")))[0]).filter(Boolean);
    const surveyedUnits = latestSurveys.filter((survey: any) => ["draft", "in_progress", "completed"].includes(survey.status)).length;
    const inProgressUnits = latestSurveys.filter((survey: any) => survey.status === "in_progress").length;
    const completedUnits = latestSurveys.filter((survey: any) => survey.status === "completed").length;
    const urgentFindings = units.flatMap((unit: any) => unit.surveys ?? []).flatMap((survey: any) => survey.survey_elements ?? []).flatMap((item: any) => item.defect_findings ?? []).filter((finding: any) => finding.priority === "1").length;
    return {
      id: property.id,
      name: property.name,
      buildingName: property.building_name ?? property.name,
      propertyType: property.property_type ?? undefined,
      addressLine1: property.address_line_1,
      addressLine2: property.address_line_2 ?? undefined,
      town: property.town,
      address: [property.address_line_1, property.town].filter(Boolean).join(", "),
      postcode: property.postcode,
      constructionYear: property.construction_year ?? undefined,
      numberOfStoreys: property.number_of_storeys ?? undefined,
      reference: property.reference ?? undefined,
      units: units.length,
      surveyedUnits,
      inProgressUnits,
      completedUnits,
      urgentFindings
    };
  });
}

export async function getSurveyCatalog(): Promise<CatalogElement[]> {
  if (!hasSupabaseConfig) return catalog;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("elements").select("name,component_categories!inner(name),construction_types(name),defect_types(name),lifecycle_references(typical_life_years,source_label)").eq("active", true).order("sort_order");
  if (error || !data?.length) return catalog;
  return (data as any[]).map((item) => {
    const reference = Array.isArray(item.lifecycle_references) ? item.lifecycle_references[0] : item.lifecycle_references;
    return { category: item.component_categories?.name ?? "Other", name: item.name, lifespan: reference?.typical_life_years ?? 20, lifespanLabel: reference?.source_label ?? `${reference?.typical_life_years ?? 20} years`, constructionTypes: (item.construction_types ?? []).map((option: any) => option.name), defectTypes: (item.defect_types ?? []).map((option: any) => option.name) };
  });
}

export async function getProperty(id: string) {
  const properties = await getProperties();
  return properties.find((property) => property.id === id) ?? null;
}

export async function getUnits(propertyId: string) {
  if (!hasSupabaseConfig) return demoUnits.map((unit) => ({
    ...unit,
    completedSurveyId: demoRecords.find((record) => record.propertyId === propertyId && record.unit === unit.name && record.surveyStatus === "completed")?.surveyId ?? null,
  }));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("units").select("id,name,flat_type,floor,surveys(id,status,inspection_date,survey_elements(id))").eq("property_id", propertyId).eq("archived", false).order("name");
  if (error || !data) return [];
  return data.map((unit: any) => {
    const surveys = [...(unit.surveys ?? [])].sort((a: any, b: any) => String(b.inspection_date).localeCompare(String(a.inspection_date)));
    const survey = surveys[0];
    const completedSurvey = surveys.find((item: any) => item.status === "completed");
    return { id: unit.id, name: unit.name, flatType: unit.flat_type ?? null, floor: unit.floor ?? null, status: survey?.status ?? "not_started", records: survey?.survey_elements?.length ?? 0, lastSurvey: survey?.inspection_date ?? null, completedSurveyId: completedSurvey?.id ?? null };
  });
}

export interface ExcelExportPropertyOption {
  id: string;
  name: string;
  units: Array<{ id: string; name: string; surveyId: string }>;
}

export async function getExcelExportOptions(): Promise<ExcelExportPropertyOption[]> {
  if (!hasSupabaseConfig) {
    const properties = new Map<string, ExcelExportPropertyOption>();
    for (const record of [...demoRecords].filter((item) => item.surveyStatus === "completed").sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))) {
      const property = properties.get(record.propertyId) ?? { id: record.propertyId, name: record.property, units: [] };
      if (!property.units.some((unit) => unit.name === record.unit)) property.units.push({ id: record.unit, name: record.unit, surveyId: record.surveyId });
      properties.set(record.propertyId, property);
    }
    return [...properties.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  const supabase = await createSupabaseServerClient();
  const data: any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const result = await supabase.from("surveys")
      .select("id,inspection_date,completed_at,created_at,unit_id,units(id,name,property_id,properties(id,name))")
      .eq("status", "completed").order("inspection_date", { ascending: false }).order("completed_at", { ascending: false })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + pageSize - 1);
    if (result.error || !result.data) return [];
    data.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  const properties = new Map<string, ExcelExportPropertyOption>();
  const seenUnits = new Set<string>();
  for (const survey of data) {
    const unit = relationOne(survey.units);
    const property = relationOne(unit?.properties);
    if (!unit?.id || !unit?.name || !property?.id || !property?.name || seenUnits.has(unit.id)) continue;
    seenUnits.add(unit.id);
    const option: ExcelExportPropertyOption = properties.get(property.id) ?? { id: property.id, name: property.name, units: [] };
    option.units.push({ id: unit.id, name: unit.name, surveyId: survey.id });
    properties.set(property.id, option);
  }
  return [...properties.values()].map((property) => ({ ...property, units: property.units.sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface ReportFlatScope {
  surveyId: string;
  propertyId: string;
  propertyName: string;
  unitName: string;
}

export async function getReportFlatScopes(): Promise<ReportFlatScope[]> {
  if (!hasSupabaseConfig) {
    const seen = new Set<string>();
    return demoRecords.filter((record) => {
      if (seen.has(record.surveyId)) return false;
      seen.add(record.surveyId);
      return true;
    }).map((record) => ({ surveyId: record.surveyId, propertyId: record.propertyId, propertyName: record.property, unitName: record.unit }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id,inspection_date,units(id,name,property_id,properties(name))")
    .order("inspection_date", { ascending: false });
  if (error || !data) return [];

  const latestByUnit = new Map<string, ReportFlatScope>();
  for (const survey of data as any[]) {
    const unit = Array.isArray(survey.units) ? survey.units[0] : survey.units;
    const property = unit && (Array.isArray(unit.properties) ? unit.properties[0] : unit.properties);
    if (unit?.id && unit?.name && property?.name && !latestByUnit.has(unit.id)) {
      latestByUnit.set(unit.id, { surveyId: survey.id, propertyId: unit.property_id, propertyName: property.name, unitName: unit.name });
    }
  }
  return [...latestByUnit.values()].sort((a, b) => `${a.propertyName} ${a.unitName}`.localeCompare(`${b.propertyName} ${b.unitName}`));
}

export async function getRecords(propertyId?: string): Promise<SurveyRecord[]> {
  if (!hasSupabaseConfig) return propertyId ? demoRecords.filter((record) => record.propertyId === propertyId) : demoRecords;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("records_view").select("*").order("survey_date", { ascending: false }).limit(500);
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.finding_id,
    surveyId: row.survey_id,
    propertyId: row.property_id,
    surveyDate: row.survey_date,
    property: row.property_name,
    building: row.building_name ?? row.property_name,
    propertyType: row.property_type ?? "Not recorded",
    unit: row.unit_name,
    flatType: row.flat_type ?? "Not recorded",
    floor: row.floor ?? "Not recorded",
    surveyElementId: row.survey_element_id,
    component: row.category_name,
    element: row.element_name,
    construction: row.construction_type ?? "Not recorded",
    defect: row.defect_type ?? "No defect recorded",
    defectCause: row.defect_cause ?? "",
    defectNotes: row.defect_notes ?? "",
    condition: row.condition,
    priority: row.priority,
    planningHorizon: row.planning_horizon,
    remainingLife: row.remaining_life ?? 0,
    replacementYear: row.replacement_year ?? 0,
    surveyStatus: row.survey_status,
    surveyor: row.surveyor_name ?? "Unassigned",
    photoCount: row.photo_count ?? 0,
    estimatedCost: row.estimated_cost ?? undefined,
    recommendedWorks: row.recommended_works ?? ""
  }));
}

const reportSummarySelection = "id,survey_id,property_id,scope_type,status,generation_status,review_status,progress,current_step,error_message,title,updated_at,approved_at,report_property:properties!reports_property_id_fkey(name),survey:surveys!reports_survey_id_fkey(units(name,properties(name)))";

function relationOne(value: unknown): any | undefined {
  if (Array.isArray(value)) return value[0];
  return value && typeof value === "object" ? value : undefined;
}

export function mapReportSummary(row: any): ReportSummary {
  const survey = relationOne(row.survey);
  const unit = relationOne(survey?.units);
  const surveyProperty = relationOne(unit?.properties);
  const directProperty = relationOne(row.report_property);
  const scopeType = row.scope_type === "property" || row.scope_type === "portfolio" ? row.scope_type : "survey";
  return {
    id: row.id,
    surveyId: row.survey_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    scopeType,
    property: scopeType === "portfolio" ? "Portfolio" : directProperty?.name ?? surveyProperty?.name ?? "Property not found",
    unit: scopeType === "survey" ? unit?.name ?? "Unit not found" : scopeType === "property" ? "All units" : "All properties",
    status: row.status,
    generationStatus: row.generation_status ?? (row.status === "generating" ? "queued" : row.status === "failed" ? "failed" : "ready"),
    reviewStatus: row.review_status ?? (row.status === "approved" ? "approved" : "draft"),
    progress: typeof row.progress === "number" ? row.progress : row.status === "generating" ? 0 : 100,
    currentStep: row.current_step ?? undefined,
    errorMessage: row.error_message ?? undefined,
    title: row.title ?? undefined,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at ?? undefined,
  };
}

export async function getReportsPage(page = 1, pageSize = 10): Promise<PaginatedResult<ReportSummary>> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  if (!hasSupabaseConfig) {
    const pageCount = Math.max(1, Math.ceil(demoReports.length / pageSize));
    const resolvedPage = Math.min(safePage, pageCount);
    const start = (resolvedPage - 1) * pageSize;
    const items = demoReports.slice(start, start + pageSize).map((report) => ({ ...report, scopeType: report.scopeType ?? "survey" as const, generationStatus: report.generationStatus ?? "ready" as const, reviewStatus: report.reviewStatus ?? (report.status === "approved" ? "approved" as const : "draft" as const), progress: report.progress ?? 100, title: report.title ?? `${report.property} · ${report.unit} stock condition survey report` }));
    return { items, page: resolvedPage, pageSize, pageCount, total: demoReports.length };
  }
  const supabase = await createSupabaseServerClient();
  const fetchPage = (targetPage: number) => { const start = (targetPage - 1) * pageSize; return supabase.from("reports").select(reportSummarySelection, { count: "exact" }).order("updated_at", { ascending: false }).range(start, start + pageSize - 1); };
  const firstResult = await fetchPage(safePage);
  let { data, error } = firstResult;
  const { count } = firstResult;
  if (error || !data) return { items: [], page: safePage, pageSize, pageCount: 1, total: 0 };
  const total = count ?? data.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(safePage, pageCount);
  if (resolvedPage !== safePage) ({ data, error } = await fetchPage(resolvedPage));
  if (error || !data) return { items: [], page: resolvedPage, pageSize, pageCount, total };
  return { items: data.map(mapReportSummary), page: resolvedPage, pageSize, pageCount, total };
}

export async function getReports(): Promise<ReportSummary[]> {
  return (await getReportsPage(1, 500)).items;
}

export async function getReportById(reportId: string): Promise<ReportSummary | null> {
  if (!hasSupabaseConfig) return demoReports.find((report) => report.id === reportId) ?? { id: reportId, surveyId: demoRecords[0].surveyId, propertyId: demoRecords[0].propertyId, scopeType: "survey", property: demoRecords[0].property, unit: demoRecords[0].unit, status: "draft", generationStatus: "ready", reviewStatus: "draft", progress: 100, title: `${demoRecords[0].property} · ${demoRecords[0].unit} stock condition survey report`, updatedAt: new Date().toISOString() };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("reports").select(reportSummarySelection).eq("id", reportId).maybeSingle();
  return error || !data ? null : mapReportSummary(data);
}

const reportJobSelection = "id,report_id,run_id,scope,status,attempts,available_at,locked_at,last_error,created_at,completed_at,report:reports!report_generation_jobs_report_id_fkey(title,scope_type,property_id,survey_id,report_property:properties!reports_property_id_fkey(name),survey:surveys!reports_survey_id_fkey(units(name,properties(name)))),run:report_generation_runs!report_generation_jobs_run_id_fkey(status,current_step,error)";

function mapReportJob(row: any): ReportJobSummary {
  const report = relationOne(row.report);
  const run = relationOne(row.run);
  const survey = relationOne(report?.survey);
  const unit = relationOne(survey?.units);
  const surveyProperty = relationOne(unit?.properties);
  const directProperty = relationOne(report?.report_property);
  const scopeType = row.scope?.kind === "property" || row.scope?.kind === "portfolio" ? row.scope.kind : "survey";
  return {
    id: row.id,
    reportId: row.report_id,
    runId: row.run_id,
    scopeType,
    property: scopeType === "portfolio" ? "Portfolio" : directProperty?.name ?? surveyProperty?.name ?? "Property not found",
    unit: scopeType === "survey" ? unit?.name ?? "Unit not found" : scopeType === "property" ? "All units" : "All properties",
    reportTitle: report?.title ?? "Stock condition report",
    status: row.status,
    runStatus: run?.status ?? (row.status === "processing" ? "running" : row.status),
    attempts: row.attempts ?? 0,
    currentStep: run?.current_step ?? undefined,
    availableAt: row.available_at,
    lockedAt: row.locked_at ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    errorMessage: row.status === "completed" ? undefined : reportErrorMessage(row.last_error) ?? reportErrorMessage(run?.error),
  };
}

export async function getReportJobsPage(page = 1, pageSize = 10, status?: string): Promise<PaginatedResult<ReportJobSummary>> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  if (!hasSupabaseConfig) return { items: [], page: 1, pageSize, pageCount: 1, total: 0 };
  const supabase = await createSupabaseServerClient();
  const fetchPage = (targetPage: number) => {
    const start = (targetPage - 1) * pageSize;
    let query = supabase.from("report_generation_jobs").select(reportJobSelection, { count: "exact" }).order("created_at", { ascending: false }).range(start, start + pageSize - 1);
    if (status && ["queued", "processing", "completed", "failed"].includes(status)) query = query.eq("status", status);
    return query;
  };
  const firstResult = await fetchPage(safePage);
  let { data, error } = firstResult;
  const { count } = firstResult;
  if (error || !data) return { items: [], page: safePage, pageSize, pageCount: 1, total: 0 };
  const total = count ?? data.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(safePage, pageCount);
  if (resolvedPage !== safePage) ({ data, error } = await fetchPage(resolvedPage));
  if (error || !data) return { items: [], page: resolvedPage, pageSize, pageCount, total };
  return { items: data.map(mapReportJob), page: resolvedPage, pageSize, pageCount, total };
}

export interface DashboardFilters {
  propertyId?: string;
  building?: string;
  propertyType?: string;
  from?: string;
  to?: string;
}

export async function getDashboardData(filters: DashboardFilters = {}) {
  const [properties, records] = await Promise.all([getProperties(), getRecords(filters.propertyId)]);
  const selectedProperty = filters.propertyId ? properties.find((property) => property.id === filters.propertyId) : undefined;
  const scopedProperties = (selectedProperty ? [selectedProperty] : properties).filter((property) => (!filters.building || property.buildingName === filters.building) && (!filters.propertyType || property.propertyType === filters.propertyType));
  const filteredRecords = records.filter((record) => {
    const dateOk = (!filters.from || record.surveyDate >= filters.from) && (!filters.to || record.surveyDate <= filters.to);
    const buildingOk = !filters.building || record.building === filters.building;
    const propertyTypeOk = !filters.propertyType || record.propertyType === filters.propertyType;
    return dateOk && buildingOk && propertyTypeOk;
  });
  const recordsForMetrics = filteredRecords;
  const distinctElements = [...new Map(recordsForMetrics.map((record) => [record.surveyElementId, record])).values()];
  const surveys = new Set(recordsForMetrics.map((record) => record.surveyId));
  const units = new Set(recordsForMetrics.map((record) => `${record.propertyId}:${record.unit}`));
  const propertiesSurveyed = new Set(recordsForMetrics.map((record) => record.propertyId));
  const buildingsSurveyed = new Set(recordsForMetrics.map((record) => record.building));
  const condition = ["A", "B", "C", "D"].map((rating) => ({ rating, count: recordsForMetrics.filter((record) => record.condition === rating).length }));
  const priority = ["1", "2", "3", "4"].map((rating) => ({ rating, count: recordsForMetrics.filter((record) => record.priority === rating).length }));
  const horizons = ["Overdue", "1-10 years", "11-20 years", "21-30 years", "Beyond 30 years"].map((horizon) => ({ horizon, count: distinctElements.filter((record) => record.planningHorizon === horizon).length, cost: distinctElements.filter((record) => record.planningHorizon === horizon).reduce((sum, record) => sum + (record.estimatedCost ?? 0), 0) }));
  const propertyCondition = [...recordsForMetrics.reduce((map, record) => {
    const current = map.get(record.propertyId) ?? { total: 0, poor: 0, score: 0 };
    current.total += 1; current.poor += ["C", "D"].includes(record.condition) ? 1 : 0; current.score += { A: 1, B: 2, C: 3, D: 4 }[record.condition]; map.set(record.propertyId, current); return map;
  }, new Map<string, { total: number; poor: number; score: number }>()).values()];
  const conditionIndex = propertyCondition.length ? propertyCondition.reduce((sum, item) => sum + item.score / item.total, 0) / propertyCondition.length : null;
  const componentCondition = [...recordsForMetrics.reduce((map, record) => {
    const current = map.get(record.element) ?? { total: 0, good: 0, poor: 0 };
    current.total += 1; if (["A", "B"].includes(record.condition)) current.good += 1; else current.poor += 1; map.set(record.element, current); return map;
  }, new Map<string, { total: number; good: number; poor: number }>()).entries()].map(([element, item]) => ({ element, good: item.total ? Math.round((item.good / item.total) * 100) : 0, poor: item.total ? Math.round((item.poor / item.total) * 100) : 0, total: item.total })).sort((a, b) => b.poor - a.poor).slice(0, 10);
  const defects = [...recordsForMetrics.reduce((counts, record) => counts.set(record.defect, (counts.get(record.defect) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([defect, count]) => ({ defect, count }));
  const estimatedCost = distinctElements.reduce((sum, record) => sum + (record.estimatedCost ?? 0), 0);
  const requiredFields = recordsForMetrics.length * 6;
  const completedFields = recordsForMetrics.reduce((sum, record) => sum + [record.condition, record.priority, record.element, record.construction, record.defect, record.recommendedWorks].filter(Boolean).length, 0);
  const targetUnits = scopedProperties.reduce((sum, property) => sum + property.units, 0);
  const inProgressUnits = scopedProperties.reduce((sum, property) => sum + (property.inProgressUnits ?? 0), 0);
  const completedUnits = scopedProperties.reduce((sum, property) => sum + (property.completedUnits ?? 0), 0);
  return {
    properties: propertiesSurveyed.size || scopedProperties.length,
    buildings: buildingsSurveyed.size,
    recordCount: recordsForMetrics.length,
    elements: distinctElements.length,
    surveyedUnits: units.size,
    inProgress: inProgressUnits || new Set(recordsForMetrics.filter((record) => record.surveyStatus === "in_progress").map((record) => record.surveyId)).size,
    completed: completedUnits || new Set(recordsForMetrics.filter((record) => record.surveyStatus === "completed").map((record) => record.surveyId)).size,
    targetUnits,
    surveyCoverage: targetUnits ? Math.min(100, Math.round((units.size / targetUnits) * 100)) : 0,
    surveys: surveys.size,
    condition,
    priority,
    horizons,
    defects,
    componentCondition,
    conditionIndex,
    propertyConditionPoor: propertyCondition.length ? Math.round((propertyCondition.filter((item) => item.poor > 0).length / propertyCondition.length) * 100) : 0,
    urgent: recordsForMetrics.filter((record) => record.priority === "1").length,
    photos: recordsForMetrics.reduce((sum, record) => sum + record.photoCount, 0),
    estimatedCost,
    annualRequirement: estimatedCost ? estimatedCost / 30 : 0,
    dataCompleteness: requiredFields ? Math.round((completedFields / requiredFields) * 100) : 0,
    recent: recordsForMetrics.slice(0, 8),
    records: recordsForMetrics,
    filterOptions: {
      buildings: [...new Set(records.map((record) => record.building))].sort(),
      propertyTypes: [...new Set(records.map((record) => record.propertyType).filter((value) => value !== "Not recorded"))].sort()
    }
  };
}

export async function getSurveyContext(surveyId: string) {
  const demo = { propertyId: demoProperties[0].id, unitId: demoUnits[0].id, property: "Bishop Hall", address: "Kingston Lane, Uxbridge, UB8 3PH", unit: "Flat 01", surveyor: "Amina Okafor", inspectionDate: "2026-08-29", status: "in_progress", statuses: demoElementStatuses, customElements: [] as Array<{ id: string; category: string; element: string; status: SurveyElementDraft["status"] }> };
  if (!hasSupabaseConfig) return demo;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("surveys").select("id,status,inspection_date,property_id,unit_id,properties(name,address_line_1,town,postcode),units(name),profiles!surveys_surveyor_id_fkey(full_name),survey_elements(id,status,custom_component_name,custom_element_name,elements(name),component_categories(name))").eq("id", surveyId).single();
  if (error || !data) return null;
  const property = data.properties as unknown as { name: string; address_line_1: string; town: string; postcode: string };
  const unit = data.units as unknown as { name: string };
  const profile = data.profiles as unknown as { full_name?: string } | null;
  const elements = data.survey_elements as unknown as Array<{ id: string; status: SurveyElementDraft["status"]; custom_component_name?: string; custom_element_name?: string; elements?: { name: string } | null; component_categories?: { name: string } | null }>;
  const customElements = elements.filter((item) => !item.elements && item.custom_element_name).map((item) => ({ id: item.id, category: item.custom_component_name ?? item.component_categories?.name ?? "Custom component", element: item.custom_element_name as string, status: item.status }));
  return { propertyId: data.property_id, unitId: data.unit_id, property: property.name, address: [property.address_line_1, property.town, property.postcode].filter(Boolean).join(", "), unit: unit.name, surveyor: profile?.full_name ?? "Unassigned", inspectionDate: data.inspection_date, status: data.status, statuses: new Map(elements.map((item) => [item.elements?.name ?? item.custom_element_name ?? item.id, item.status])), customElements };
}

export async function getSurveyElementDraft(surveyId: string, elementName: string): Promise<SurveyElementDraft | undefined> {
  if (!hasSupabaseConfig) return undefined;
  const supabase = await createSupabaseServerClient();
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(elementName);
  const selection = `*,elements${isId ? "" : "!inner"}(name),component_categories(name),defect_findings(id,defect_type_label,cause,condition,priority,notes,media(id)),media(id)`;
  let query = supabase.from("survey_elements").select(selection).eq("survey_id", surveyId);
  query = isId ? query.eq("id", elementName) : query.eq("elements.name", elementName);
  const { data: rawData } = await query.maybeSingle();
  const data = rawData as any;
  if (!data) return undefined;
  const resolvedElementName = data.elements?.name ?? data.custom_element_name ?? elementName;
  const fallback = catalog.find((item) => item.name === resolvedElementName) ?? catalog[0];
  const isCustomElement = Boolean(data.custom_element_name);
  const findings = (data.defect_findings ?? []) as Array<Record<string, unknown> & { media?: Array<{ id: string }> }>;
  const lifeReference = data.life_reference ?? (isCustomElement ? "" : fallback.lifespanLabel);
  return { id: data.id, surveyId, category: data.component_categories?.name ?? data.custom_component_name ?? fallback.category, element: resolvedElementName, categoryId: data.category_id ?? undefined, elementId: data.element_id ?? undefined, customComponentName: data.custom_component_name ?? undefined, customElementName: data.custom_element_name ?? undefined, accessibility: data.accessibility, accessibilityReason: data.accessibility_reason ?? "", constructionType: data.construction_type ?? "", constructionNotes: data.construction_notes ?? "", installationYear: data.installation_year ?? undefined, typicalLifeYears: isCustomElement ? data.typical_life_years ?? undefined : data.typical_life_years ?? fallback.lifespan, lifeReference, remainingLife: data.remaining_life ?? undefined, replacementYear: data.replacement_year ?? undefined, replacementYearProvided: data.replacement_year_provided ?? false, planningHorizon: data.planning_horizon ?? "", planningOverrideReason: data.planning_override_reason ?? "", estimatedCost: data.estimated_cost ?? undefined, costBasis: data.cost_basis ?? "", defects: findings.map((finding) => ({ id: String(finding.id), defectType: String(finding.defect_type_label ?? ""), cause: String(finding.cause ?? ""), condition: finding.condition as SurveyElementDraft["defects"][number]["condition"], priority: finding.priority as SurveyElementDraft["defects"][number]["priority"], notes: String(finding.notes ?? ""), photoIds: finding.media?.map((item) => item.id) ?? [] })), recommendedWorks: data.recommended_works ?? "", generalNotes: data.general_notes ?? "", accessLimitations: data.access_limitations ?? "", furtherInvestigation: data.further_investigation ?? false, mediaIds: (data.media ?? []).map((item: { id: string }) => item.id), status: data.status, version: data.version, updatedAt: data.updated_at };
}

export async function getSurveyNavigation(surveyId: string) {
  if (!hasSupabaseConfig) return { propertyId: demoProperties[0].id, unitId: demoUnits[0].id, units: demoUnits.map((unit) => ({ id: unit.id, name: unit.name, surveyId: "demo-survey" })) };
  const supabase = await createSupabaseServerClient();
  const { data: survey } = await supabase.from("surveys").select("property_id,unit_id").eq("id", surveyId).single();
  if (!survey) return null;
  const { data: units } = await supabase.from("units").select("id,name,surveys(id,status,inspection_date)").eq("property_id", survey.property_id).eq("archived", false).order("name");
  return { propertyId: survey.property_id, unitId: survey.unit_id, units: (units ?? []).map((unit: any) => ({ id: unit.id, name: unit.name, surveyId: [...(unit.surveys ?? [])].filter((item: any) => ["draft", "in_progress"].includes(item.status)).sort((a: any, b: any) => String(b.inspection_date).localeCompare(String(a.inspection_date)))[0]?.id })) };
}
