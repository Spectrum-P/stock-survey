/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { processReportJob } from "@/lib/reporting/worker";

export function reportWorkerHealth() {
  const missing = [
    !process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    !process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : null,
  ].filter((value): value is string => Boolean(value));
  return { ready: missing.length === 0, missing };
}

export function publicWorkerHealth() {
  const health = reportWorkerHealth();
  return { ready: health.ready, message: health.ready ? "Report worker is configured" : "Report worker configuration is incomplete" };
}

export async function recoverStaleReportJobs(supabase: any, organizationId?: string) {
  const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
  let query = supabase.from("report_generation_jobs").update({ status: "queued", available_at: new Date().toISOString(), locked_at: null }).eq("status", "processing").lt("locked_at", staleBefore);
  if (organizationId) query = query.eq("organization_id", organizationId);
  await query;
}

export async function dispatchReadyReportJobs({ organizationId, limit = 5, jobId }: { organizationId?: string; limit?: number; jobId?: string } = {}) {
  const health = reportWorkerHealth();
  if (!health.ready) throw new Error(`Report worker configuration is incomplete: ${health.missing.join(", ")}`);
  const supabase = createSupabaseAdminClient();
  await recoverStaleReportJobs(supabase, organizationId);
  let query = supabase.from("report_generation_jobs").select("id").eq("status", "queued").lte("available_at", new Date().toISOString()).order("created_at").limit(Math.min(5, Math.max(1, limit)));
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (jobId) query = query.eq("id", jobId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  for (const job of data ?? []) await processReportJob(job.id);
  return { processed: data?.length ?? 0 };
}

export function reportErrorMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : undefined;
}
