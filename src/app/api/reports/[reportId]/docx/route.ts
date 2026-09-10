import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { jsonError, requestContext } from "@/lib/api";
import { reportDocumentSchema } from "@/lib/schemas";
import type { ReportDocument } from "@/lib/types";

const navy = "172033"; const blue = "165DAD"; const green = "397047"; const muted = "5D687A"; const pale = "EEF4F8"; const line = "D9E1E8";
const borders = { top: { style: BorderStyle.SINGLE, size: 4, color: line }, bottom: { style: BorderStyle.SINGLE, size: 4, color: line }, left: { style: BorderStyle.SINGLE, size: 4, color: line }, right: { style: BorderStyle.SINGLE, size: 4, color: line } };

function paragraph(value: string, options: { bold?: boolean; color?: string; size?: number; after?: number; before?: number; pageBreak?: boolean } = {}) {
  return new Paragraph({ pageBreakBefore: options.pageBreak, spacing: { after: options.after ?? 140, before: options.before }, children: [new TextRun({ text: value || "Information was not available within the survey dataset.", bold: options.bold, color: options.color ?? navy, size: options.size })] });
}
function section(title: string) { return new Paragraph({ pageBreakBefore: true, border: { top: { style: BorderStyle.SINGLE, size: 6, color: line, space: 12 } }, spacing: { before: 280, after: 150 }, children: [new TextRun({ text: title, bold: true, color: blue, size: 30 })] }); }
function cell(value: string, header = false, shaded = false) { return new TableCell({ borders, shading: header ? { type: ShadingType.CLEAR, color: blue, fill: blue } : shaded ? { type: ShadingType.CLEAR, color: pale, fill: pale } : undefined, margins: { top: 90, bottom: 90, left: 120, right: 120 }, verticalAlign: "center", children: [new Paragraph({ children: [new TextRun({ text: value, bold: header, color: header ? "FFFFFF" : navy, size: 18 })] })] }); }
function table(headers: string[], rows: string[][]) { return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [new TableRow({ tableHeader: true, children: headers.map((item) => cell(item, true)) }), ...rows.map((row, index) => new TableRow({ children: row.map((item) => cell(item, false, index % 2 === 1)) }))] }); }

