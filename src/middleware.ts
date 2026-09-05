import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const session = await updateSession(request);
  const response = session.response;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return response;

  const publicPath = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup" || request.nextUrl.pathname === "/forgot-password" || request.nextUrl.pathname === "/reset-password" || request.nextUrl.pathname === "/manifest.webmanifest" || request.nextUrl.pathname === "/offline.html" || request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname.startsWith("/api/");
  const user = session.user;
  if (!user && !publicPath) { const redirect = request.nextUrl.clone(); redirect.pathname = "/login"; return NextResponse.redirect(redirect); }
  if (user && ["/login", "/signup"].includes(request.nextUrl.pathname)) { const redirect = request.nextUrl.clone(); redirect.pathname = "/dashboard"; return NextResponse.redirect(redirect); }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
