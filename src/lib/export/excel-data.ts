/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoProperties, demoRecords, demoUnits } from "@/lib/demo-data";
import type { ExcelExportInput, ExcelExportRecord, ExcelExportScope } from "@/lib/export/excel";

export interface ExcelExportSelection {
  scope: ExcelExportScope;
  propertyId?: string;
  unitId?: string;
  surveyId?: string;
}

export class ExcelExportNotFoundError extends Error {}

interface CompletedSurveyRow {
  id: string;
  unit_id: string;
  property_id: string;
  inspection_date: string;
  completed_at?: string | null;
  created_at?: string | null;
  status: string;
}

export function latestCompletedSurveyPerUnit<T extends CompletedSurveyRow>(surveys: T[]) {
  const ordered = [...surveys].filter((survey) => survey.status === "completed").sort((a, b) => {
    const aKey = `${a.inspection_date}\u0000${a.completed_at ?? ""}\u0000${a.created_at ?? ""}\u0000${a.id}`;
    const bKey = `${b.inspection_date}\u0000${b.completed_at ?? ""}\u0000${b.created_at ?? ""}\u0000${b.id}`;
    return bKey.localeCompare(aKey);
  });
  const latest = new Map<string, T>();
  for (const survey of ordered) if (!latest.has(survey.unit_id)) latest.set(survey.unit_id, survey);
  return [...latest.values()];
}

function relationOne(value: unknown): any | undefined {
  return Array.isArray(value) ? value[0] : value && typeof value === "object" ? value : undefined;
}

function demoExport(selection: ExcelExportSelection): ExcelExportInput {
  let eligible = demoRecords.filter((record) => record.surveyStatus === "completed");
  if (selection.surveyId) eligible = eligible.filter((record) => record.surveyId === selection.surveyId);
  else if (selection.scope === "unit") {
    const unitName = demoUnits.find((unit) => unit.id === selection.unitId)?.name;
    eligible = eligible.filter((record) => record.propertyId === selection.propertyId && (!unitName || record.unit === unitName));
    const latestSurvey = [...eligible].sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))[0]?.surveyId;
    eligible = eligible.filter((record) => record.surveyId === latestSurvey);
  } else {
    eligible = eligible.filter((record) => record.propertyId === selection.propertyId);
    const latestByUnit = new Map<string, string>();
    for (const record of [...eligible].sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))) {
      if (!latestByUnit.has(record.unit)) latestByUnit.set(record.unit, record.surveyId);
    }
    eligible = eligible.filter((record) => latestByUnit.get(record.unit) === record.surveyId);
  }
  if (!eligible.length) throw new ExcelExportNotFoundError("No completed survey data is available for this export");
  const property = demoProperties.find((item) => item.id === eligible[0].propertyId);
  const records: ExcelExportRecord[] = eligible.map((record) => ({
    recordId: record.id,
    surveyDate: record.surveyDate,
    propertyName: record.property,
    addressLine1: property?.address ?? record.property,
    town: "",
    postcode: property?.postcode ?? "",
    unitName: record.unit,
    flatType: record.flatType,
    floor: record.floor,
    component: record.component,
    element: record.element,
    constructionType: record.construction,
    defect: record.defect,
    defectCause: record.defectCause,
    defectNotes: record.defectNotes,
    condition: record.condition,
    priority: record.priority,
    planningHorizon: record.planningHorizon,
    remainingLife: record.remainingLife,
    replacementYear: record.replacementYear,
    recommendedWorks: record.recommendedWorks,
  }));
  return { scope: selection.scope, propertyName: records[0].propertyName, unitName: selection.scope === "unit" ? records[0].unitName : undefined, records };
}

async function fetchCompletedSurveys(supabase: SupabaseClient, organizationId: string, selection: ExcelExportSelection) {
  if (selection.surveyId) {
    const { data, error } = await supabase.from("surveys").select("id,unit_id,property_id,inspection_date,completed_at,created_at,status")
      .eq("organization_id", organizationId).eq("id", selection.surveyId).eq("status", "completed").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ExcelExportNotFoundError("The completed survey could not be found");
    return [data];
  }

  if (selection.scope === "unit") {
    const { data: unit, error: unitError } = await supabase.from("units").select("id,property_id").eq("organization_id", organizationId)
      .eq("id", selection.unitId!).eq("property_id", selection.propertyId!).maybeSingle();
    if (unitError) throw new Error(unitError.message);
    if (!unit) throw new ExcelExportNotFoundError("The selected unit could not be found");
    const { data, error } = await supabase.from("surveys").select("id,unit_id,property_id,inspection_date,completed_at,created_at,status")
      .eq("organization_id", organizationId).eq("property_id", selection.propertyId!).eq("unit_id", selection.unitId!)
      .eq("status", "completed").order("inspection_date", { ascending: false }).order("completed_at", { ascending: false })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ExcelExportNotFoundError("This unit does not have a completed survey");
    return [data];
  }

  const surveys: any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase.from("surveys").select("id,unit_id,property_id,inspection_date,completed_at,created_at,status")
      .eq("organization_id", organizationId).eq("property_id", selection.propertyId!).eq("status", "completed")
      .order("inspection_date", { ascending: false }).order("completed_at", { ascending: false }).order("created_at", { ascending: false })
      .order("id", { ascending: false }).range(start, start + pageSize - 1);
    if (error) throw new Error(error.message);
    surveys.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  const latest = latestCompletedSurveyPerUnit(surveys);
  if (!latest.length) throw new ExcelExportNotFoundError("This property does not have any completed surveys");
  return latest;
}

