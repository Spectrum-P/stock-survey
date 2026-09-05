import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ reportId, runId: "demo", status: "ready", completedSteps: 1, totalSteps: 1, progress: 100 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data, error } = await context.supabase!.from("reports").select("id,generation_status,progress,current_step,error_message,report_generation_runs(id,status,completed_steps,total_steps,current_step,error,created_at)").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (error || !data) return jsonError("Report not found", 404);
  const run = Array.isArray(data.report_generation_runs) ? data.report_generation_runs[0] : data.report_generation_runs;
  return NextResponse.json({ reportId, runId: run?.id, status: data.generation_status, progress: data.progress, currentStep: data.current_step ?? run?.current_step, completedSteps: run?.completed_steps ?? 0, totalSteps: run?.total_steps ?? 1, error: run?.error ?? data.error_message });
}
