import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ surveyId, status: "in_progress", savedElements: 1, acceptedElements: 1, incompleteElements: 0, findings: 0, photos: 0 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data, error } = await context.supabase!.from("surveys").select("id,status,survey_elements(id,status,defect_findings(id,condition,priority),media(id))").eq("id", surveyId).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Survey not found", 404);
  const elements = (data.survey_elements ?? []) as Array<{ status: string; defect_findings?: Array<unknown>; media?: Array<unknown> }>;
  return NextResponse.json({ surveyId: data.id, status: data.status, savedElements: elements.filter((item) => item.status !== "not_started").length, acceptedElements: elements.filter((item) => ["completed", "not_applicable", "inaccessible"].includes(item.status)).length, incompleteElements: elements.filter((item) => !["completed", "not_applicable", "inaccessible"].includes(item.status)).length, findings: elements.reduce((sum, item) => sum + (item.defect_findings?.length ?? 0), 0), photos: elements.reduce((sum, item) => sum + (item.media?.length ?? 0), 0) });
}

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const acknowledgedIncomplete = body.acknowledgedIncomplete === true || body.acknowledgedIncomplete === "true";
  const context = await requestContext(request);
  if (context.demo) return contentType.includes("application/json") ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL(`/surveys/${surveyId}/workspace?completed=true`, request.url));
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { count } = await context.supabase!.from("survey_elements").select("id", { count: "exact", head: true }).eq("survey_id", surveyId).neq("status", "not_started");
  if (!count) return jsonError("Save at least one element before completing the survey", 422);
  const { error } = await context.supabase!.from("surveys").update({ status: "completed", completed_at: new Date().toISOString(), completed_by: context.user.id, completion_acknowledged_incomplete: acknowledgedIncomplete }).eq("id", surveyId).eq("organization_id", context.organizationId);
  if (error) return jsonError(error.message, 500);
  await context.supabase!.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.user.id, entity_type: "survey", entity_id: surveyId, action: "complete", payload: { acknowledgedIncomplete } });
  return contentType.includes("application/json") ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL(`/surveys/${surveyId}/workspace?completed=true`, request.url));
}