async function fetchSurveyElements(supabase: SupabaseClient, organizationId: string, surveyIds: string[]) {
  const rows: any[] = [];
  const surveyChunkSize = 100;
  const pageSize = 1000;
  for (let chunkStart = 0; chunkStart < surveyIds.length; chunkStart += surveyChunkSize) {
    const ids = surveyIds.slice(chunkStart, chunkStart + surveyChunkSize);
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase.from("survey_elements").select(`
        id,survey_id,custom_component_name,custom_element_name,construction_type,construction_notes,installation_year,typical_life_years,
        life_reference,remaining_life,replacement_year,planning_horizon,recommended_works,general_notes,access_limitations,further_investigation,status,
        component_categories(name),elements(name),defect_findings(id,defect_type_label,cause,condition,priority,notes)
      `).eq("organization_id", organizationId).in("survey_id", ids).eq("status", "completed").order("id").range(start, start + pageSize - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
  }
  return rows;
}

export async function loadExcelExportData(supabase: SupabaseClient | null, organizationId: string, selection: ExcelExportSelection): Promise<ExcelExportInput> {
  if (!supabase) return demoExport(selection);
  const surveys = await fetchCompletedSurveys(supabase, organizationId, selection);
  const propertyId = surveys[0].property_id;
  if (selection.propertyId && selection.propertyId !== propertyId) throw new ExcelExportNotFoundError("The survey does not belong to the selected property");

  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("id,name,address_line_1,address_line_2,town,postcode").eq("organization_id", organizationId).eq("id", propertyId).maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new ExcelExportNotFoundError("The selected property could not be found");

  const unitIds = [...new Set(surveys.map((survey) => survey.unit_id))];
  const units: any[] = [];
  for (let start = 0; start < unitIds.length; start += 100) {
    const { data, error } = await supabase.from("units").select("id,name,flat_type,floor,property_id").eq("organization_id", organizationId)
      .eq("property_id", propertyId).in("id", unitIds.slice(start, start + 100));
    if (error) throw new Error(error.message);
    units.push(...(data ?? []));
  }
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const surveyById = new Map(surveys.map((survey) => [survey.id, survey]));
  const elements = await fetchSurveyElements(supabase, organizationId, surveys.map((survey) => survey.id));
  const records: ExcelExportRecord[] = [];

  for (const element of elements) {
    const survey = surveyById.get(element.survey_id);
    const unit = survey && unitById.get(survey.unit_id);
    if (!survey || !unit) continue;
    const category = relationOne(element.component_categories)?.name ?? element.custom_component_name ?? "Custom component";
    const elementName = relationOne(element.elements)?.name ?? element.custom_element_name ?? "Custom element";
    const findings = Array.isArray(element.defect_findings) ? element.defect_findings : [];
    const findingRows = findings.length ? findings : [null];
    for (const finding of findingRows) {
      records.push({
        recordId: finding?.id ?? element.id,
        surveyDate: survey.inspection_date,
        propertyName: property.name,
        addressLine1: property.address_line_1,
        addressLine2: property.address_line_2,
        town: property.town,
        postcode: property.postcode,
        unitName: unit.name,
        flatType: unit.flat_type,
        floor: unit.floor,
        component: category,
        element: elementName,
        constructionType: element.construction_type,
        constructionNotes: element.construction_notes,
        defect: finding ? finding.defect_type_label?.trim() || "Defect recorded" : null,
        defectCause: finding?.cause,
        defectNotes: finding?.notes,
        condition: finding?.condition,
        priority: finding?.priority,
        planningHorizon: element.planning_horizon,
        lifeReference: element.life_reference,
        typicalLifeYears: element.typical_life_years,
        installationYear: element.installation_year,
        remainingLife: element.remaining_life,
        replacementYear: element.replacement_year,
        recommendedWorks: element.recommended_works,
        generalNotes: element.general_notes,
        accessLimitations: element.access_limitations,
        furtherInvestigation: element.further_investigation,
      });
    }
  }
  records.sort((a, b) => `${a.unitName}\u0000${a.component}\u0000${a.element}\u0000${a.defect ?? ""}`.localeCompare(`${b.unitName}\u0000${b.component}\u0000${b.element}\u0000${b.defect ?? ""}`));
  if (!records.length) throw new ExcelExportNotFoundError("The completed survey does not contain any completed element assessments");
  return { scope: selection.scope, propertyName: property.name, unitName: selection.scope === "unit" ? records[0].unitName : undefined, records };
}
