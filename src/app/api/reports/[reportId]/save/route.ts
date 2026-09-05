import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { reportSaveSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const body = await request.json();
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  if (typeof body.content === "string") {
    if (body.content.trim().length < 20) return jsonError("Report content is required", 422);
    const { error } = await context.supabase!.from("reports").update({ draft_content: body.content, editor_changes: { savedAt: new Date().toISOString(), savedBy: context.user.id }, status: "draft", review_status: "draft", approved_at: null, approved_by: null, version: body.expectedVersion ? body.expectedVersion + 1 : undefined }).eq("id", reportId).eq("organization_id", context.organizationId);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true });
  }
  const parsed = reportSaveSchema.safeParse(body);
  if (!parsed.success) return jsonError("Report changes are invalid", 422, parsed.error.flatten());
  const value = parsed.data;
  const { data: current, error: currentError } = await context.supabase!.from("reports").select("version").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (currentError || !current) return jsonError("Report not found", 404);
  if (current.version !== value.expectedVersion) return jsonError("The report changed since it was opened", 409, { serverVersion: current.version });
  const nextVersion = current.version + 1;
  const { error } = await context.supabase!.from("reports").update({ title: value.metadata.title, structured_content: value.document, draft_content: JSON.stringify(value.document), editor_changes: { savedAt: new Date().toISOString(), savedBy: context.user.id }, status: "draft", review_status: "draft", generation_status: "ready", approved_at: null, approved_by: null, version: nextVersion, updated_at: new Date().toISOString() }).eq("id", reportId).eq("organization_id", context.organizationId).eq("version", value.expectedVersion);
  if (error) return jsonError(error.message, 500);
  if (value.sections?.length) await context.supabase!.from("report_sections").upsert(value.sections.map((section) => ({ id: section.id, organization_id: context.organizationId, report_id: reportId, section_key: section.sectionKey, title: section.title, ai_content: section.content, edited_content: section.content, included: section.included, version: section.version + 1, updated_at: new Date().toISOString() })), { onConflict: "id" });
  if (value.photos) await context.supabase!.from("report_photos").upsert(value.photos.map((photo) => ({ id: photo.id, organization_id: context.organizationId, report_id: reportId, media_id: photo.mediaId, survey_element_id: photo.surveyElementId, section_key: photo.sectionKey, caption: photo.caption, display_order: photo.displayOrder, included: photo.included })), { onConflict: "report_id,media_id" });
  await context.supabase!.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.user.id, entity_type: "report", entity_id: reportId, action: "save", payload: { version: nextVersion } });
  return NextResponse.json({ ok: true });
}
