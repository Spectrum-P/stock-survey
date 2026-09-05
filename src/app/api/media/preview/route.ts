import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

export async function GET(request: Request) {
  const context = await requestContext(request);
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 20);
  if (context.demo) return NextResponse.json({ urls: {} });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  if (!ids.length) return NextResponse.json({ urls: {} });

  const { data: media, error } = await context.supabase!.from("media").select("id,storage_path").eq("organization_id", context.organizationId).in("id", ids);
  if (error) return jsonError(error.message, 500);
  const paths = (media ?? []).map((item) => item.storage_path);
  if (!paths.length) return NextResponse.json({ urls: {} });
  const { data: signed, error: signedError } = await context.supabase!.storage.from("survey-media").createSignedUrls(paths, 3600);
  if (signedError) return jsonError(signedError.message, 500);
  const signedByPath = new Map((signed ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
  const urls = Object.fromEntries((media ?? []).flatMap((item) => {
    const url = signedByPath.get(item.storage_path);
    return url ? [[item.id, url]] : [];
  }));
  return NextResponse.json({ urls });
}
