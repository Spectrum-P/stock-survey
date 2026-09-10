import webPush from "web-push";
import { logReportEvent } from "@/lib/logger";

type PushClient = {
  from(table: string): {
    select(columns: string): { eq(column: string, value: string): PromiseLike<{ data: unknown; error: { message: string } | null }> };
    delete(): { eq(column: string, value: string): PromiseLike<unknown> };
  };
};

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

export async function notifyReportReady(supabase: PushClient, options: { requestId: string; reportId: string; userId?: string; title: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!options.userId || !publicKey || !privateKey || !subject) {
    logReportEvent("warn", "push.skipped", { requestId: options.requestId, reportId: options.reportId, reason: options.userId ? "VAPID is not configured" : "Report creator is unavailable" });
    return;
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  const { data, error } = await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", options.userId);
  if (error) {
    logReportEvent("error", "push.subscriptions_failed", { requestId: options.requestId, reportId: options.reportId, error: error.message });
    return;
  }
  const subscriptions = Array.isArray(data) ? data as SubscriptionRow[] : [];
  const payload = JSON.stringify({ title: "Report ready", body: options.title, url: `/reports/${options.reportId}`, reportId: options.reportId });
  const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
    } catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : undefined;
      if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      throw error;
    }
  }));
  const delivered = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - delivered;
  logReportEvent(failed ? "warn" : "info", "push.completed", { requestId: options.requestId, reportId: options.reportId, subscriptions: results.length, delivered, failed });
}
