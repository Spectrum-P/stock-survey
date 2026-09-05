import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");
  if (code && hasSupabaseConfig) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
  if (errorDescription) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url));
  const next = url.searchParams.get("next");
  return NextResponse.redirect(new URL(next?.startsWith("/") ? next : "/dashboard", request.url));
}
