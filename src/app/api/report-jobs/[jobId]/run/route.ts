import { after, NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { dispatchReadyReportJobs, publicWorkerHealth } from "@/lib/reporting/queue";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const worker = publicWorkerHealth();
  if (!worker.ready) return jsonError(worker.message, 503);
  const { data: existing, error } = await context.supabase!.from("report_generation_jobs").select("id,report_id,run_id,scope,status").eq("id", jobId).eq("organization_id", context.organizationId).maybeSingle();
  if (error || !existing) return jsonError("Report job not found", 404);
  let dispatchJobId = existing.id;
  if (existing.status === "failed") {
    const { data: activeJobs } = await context.supabase!.from("report_generation_jobs").select("id").eq("report_id", existing.report_id).in("status", ["queued", "processing"]).limit(1);
    if (activeJobs?.length) return jsonError("This report already has an active generation job", 409);
    const runId = crypto.randomUUID();
    const { data: run, error: runError } = await context.supabase!.from("report_generation_runs").insert({ id: runId, organization_id: context.organizationId, report_id: existing.report_id, request_id: crypto.randomUUID(), status: "queued", total_steps: 3, current_step: "Queued for retry" }).select("id").single();
    if (runError || !run) return jsonError("Could not create retry run", 500, { error: runError?.message });
    const { data: job, error: jobError } = await context.supabase!.from("report_generation_jobs").insert({ organization_id: context.organizationId, report_id: existing.report_id, run_id: run.id, scope: existing.scope, status: "queued", available_at: new Date().toISOString() }).select("id").single();
    if (jobError || !job) {
      await context.supabase!.from("report_generation_runs").update({ status: "failed", error: { message: "Could not create retry job" }, completed_at: new Date().toISOString() }).eq("id", run.id).eq("organization_id", context.organizationId);
      return jsonError("Could not create retry job", 500, { error: jobError?.message });
    }
    dispatchJobId = job.id;
    await context.supabase!.from("reports").update({ status: "generating", generation_status: "queued", review_status: "draft", progress: 0, current_step: "Queued for retry", error_message: null, updated_at: new Date().toISOString() }).eq("id", existing.report_id).eq("organization_id", context.organizationId);
  } else if (existing.status === "queued") {
    await context.supabase!.from("report_generation_jobs").update({ available_at: new Date().toISOString(), locked_at: null, last_error: null }).eq("id", existing.id).eq("organization_id", context.organizationId);
    await context.supabase!.from("reports").update({ error_message: null, current_step: "Queued for immediate processing", updated_at: new Date().toISOString() }).eq("id", existing.report_id).eq("organization_id", context.organizationId);
  } else if (existing.status === "processing") {
    return jsonError("This job is already processing", 409);
  } else {
    return jsonError("Completed jobs do not need to be run again", 409);
  }
  after(async () => { await dispatchReadyReportJobs({ organizationId: context.organizationId, jobId: dispatchJobId, limit: 1 }).catch(() => undefined); });
  return NextResponse.json({ accepted: true, jobId: dispatchJobId }, { status: 202 });
}
