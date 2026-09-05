import { after, NextResponse } from "next/server";
import { reportGenerationSchema } from "@/lib/schemas";
import { jsonError, requestContext } from "@/lib/api";
import { createReportLogger, logReportEvent } from "@/lib/logger";
import { CLAUDE_PROMPT_VERSION } from "@/lib/reporting/claude-prompt";
import { dispatchReadyReportJobs, reportWorkerHealth } from "@/lib/reporting/queue";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const logger = createReportLogger(request.headers.get("x-request-id") ?? crypto.randomUUID(), startedAt);
  const body = await request.json().catch(() => ({}));
  const parsed = reportGenerationSchema.safeParse(body.scope ? body : { ...body, scope: body.surveyId ? { kind: "survey", surveyId: body.surveyId } : undefined, reportType: body.reportType ?? "stock_condition" });
  if (!parsed.success) return jsonError("A valid report scope is required", 422, parsed.error.flatten());
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ reportId: "demo-generated", status: "ready" }, { status: 202 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const workerHealth = reportWorkerHealth();
  if (!workerHealth.ready) return jsonError("Report generation is unavailable because the worker is not configured", 503, { missing: workerHealth.missing });

  const scope = parsed.data.scope;
  let scopeQuery = context.supabase!.from("surveys").select("id,property_id,units(name,properties(name))").eq("organization_id", context.organizationId).limit(1);
  if (scope.kind === "survey") scopeQuery = scopeQuery.eq("id", scope.surveyId);
  if (scope.kind === "property") scopeQuery = scopeQuery.eq("property_id", scope.propertyId);
  const { data: scopeRows, error: scopeError } = await scopeQuery;
  if (scopeError) return jsonError("Could not validate report scope", 500);
  if (!scopeRows?.length) return jsonError("No survey data found for this scope", 404);

  let activeQuery = context.supabase!.from("reports").select("id").eq("organization_id", context.organizationId).eq("scope_type", scope.kind).in("generation_status", ["queued", "preparing", "generating", "assembling"]).limit(1);
  if (scope.kind === "survey") activeQuery = activeQuery.eq("survey_id", scope.surveyId);
  if (scope.kind === "property") activeQuery = activeQuery.eq("property_id", scope.propertyId);
  const { data: activeReports } = await activeQuery;
  if (activeReports?.[0]) return NextResponse.json({ reportId: activeReports[0].id, status: "queued", duplicate: true }, { status: 202 });

  const requestHeader = request.headers.get("x-idempotency-key") ?? request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestId = isUuid(requestHeader) ? requestHeader : crypto.randomUUID();
  const { data: existingRun } = await context.supabase!.from("report_generation_runs").select("id,report_id,status").eq("organization_id", context.organizationId).eq("request_id", requestId).maybeSingle();
  if (existingRun) return NextResponse.json({ reportId: existingRun.report_id, runId: existingRun.id, status: existingRun.status === "completed" ? "ready" : "queued", requestId }, { status: 202 });

  const reportId = crypto.randomUUID();
  const propertyId = scope.kind === "property" ? scope.propertyId : scope.kind === "survey" ? scopeRows[0].property_id : null;
  const scopeUnit = Array.isArray(scopeRows[0].units) ? scopeRows[0].units[0] : scopeRows[0].units;
  const nestedProperty = scopeUnit && (Array.isArray(scopeUnit.properties) ? scopeUnit.properties[0] : scopeUnit.properties);
  const { data: directProperty } = propertyId ? await context.supabase!.from("properties").select("name").eq("id", propertyId).maybeSingle() : { data: null };
  const propertyName = directProperty?.name ?? nestedProperty?.name ?? "Property";
  const title = scope.kind === "portfolio" ? "Portfolio stock condition report" : scope.kind === "property" ? `${propertyName} stock condition report` : `${propertyName} · ${scopeUnit?.name ?? "Unit"} stock condition survey report`;
  const { error: reportError } = await context.supabase!.from("reports").insert({ id: reportId, organization_id: context.organizationId, survey_id: scope.kind === "survey" ? scope.surveyId : null, property_id: propertyId, scope_type: scope.kind, status: "generating", generation_status: "queued", review_status: "draft", progress: 0, current_step: "Waiting for worker", title, created_by: context.user.id, prompt_version: CLAUDE_PROMPT_VERSION, template_version: "stock-condition-a4-v1" });
  if (reportError) return jsonError("Could not create report record", 500, { requestId, error: reportError.message });
  const { data: run, error: runError } = await context.supabase!.from("report_generation_runs").insert({ organization_id: context.organizationId, report_id: reportId, request_id: requestId, status: "queued", total_steps: 3 }).select("id").single();
  if (runError || !run) { await context.supabase!.from("reports").delete().eq("id", reportId); return jsonError("Could not create report generation job", 500, { requestId, error: runError?.message }); }
  const { data: job, error: jobError } = await context.supabase!.from("report_generation_jobs").insert({ organization_id: context.organizationId, report_id: reportId, run_id: run.id, scope, status: "queued" }).select("id").single();
  if (jobError || !job) { await context.supabase!.from("reports").delete().eq("id", reportId); return jsonError("Could not queue report generation", 500, { requestId, error: jobError?.message }); }

  logger.info("job.queued", { reportId, runId: run.id, scopeType: scope.kind });
  logReportEvent("info", "report.queued", { requestId, reportId, runId: run.id, durationMs: Date.now() - startedAt });
  after(async () => {
    try { await dispatchReadyReportJobs({ organizationId: context.organizationId, jobId: job.id, limit: 1 }); }
    catch (error) { logReportEvent("error", "worker.invocation_failed", { requestId, reportId, error: error instanceof Error ? error.message : "Worker invocation failed" }); }
  });
  return NextResponse.json({ reportId, runId: run.id, status: "queued", requestId }, { status: 202, headers: { Location: `/reports/${reportId}` } });
}
