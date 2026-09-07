import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

export async function POST(request: Request) {
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true, path: "demo/photo.jpg" });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const form = await request.formData();
  const file = form.get("file");
  const surveyId = String(form.get("surveyId") ?? "");
  const surveyElementId = String(form.get("surveyElementId") ?? "");
  const mediaId = String(form.get("id") ?? crypto.randomUUID());
  if (!(file instanceof File) || !surveyId || !surveyElementId) return jsonError("File, survey and element are required", 422);
  const extension = file.name.split(".").pop()?.toLowerCase();
  const inferredType = file.type || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" } as Record<string, string>)[extension ?? ""];
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (!allowedTypes.has(inferredType) || file.size > 15 * 1024 * 1024) return jsonError("Upload a JPG, PNG, HEIC, HEIF or WebP image up to 15 MB", 422);
  const { data: existingMedia } = await context.supabase!.from("media").select("id,storage_path").eq("id", mediaId).eq("organization_id", context.organizationId).maybeSingle();
  if (existingMedia) return NextResponse.json({ ok: true, id: existingMedia.id, path: existingMedia.storage_path, duplicate: true });
  const { data: survey } = await context.supabase!.from("surveys").select("property_id,unit_id").eq("id", surveyId).eq("organization_id", context.organizationId).single();
  if (!survey) return jsonError("Survey not found", 404);
  const { data: surveyElement } = await context.supabase!.from("survey_elements").select("id").eq("id", surveyElementId).eq("survey_id", surveyId).eq("organization_id", context.organizationId).single();
  if (!surveyElement) return jsonError("Survey element does not belong to this survey", 422);
  const findingId = String(form.get("findingId") ?? "").trim() || null;
  if (findingId) {
    const { data: finding } = await context.supabase!.from("defect_findings").select("id").eq("id", findingId).eq("survey_element_id", surveyElementId).eq("organization_id", context.organizationId).single();
    if (!finding) return jsonError("Finding does not belong to this survey element", 422);
  }
  const countQuery = context.supabase!.from("media").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("survey_element_id", surveyElementId);
  const { count } = findingId ? await countQuery.eq("finding_id", findingId) : await countQuery.is("finding_id", null);
  if ((count ?? 0) >= 4) return jsonError("A maximum of 4 photographs can be attached here", 422);
  const safeExtension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const path = `${context.organizationId}/${survey.property_id}/${survey.unit_id}/${surveyId}/${surveyElementId}/${mediaId}.${safeExtension}`;
  const { error: uploadError } = await context.supabase!.storage.from("survey-media").upload(path, file, { upsert: true, contentType: inferredType });
  if (uploadError) return jsonError(uploadError.message, 500);
  const { error } = await context.supabase!.from("media").insert({ id: mediaId, organization_id: context.organizationId, survey_id: surveyId, survey_element_id: surveyElementId, finding_id: findingId, storage_path: path, filename: file.name, content_type: inferredType, size_bytes: file.size, uploaded_by: context.user.id });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, id: mediaId, path });
}
