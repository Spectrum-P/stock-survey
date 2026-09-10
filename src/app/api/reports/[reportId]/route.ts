import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { fallbackReportDocument } from "@/lib/reporting/document";

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const context = await requestContext(request);
  if (context.demo) {
    const document = fallbackReportDocument("Bishop Hall · Flat 01 stock condition survey report");
    document.metadata.clientName = "Stock Condition Survey Demo";
    document.executiveSummary = "This demonstration report is ready for manual review.";
    document.introduction = "The report demonstrates the structured review and approval workflow.";
    document.methodology = "The demonstration uses stored sample survey evidence.";
    return NextResponse.json({ id: reportId, status: "draft", generation_status: "ready", review_status: "draft", progress: 100, title: document.metadata.title, version: 1, document, sections: [], photos: [] });
  }
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const [{ data: report, error }, { data: sections }, { data: photos }] = await Promise.all([
    context.supabase!.from("reports").select("id,scope_type,survey_id,property_id,status,generation_status,review_status,progress,current_step,title,version,structured_content,draft_content,model_response,error_message,template_version,prompt_version,updated_at").eq("id", reportId).eq("organization_id", context.organizationId).single(),
    context.supabase!.from("report_sections").select("id,section_key,title,display_order,ai_content,edited_content,included,generation_status,reviewed_by,reviewed_at,version").eq("report_id", reportId).eq("organization_id", context.organizationId).order("display_order"),
    context.supabase!.from("report_photos").select("id,media_id,survey_element_id,section_key,caption,display_order,included").eq("report_id", reportId).eq("organization_id", context.organizationId).order("display_order"),
  ]);
  if (error || !report) return jsonError("Report not found", 404);
  let document = report.structured_content;
  if ((!document || Object.keys(document).length === 0) && report.draft_content) {
    try { document = JSON.parse(report.draft_content); } catch { document = { metadata: { title: report.title ?? "Stock condition report" }, executiveSummary: report.draft_content }; }
  }
  // Reports generated before structured content was introduced stored their output
  // in model_response. Keep those reports readable instead of presenting a blank
  // document/error state when a surveyor returns to them.
  if ((!document || Object.keys(document).length === 0) && report.model_response) {
    const legacy = report.model_response as unknown;
    document = typeof legacy === "object" && legacy !== null && !Array.isArray(legacy)
      ? legacy
      : { metadata: { title: report.title ?? "Stock condition report" }, executiveSummary: String(legacy) };
  }
  if (!document || Object.keys(document).length === 0) document = fallbackReportDocument(report.title ?? "Stock condition report");
  return NextResponse.json({ ...report, document, sections: sections ?? [], photos: photos ?? [] });
}
