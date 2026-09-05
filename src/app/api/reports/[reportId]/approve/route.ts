import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { reportApprovalSchema, reportDocumentSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const body = await request.json();
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ ok: true, status: "approved" });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const parsed = reportApprovalSchema.safeParse(body);
  if (!parsed.success) return jsonError("Approval request is invalid", 422, parsed.error.flatten());
  const { data: current, error: currentError } = await context.supabase!.from("reports").select("version,structured_content,review_status,generation_status").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (currentError || !current) return jsonError("Report not found", 404);
  if (current.version !== parsed.data.expectedVersion) return jsonError("The report changed since it was opened", 409, { serverVersion: current.version });
  if (current.generation_status !== "ready") return jsonError("Wait for report generation to finish", 409);
  if (!parsed.data.acknowledgedWarnings) return jsonError("Acknowledge the review warnings before approval", 422);
  if (!reportDocumentSchema.safeParse(current.structured_content).success) return jsonError("The report document is incomplete", 422);
  const now = new Date().toISOString();
  const nextVersion = current.version + 1;
  const { error } = await context.supabase!.from("reports").update({ status: "approved", review_status: "approved", approved_at: now, approved_by: context.user.id, version: nextVersion, updated_at: now }).eq("id", reportId).eq("organization_id", context.organizationId).eq("version", parsed.data.expectedVersion);
  if (error) return jsonError(error.message, 500);
  await context.supabase!.from("report_versions").insert({ organization_id: context.organizationId, report_id: reportId, version: nextVersion, document: current.structured_content, status: "approved", created_by: context.user.id, approved_by: context.user.id, approved_at: now });
  await context.supabase!.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.user.id, entity_type: "report", entity_id: reportId, action: "approve" });
  return NextResponse.json({ ok: true, status: "approved" });
}
