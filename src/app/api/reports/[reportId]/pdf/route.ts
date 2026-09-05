import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { jsonError, requestContext } from "@/lib/api";
import { reportDocumentSchema } from "@/lib/schemas";
import type { ReportDocument } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", color: "#172033", fontSize: 10, lineHeight: 1.5 },
  band: { height: 8, backgroundColor: "#165DAD", marginBottom: 28 },
  eyebrow: { color: "#397047", fontSize: 9, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  meta: { color: "#5D687A", marginBottom: 24 },
  section: { borderTopWidth: 1, borderTopColor: "#D9E1E8", paddingTop: 16, marginTop: 18 },
  heading: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#165DAD", marginBottom: 8 },
  subheading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 5 },
  body: { whiteSpace: "pre-wrap" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 5 },
  cell: { flex: 1 },
  small: { fontSize: 8, color: "#5D687A" },
  photo: { width: 220, height: 155, objectFit: "cover", marginBottom: 5 },
  watermark: { position: "absolute", top: 350, left: 80, transform: "rotate(-28deg)", color: "#C6282830", fontSize: 28, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, color: "#5D687A", fontSize: 8, flexDirection: "row", justifyContent: "space-between" },
});

function PdfDocument({ document, title, draft, photoUrls }: { document: ReportDocument; title: string; draft: boolean; photoUrls: Record<string, string> }) {
  const section = (heading: string, content: string) => React.createElement(View, { style: styles.section, break: true }, React.createElement(Text, { style: styles.heading }, heading), React.createElement(Text, { style: styles.body }, content || "Information was not available within the survey dataset."));
  const componentSections = document.componentSections.map((component) => {
    const elements = component.elements.map((element) => React.createElement(View, { key: element.surveyElementId, style: styles.row },
      React.createElement(View, { style: styles.cell }, React.createElement(Text, null, element.element), React.createElement(Text, { style: styles.small }, `${element.construction || "Construction not recorded"} · Condition ${element.condition || "not recorded"} · Priority ${element.priority || "not recorded"}${element.estimatedCost !== undefined ? ` · £${element.estimatedCost.toLocaleString("en-GB")}` : ""}`)),
      React.createElement(View, { style: styles.cell }, React.createElement(Text, null, element.defects.length ? element.defects.join(", ") : "No defect information recorded"), element.recommendedWorks ? React.createElement(Text, { style: styles.small }, `Works: ${element.recommendedWorks}`) : null)));
    return React.createElement(View, { key: component.component, style: styles.section, break: true }, React.createElement(Text, { style: styles.heading }, component.component), React.createElement(Text, { style: styles.body }, component.narrative), ...elements);
  });
  const photoSection = React.createElement(View, { key: "photos", style: styles.section, break: true }, React.createElement(Text, { style: styles.heading }, "Photo schedule"), ...document.photoSchedule.filter((photo) => photo.included).map((photo, index) => React.createElement(View, { key: photo.id, wrap: false }, photoUrls[photo.mediaId] ? React.createElement(Image, { src: photoUrls[photo.mediaId], style: styles.photo }) : null, React.createElement(Text, { style: styles.small }, `Figure ${index + 1}: ${photo.caption || "Photograph caption not recorded"}`))));
  const children = [
    draft ? React.createElement(Text, { key: "watermark", style: styles.watermark }, "DRAFT – NOT APPROVED") : null,
    React.createElement(View, { key: "band", style: styles.band }), React.createElement(Text, { key: "eyebrow", style: styles.eyebrow }, "STOCK CONDITION SURVEY"), React.createElement(Text, { key: "title", style: styles.title }, title), React.createElement(Text, { key: "meta", style: styles.meta }, `${document.metadata.clientName || "Client not recorded"} · ${document.metadata.reportDate || "Date not recorded"}`),
    section("Contents", ["Executive summary", "Introduction", "Methodology", "Scope and limitations", "Stock profile", "Data quality", "Overall stock condition", "Component findings", "Lifecycle schedule", "Planned maintenance", "Recommendations", "Photo schedule"].map((item, index) => `${index + 1}. ${item}`).join("\n")),
    section("Executive summary", document.executiveSummary), section("Introduction", document.introduction), section("Methodology", document.methodology), section("Scope and limitations", document.limitations.join("\n")),
    section("Stock profile", Object.entries(document.stockProfile).map(([key, value]) => `${key}: ${value}`).join("\n")),
    document.dataQualityIssues.length ? section("Data quality", document.dataQualityIssues.join("\n")) : null,
    React.createElement(View, { key: "condition", style: styles.section, break: true }, React.createElement(Text, { style: styles.heading }, "Overall stock condition"), React.createElement(Text, { style: styles.body }, document.conditionSummary.map((row) => `${row.label}: ${row.count} (${row.percentage}%)`).join("\n")), React.createElement(Text, { style: styles.subheading }, "Priority summary"), React.createElement(Text, { style: styles.body }, document.prioritySummary.map((row) => `${row.label}: ${row.count} (${row.percentage}%)`).join("\n"))),
    ...componentSections,
    section("Lifecycle schedule", document.lifecycleSchedule.map((item) => `${item.element}: ${item.horizon ?? "Horizon not recorded"}${item.replacementYear ? ` · ${item.replacementYear}` : ""}`).join("\n")), section("Planned maintenance", document.plannedMaintenance), section("Recommendations and conclusion", document.recommendations.join("\n\n")),
    photoSection,
    React.createElement(View, { key: "footer", style: styles.footer, fixed: true }, React.createElement(Text, null, title), React.createElement(Text, { render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` }))
  ];
  return React.createElement(Document, null, React.createElement(Page, { size: "A4", style: styles.page }, ...children));
}

async function renderReport(request: Request, reportId: string, allowDraft: boolean) {
  const context = await requestContext(request);
  if (context.demo) return jsonError("Connect Supabase to render a stored report", 503);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data: report, error } = await context.supabase!.from("reports").select("id,status,review_status,title,structured_content,draft_content,scope_type").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (error || !report) return jsonError("Report not found", 404);
  const approved = report.review_status === "approved" || report.status === "approved";
  if (!allowDraft && !approved) return jsonError("An approved report version is required", 403);
  let document: unknown = report.structured_content;
  if ((!document || Object.keys(document as object).length === 0) && report.draft_content) { try { document = JSON.parse(report.draft_content); } catch { document = null; } }
  const parsed = reportDocumentSchema.safeParse(document);
  if (!parsed.success) return jsonError("The report document is not ready for rendering", 409);
  type PhotoRow = { media_id: string; media?: { storage_path?: string } | null };
  const { data: rawPhotos } = await context.supabase!.from("report_photos").select("media_id,caption,display_order,included,media(storage_path)").eq("report_id", reportId).eq("organization_id", context.organizationId).order("display_order");
  const photos = (rawPhotos ?? []) as unknown as PhotoRow[];
  const paths = photos.map((photo) => photo.media?.storage_path).filter((path): path is string => Boolean(path));
  const signed = paths.length ? await context.supabase!.storage.from("survey-media").createSignedUrls(paths, 600) : { data: [] };
  const byPath = new Map((signed.data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
  const photoUrls: Record<string, string> = {};
  for (const photo of photos) { const path = photo.media?.storage_path; const url = path ? byPath.get(path) : undefined; if (url) photoUrls[photo.media_id] = url; }
  const reportDocument = parsed.data as unknown as ReportDocument;
  const buffer = await renderToBuffer(React.createElement(PdfDocument, { document: reportDocument, title: report.title ?? reportDocument.metadata.title, draft: !approved, photoUrls }));
  return new Response(new Uint8Array(buffer), { headers: { "content-type": "application/pdf", "content-disposition": `${allowDraft && !approved ? "inline" : "attachment"}; filename="stock-condition-${reportId}.pdf"`, "cache-control": "private, no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) { return renderReport(request, (await params).reportId, new URL(request.url).searchParams.get("draft") === "1"); }
