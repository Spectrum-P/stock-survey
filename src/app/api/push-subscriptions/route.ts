import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

export async function POST(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const body = await request.json().catch(() => ({})) as SubscriptionBody;
  if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://") || typeof body.keys?.p256dh !== "string" || typeof body.keys.auth !== "string") {
    return jsonError("A valid push subscription is required", 422);
  }
  const { error } = await context.supabase!.from("push_subscriptions").upsert({
    user_id: context.user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return jsonError("Could not save notification subscription", 500);
  return NextResponse.json({ subscribed: true });
}

export async function DELETE(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const body = await request.json().catch(() => ({})) as SubscriptionBody;
  if (typeof body.endpoint !== "string") return jsonError("A push endpoint is required", 422);
  const { error } = await context.supabase!.from("push_subscriptions").delete().eq("user_id", context.user.id).eq("endpoint", body.endpoint);
  if (error) return jsonError("Could not remove notification subscription", 500);
  return NextResponse.json({ subscribed: false });
}
