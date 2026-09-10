import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const schema = z.object({ unitName: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/, "Use letters, numbers and spaces only for the flat name") });

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Enter a valid new flat name", 422, parsed.error.flatten());
  const { surveyId } = await params;
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ unitId: crypto.randomUUID(), surveyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, { status: 201 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);

  const { data: source, error: sourceError } = await context.supabase!.from("surveys").select("id,property_id,inspection_date,status,units(name,flat_type,floor),survey_elements(category_id,element_id,custom_component_name,custom_element_name,accessibility,accessibility_reason,construction_type,construction_notes,installation_year,typical_life_years,life_reference,remaining_life,replacement_year,replacement_year_provided,planning_horizon,planning_override_reason,estimated_cost,cost_basis,recommended_works,general_notes,access_limitations,further_investigation,status,defect_findings(defect_type_id,defect_type_label,cause,condition,priority,notes))").eq("id", surveyId).eq("organization_id", context.organizationId).maybeSingle();
  if (sourceError || !source) return jsonError("Completed survey not found", 404);
  if (source.status !== "completed") return jsonError("Only completed flats can be duplicated", 409);

  const sourceUnit = Array.isArray(source.units) ? source.units[0] : source.units;
  const unitId = crypto.randomUUID();
  const newSurveyId = crypto.randomUUID();
  const { error: unitError } = await context.supabase!.from("units").insert({ id: unitId, organization_id: context.organizationId, property_id: source.property_id, name: parsed.data.unitName, reference: null, flat_type: sourceUnit?.flat_type ?? null, floor: sourceUnit?.floor ?? null });
  if (unitError) return jsonError(unitError.code === "23505" ? "A flat with that name already exists at this property" : unitError.message, unitError.code === "23505" ? 409 : 500);
  const { error: surveyError } = await context.supabase!.from("surveys").insert({ id: newSurveyId, organization_id: context.organizationId, property_id: source.property_id, unit_id: unitId, inspection_date: new Date().toISOString().slice(0, 10), surveyor_id: context.user.id, status: "in_progress" });
  if (surveyError) return jsonError(surveyError.message, 500);

  const elements = (source.survey_elements ?? []) as Array<Record<string, unknown>>;
  for (const sourceElement of elements) {
    const elementId = crypto.randomUUID();
    const { defect_findings, ...element } = sourceElement;
    const { error: elementError } = await context.supabase!.from("survey_elements").insert({ ...element, id: elementId, organization_id: context.organizationId, survey_id: newSurveyId, updated_by: context.user.id, version: 0 });
    if (elementError) return jsonError(elementError.message, 500);
    const findings = (defect_findings ?? []) as Array<Record<string, unknown>>;
    if (findings.length) {
      const { error: findingsError } = await context.supabase!.from("defect_findings").insert(findings.map((finding) => ({ ...finding, id: crypto.randomUUID(), organization_id: context.organizationId, survey_element_id: elementId, version: 0 })));
      if (findingsError) return jsonError(findingsError.message, 500);
    }
  }
  await context.supabase!.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.user.id, entity_type: "survey", entity_id: newSurveyId, action: "duplicate_completed_flat", payload: { sourceSurveyId: surveyId, sourceUnit: sourceUnit?.name, newUnit: parsed.data.unitName } });
  return NextResponse.json({ unitId, surveyId: newSurveyId }, { status: 201 });
}
