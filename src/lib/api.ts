import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function requestContext(request?: Request) {
  if (!hasSupabaseConfig) return { demo: true as const, supabase: null, user: null, organizationId: "00000000-0000-4000-8000-000000000001" };
  const authorization = request?.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim();
  const supabase = await createSupabaseServerClient(accessToken);
  const { data: { user }, error: authError } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser();
  if (authError) return { demo: false as const, supabase, user: null, organizationId: null };
  if (!user) return { demo: false as const, supabase, user: null, organizationId: null };
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  return { demo: false as const, supabase, user, organizationId: profile?.organization_id ?? null };
}
