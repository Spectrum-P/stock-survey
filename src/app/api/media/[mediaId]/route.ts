import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

export async function DELETE(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { mediaId } = await params;
  const { data: media, error } = await context.supabase!.from("media").select("storage_path").eq("id", mediaId).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!media) return NextResponse.json({ ok: true });
  const { error: storageError } = await context.supabase!.storage.from("survey-media").remove([media.storage_path]);
  if (storageError) return jsonError(storageError.message, 500);
  const { error: deleteError } = await context.supabase!.from("media").delete().eq("id", mediaId).eq("organization_id", context.organizationId);
  if (deleteError) return jsonError(deleteError.message, 500);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { mediaId } = await params;
  const body = await request.json().catch(() => ({}));
  const update: { caption?: string | null } = {};
  if (body.caption !== undefined) update.caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) || null : null;
  if (!Object.keys(update).length) return jsonError("No media changes supplied", 422);
  const { data, error } = await context.supabase!.from("media").update(update).eq("id", mediaId).eq("organization_id", context.organizationId).select("id,caption").single();
  if (error || !data) return jsonError(error?.message ?? "Media not found", error ? 500 : 404);
  return NextResponse.json({ ok: true, media: data });
}
