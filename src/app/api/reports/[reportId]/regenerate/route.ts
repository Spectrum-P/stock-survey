import { after, NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { dispatchReadyReportJobs, reportWorkerHealth } from "@/lib/reporting/queue";

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const reportId = (await params).reportId;
  const body = await request.json().catch(() => ({}));
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true, status: "queued" }, { status: 202 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const workerHealth = reportWorkerHealth();
  if (!workerHealth.ready) return jsonError("Report generation is unavailable because the worker is not configured", 503, { missing: workerHealth.missing });
  const { data: report, error: reportError } = await context.supabase!.from("reports").select("id,scope_type,survey_id,property_id,generation_status").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (reportError || !report) return jsonError("Report not found", 404);
  if (["queued", "preparing", "generating", "assembling"].includes(report.generation_status)) return jsonError("This report already has an active generation job", 409);
  const runId = crypto.randomUUID();
  const { data: run, error: runError } = await context.supabase!.from("report_generation_runs").insert({ id: runId, organization_id: context.organizationId, report_id: reportId, request_id: crypto.randomUUID(), status: "queued", total_steps: 3, current_step: body.sectionKey ? `Regenerating ${body.sectionKey}` : "Queued" }).select("id").single();
  if (runError || !run) return jsonError("Could not create regeneration job", 500, { error: runError?.message });
  const sectionKey = typeof body.sectionKey === "string" ? body.sectionKey : undefined;
  const scope = report.scope_type === "survey" ? { kind: "survey", surveyId: report.survey_id, sectionKey } : report.scope_type === "property" ? { kind: "property", propertyId: report.property_id, sectionKey } : { kind: "portfolio", sectionKey };
  const { data: job, error: jobError } = await context.supabase!.from("report_generation_jobs").insert({ organization_id: context.organizationId, report_id: reportId, run_id: run.id, scope, status: "queued" }).select("id").single();
  if (jobError || !job) return jsonError("Could not queue regeneration", 500, { error: jobError?.message });
  await context.supabase!.from("reports").update({ status: "generating", generation_status: "queued", review_status: "draft", progress: 0, current_step: "Queued for regeneration", updated_at: new Date().toISOString() }).eq("id", reportId).eq("organization_id", context.organizationId);
  after(async () => { await dispatchReadyReportJobs({ organizationId: context.organizationId, jobId: job.id, limit: 1 }).catch(() => undefined); });
  return NextResponse.json({ ok: true, reportId, runId: run.id, status: "queued" }, { status: 202 });
}
