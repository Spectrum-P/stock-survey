import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const customElementSchema = z.object({ surveyId: z.string().uuid(), componentName: z.string().trim().min(1).max(120), elementName: z.string().trim().min(1).max(120) });

export async function POST(request: Request) {
  const parsed = customElementSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Custom element details are invalid", 422, parsed.error.flatten());
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ id: crypto.randomUUID(), ...parsed.data }, { status: 201 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { surveyId, componentName, elementName } = parsed.data;
  const { data: survey } = await context.supabase!.from("surveys").select("id").eq("id", surveyId).eq("organization_id", context.organizationId).maybeSingle();
  if (!survey) return jsonError("Survey not found", 404);
  const { data: category } = await context.supabase!.from("component_categories").select("id").eq("organization_id", context.organizationId).eq("name", componentName).maybeSingle();
  const id = crypto.randomUUID();
  const { error } = await context.supabase!.from("survey_elements").insert({ id, organization_id: context.organizationId, survey_id: surveyId, category_id: category?.id ?? null, element_id: null, custom_component_name: category ? null : componentName, custom_element_name: elementName, status: "not_started", version: 1 });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ id, surveyId, componentName, elementName }, { status: 201 });
}