type Photo = { caption: string; image?: Buffer; type?: "png" | "jpg" };
function reportChildren(report: ReportDocument, title: string, draft: boolean, photos: Photo[]) {
  const list = (items: string[]) => items.length ? items.map((item) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 100 }, children: [new TextRun({ text: item, color: navy, size: 20 })] })) : [paragraph("")];
  const components = report.componentSections.flatMap((component) => [section(component.component), paragraph(component.narrative), table(["Element", "Assessment", "Findings"], component.elements.map((element) => [element.element, `${element.construction || "Construction not recorded"}\nCondition ${element.condition || "not recorded"} · Priority ${element.priority || "not recorded"}${element.estimatedCost !== undefined ? ` · £${element.estimatedCost.toLocaleString("en-GB")}` : ""}`, `${element.narrative || `${element.element} was assessed. No further narrative was recorded.`}\n${element.defects.length ? `Defects: ${element.defects.join(", ")}` : "No defects were recorded."}${element.recommendedWorks ? `\nWorks: ${element.recommendedWorks}` : ""}`]))]);
  return [
    new Paragraph({ spacing: { after: 420 }, border: { bottom: { style: BorderStyle.SINGLE, size: 20, color: blue, space: 1 } }, children: [] }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "STOCK CONDITION SURVEY", bold: true, color: green, size: 18, characterSpacing: 80 })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [new TextRun({ text: title, bold: true, color: navy, size: 48 })] }),
    paragraph(`${report.metadata.clientName || "Client not recorded"} · ${report.metadata.reportDate || "Date not recorded"}`, { color: muted, size: 20, after: 260 }),
    ...(draft ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: "DRAFT – NOT APPROVED", bold: true, color: "C62828", size: 20 })] })] : []),
    section("Contents"), ...["Executive summary", "Introduction", "Methodology", "Scope and limitations", "Stock profile", "Data quality", "Overall stock condition", "Priority and risk", "Component findings", "Lifecycle schedule", "Planned maintenance", "Recommendations", "Photo schedule"].map((item, index) => paragraph(`${index + 1}. ${item}`, { color: muted, size: 20, after: 70 })),
    section("Executive summary"), paragraph(report.executiveSummary), section("Introduction"), paragraph(report.introduction), section("Methodology"), paragraph(report.methodology), section("Scope and limitations"), ...list(report.limitations),
    section("Stock profile"), table(["Item", "Value"], Object.entries(report.stockProfile).map(([key, value]) => [key, String(value)])),
    ...(report.dataQualityIssues.length ? [section("Data quality"), ...list(report.dataQualityIssues)] : []),
    section("Overall stock condition"), table(["Condition", "Count", "Percentage"], report.conditionSummary.map((row) => [row.label, String(row.count), `${row.percentage}%`])),
    section("Priority and risk"), table(["Priority", "Count", "Percentage"], report.prioritySummary.map((row) => [row.label, String(row.count), `${row.percentage}%`])),
    ...components,
    section("Lifecycle schedule"), table(["Element", "Remaining life", "Replacement year", "Horizon"], report.lifecycleSchedule.map((row) => [row.element, row.remainingLife?.toString() ?? "Not recorded", row.replacementYear?.toString() ?? "Not recorded", row.horizon ?? "Not recorded"])),
    section("Planned maintenance"), paragraph(report.plannedMaintenance), section("Recommendations and conclusion"), ...list(report.recommendations), section("Photo schedule"),
    ...photos.flatMap((photo, index) => [photo.image ? new Paragraph({ spacing: { after: 80 }, children: [new ImageRun({ data: photo.image, transformation: { width: 340, height: 240 }, type: photo.type ?? "jpg" })] }) : null, paragraph(`Figure ${index + 1}: ${photo.caption || "Photograph caption not recorded"}`, { color: muted, size: 18, after: 200 })].filter(Boolean)),
  ].filter(Boolean) as Paragraph[];
}

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const context = await requestContext(request);
  if (context.demo) return jsonError("Connect Supabase to download a stored report", 503);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const reportId = (await params).reportId;
  const { data: record, error } = await context.supabase!.from("reports").select("id,status,review_status,title,structured_content,draft_content").eq("id", reportId).eq("organization_id", context.organizationId).single();
  if (error || !record) return jsonError("Report not found", 404);
  const approved = record.review_status === "approved" || record.status === "approved";
  if (!approved && new URL(request.url).searchParams.get("draft") !== "1") return jsonError("An approved report version is required", 403);
  let source: unknown = record.structured_content;
  if ((!source || Object.keys(source as object).length === 0) && record.draft_content) { try { source = JSON.parse(record.draft_content); } catch { source = null; } }
  const parsed = reportDocumentSchema.safeParse(source);
  if (!parsed.success) return jsonError("The report document is not ready for download", 409);
  const document = parsed.data as ReportDocument; const title = record.title ?? document.metadata.title ?? "Stock condition report";
  type RawPhoto = { media_id: string; caption?: string | null; media?: { storage_path?: string } | null };
  const { data: rawPhotos } = await context.supabase!.from("report_photos").select("media_id,caption,display_order,included,media(storage_path)").eq("report_id", reportId).eq("organization_id", context.organizationId).eq("included", true).order("display_order");
  const photos = (rawPhotos ?? []) as unknown as RawPhoto[]; const paths = photos.map((photo) => photo.media?.storage_path).filter((path): path is string => Boolean(path));
  const signed = paths.length ? await context.supabase!.storage.from("survey-media").createSignedUrls(paths, 600) : { data: [] };
  const urls = new Map((signed.data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
  const photoData = await Promise.all(photos.map(async (photo) => { const url = photo.media?.storage_path ? urls.get(photo.media.storage_path) : undefined; if (!url) return { caption: photo.caption ?? "" }; try { const response = await fetch(url); const type = response.headers.get("content-type")?.includes("png") ? "png" as const : "jpg" as const; return response.ok ? { caption: photo.caption ?? "", image: Buffer.from(await response.arrayBuffer()), type } : { caption: photo.caption ?? "" }; } catch { return { caption: photo.caption ?? "" }; } }));
  const output = new Document({ creator: "Stock Condition", title, description: "Stock condition survey report", styles: { default: { document: { run: { font: "Arial", size: 20, color: navy }, paragraph: { spacing: { line: 300 } } } } }, sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, color: muted, size: 16 })] })] }) }, children: reportChildren(document, title, !approved, photoData) }] });
  const buffer = await Packer.toBuffer(output);
  return new Response(new Uint8Array(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="stock-condition-${reportId}.docx"`, "cache-control": "private, no-store" } });
}
