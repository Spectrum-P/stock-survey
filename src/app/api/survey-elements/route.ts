import { NextResponse } from "next/server";
import { surveyElementSchema } from "@/lib/schemas";
import { jsonError, requestContext } from "@/lib/api";

export async function PUT(request: Request) {
  const mutationId = request.headers.get("x-mutation-id") ?? crypto.randomUUID();
  const parsed = surveyElementSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Element validation failed", 422, parsed.error.flatten());
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true, version: parsed.data.version, mutationId });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);

  const existingMutation = await context.supabase!.from("audit_events").select("id").eq("mutation_id", mutationId).maybeSingle();
  if (existingMutation.data) return NextResponse.json({ ok: true, duplicate: true });
  const value = parsed.data;
  const { data: existing } = await context.supabase!.from("survey_elements").select("version").eq("id", value.id).maybeSingle();
  if (existing && existing.version !== value.version - 1) return jsonError("The server record changed while this device was offline", 409, { serverVersion: existing.version });
  const { data: category } = value.customComponentName ? { data: null } : await context.supabase!.from("component_categories").select("id").eq("name", value.category).eq("organization_id", context.organizationId).maybeSingle();
  const { data: element } = value.customElementName ? { data: null } : await context.supabase!.from("elements").select("id,category_id").eq("name", value.element).eq("organization_id", context.organizationId).maybeSingle();
  const { error } = await context.supabase!.from("survey_elements").upsert({ id: value.id, organization_id: context.organizationId, survey_id: value.surveyId, category_id: value.categoryId ?? category?.id ?? element?.category_id ?? null, element_id: value.elementId ?? element?.id ?? null, custom_component_name: value.customComponentName || null, custom_element_name: value.customElementName || null, accessibility: value.accessibility, accessibility_reason: value.accessibilityReason || null, construction_type: value.constructionType || null, construction_notes: value.constructionNotes || null, installation_year: value.installationYear ?? null, typical_life_years: value.typicalLifeYears ?? null, life_reference: value.lifeReference || null, remaining_life: value.remainingLife ?? null, replacement_year: value.replacementYear ?? null, planning_horizon: value.planningHorizon || null, planning_override_reason: value.planningOverrideReason || null, estimated_cost: value.estimatedCost ?? null, cost_basis: value.costBasis || null, recommended_works: value.recommendedWorks || null, general_notes: value.generalNotes || null, access_limitations: value.accessLimitations || null, further_investigation: value.furtherInvestigation, status: value.status, version: value.version, updated_by: context.user.id });
  if (error) return jsonError(error.message, 500);
  await context.supabase!.from("surveys").update({ status: "in_progress" }).eq("id", value.surveyId).eq("organization_id", context.organizationId).eq("status", "draft");
  await context.supabase!.from("defect_findings").delete().eq("survey_element_id", value.id);
  if (value.defects.length) {
    const { error: findingError } = await context.supabase!.from("defect_findings").insert(value.defects.map((finding) => ({ id: finding.id, organization_id: context.organizationId, survey_element_id: value.id, defect_type_label: finding.defectType.trim() || null, cause: finding.cause || null, condition: finding.condition, priority: finding.priority, notes: finding.notes || null })));
    if (findingError) return jsonError(findingError.message, 500);
  }
  await context.supabase!.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.user.id, entity_type: "survey_element", entity_id: value.id, action: "upsert", mutation_id: mutationId, payload: { version: value.version, status: value.status } });
  return NextResponse.json({ ok: true, version: value.version });
}
