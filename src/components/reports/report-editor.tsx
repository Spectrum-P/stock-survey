"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, DownloadSimple, FloppyDisk, PencilSimple, Printer, RefreshCw, SpinnerGap, WarningCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/client-api";
import type { ReportDocument, ReportMetadata } from "@/lib/types";
import { fallbackReportDocument, normalizeReportDocument } from "@/lib/reporting/document";
import { reportDocumentSchema } from "@/lib/schemas";
import Link from "next/link";

const sectionLabels: Array<[keyof ReportDocument, string]> = [
  ["metadata", "Report metadata"], ["executiveSummary", "Executive summary"], ["introduction", "Introduction"], ["methodology", "Methodology"],
  ["limitations", "Scope and limitations"], ["stockProfile", "Stock profile"], ["dataQualityIssues", "Data quality"],
  ["conditionSummary", "Overall stock condition"], ["prioritySummary", "Priority and risk"], ["componentSections", "Component findings"],
  ["lifecycleSchedule", "Lifecycle schedule"], ["plannedMaintenance", "Planned maintenance"], ["recommendations", "Recommendations"], ["photoSchedule", "Photo schedule"],
];

function toText(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? "";
}

export function ReportEditor({ reportId, initialStatus = "generating", initialGenerationStatus = "queued", propertyName = "Property", unitName = "Unit" }: { reportId: string; surveyId?: string; propertyId?: string; scopeType?: "survey" | "property" | "portfolio"; initialStatus?: "draft" | "approved" | "generating" | "failed"; initialGenerationStatus?: "queued" | "preparing" | "generating" | "assembling" | "ready" | "failed"; propertyName?: string; unitName?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [generationStatus, setGenerationStatus] = useState(initialGenerationStatus);
  const [progress, setProgress] = useState(initialGenerationStatus === "ready" ? 100 : 0);
  const [currentStep, setCurrentStep] = useState(initialGenerationStatus === "queued" ? "Waiting for worker" : "");
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [version, setVersion] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [activeSection, setActiveSection] = useState<keyof ReportDocument>("executiveSummary");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [structuredError, setStructuredError] = useState("");

  const load = useCallback(async () => {
    const response = await authenticatedFetch(`/api/reports/${reportId}`);
    if (!response.ok) { const failed = await response.json().catch(() => ({})); throw new Error(failed.error ?? "Could not load report"); }
    const payload: unknown = await response.json().catch(() => ({}));
    const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
    const nextStatus = body.status;
    setStatus(body.review_status === "approved" ? "approved" : nextStatus === "approved" || nextStatus === "generating" || nextStatus === "failed" || nextStatus === "draft" ? nextStatus : "draft");
    const nextGenerationStatus = body.generation_status;
    setGenerationStatus(nextGenerationStatus === "queued" || nextGenerationStatus === "preparing" || nextGenerationStatus === "generating" || nextGenerationStatus === "assembling" || nextGenerationStatus === "failed" || nextGenerationStatus === "ready" ? nextGenerationStatus : "ready");
    setProgress(typeof body.progress === "number" ? body.progress : 0);
    setCurrentStep(typeof body.current_step === "string" ? body.current_step : "");
    setError(typeof body.error_message === "string" ? body.error_message : "");
    setVersion(typeof body.version === "number" ? body.version : 1);
    const hasDocument = body.document && typeof body.document === "object" && !Array.isArray(body.document) && Object.keys(body.document as object).length > 0;
    const parsedDocument = reportDocumentSchema.safeParse(body.document);
    setDocument(hasDocument ? parsedDocument.success ? parsedDocument.data : normalizeReportDocument(body.document, typeof body.title === "string" ? body.title : "Stock condition report") : null);
  }, [reportId]);

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Could not load report")); }, [load]);
  useEffect(() => {
    const ids = document?.photoSchedule?.filter((photo) => photo.included).map((photo) => photo.mediaId) ?? [];
    if (!ids.length) { setPhotoUrls({}); return; }
    authenticatedFetch(`/api/media/preview?ids=${encodeURIComponent(ids.join(","))}`).then(async (response) => response.ok ? (await response.json()).urls ?? {} : {}).then(setPhotoUrls).catch(() => undefined);
  }, [document?.photoSchedule]);
  useEffect(() => {
    if (!["queued", "preparing", "generating", "assembling"].includes(generationStatus)) return;
    const timer = window.setInterval(() => { load().catch(() => undefined); }, 3000);
    return () => window.clearInterval(timer);
  }, [generationStatus, load]);

  const update = <K extends keyof ReportDocument>(key: K, value: ReportDocument[K]) => setDocument((current) => current ? { ...current, [key]: value } : current);
  const updateMetadata = (key: keyof ReportMetadata, value: string) => setDocument((current) => current ? { ...current, metadata: { ...normalizeReportDocument(current).metadata, [key]: value } } : current);

  async function save() {
    if (!document) return;
    if (structuredError) { setError("Fix the invalid JSON in the active section before saving."); return; }
    setBusy(true); setError("");
    try {
      const normalized = normalizeReportDocument(document);
      const response = await authenticatedFetch(`/api/reports/${reportId}/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: version, metadata: normalized.metadata, document: normalized }) });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409) throw new Error(`This report changed elsewhere. Reload before saving (server version ${body.details?.serverVersion ?? "newer"}).`);
      if (!response.ok) throw new Error(body.error ?? "Could not save report");
      setVersion((current) => current + 1); setSavedAt(new Date().toLocaleTimeString("en-GB"));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save report"); }
    finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(`/api/reports/${reportId}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: version, acknowledgedWarnings: true }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not approve report");
      setStatus("approved"); setVersion((current) => current + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not approve report"); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(`/api/reports/${reportId}/regenerate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sectionKey: activeSection }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Could not queue regeneration");
      setGenerationStatus("queued"); setProgress(0); setCurrentStep("Waiting for worker");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not queue regeneration"); }
    finally { setBusy(false); }
  }

  const printUrl = `/api/reports/${reportId}/pdf?draft=1`;
  const reportDocument = document ? normalizeReportDocument(document, "Stock condition report") : null;
  const reportMetadata = reportDocument?.metadata ?? fallbackReportDocument("Stock condition report").metadata;
  const reportTitle = reportMetadata.title ?? "Stock condition report";
  const activeValue = reportDocument?.[activeSection];
  const isNarrative = typeof activeValue === "string";
  const isMetadata = activeSection === "metadata";
  const canRegenerateSection = !["metadata", "stockProfile", "conditionSummary", "prioritySummary", "lifecycleSchedule", "photoSchedule"].includes(activeSection);

  const generationActive = ["queued", "preparing", "generating", "assembling"].includes(generationStatus);
  if (generationActive) return <Card className="p-6"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--brand)]"><SpinnerGap className="animate-spin" size={22} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{propertyName} · {unitName}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{currentStep || "Preparing report"}</p></div><Badge tone="blue">{generationStatus}</Badge></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${Math.max(3, progress)}%` }} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-muted)]"><span>{progress}% complete · This page refreshes automatically.</span><Link href="/reports/jobs" className="font-semibold text-[var(--brand)]">View report jobs</Link></div></div></div></Card>;
  if (!reportDocument) return <Card className="space-y-4 p-6"><div className="flex items-start gap-3"><WarningCircle className="text-[var(--orange)]" size={22} /><div><p className="font-semibold">The report document is not available</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{error || "Retry generation from the report jobs page."}</p></div></div><div className="flex gap-2"><Button onClick={regenerate} disabled={busy}>{busy ? "Queueing" : "Retry generation"}</Button><Link href="/reports/jobs" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold">View report jobs</Link></div></Card>;

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)] print:block">
    <Card className="overflow-hidden print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4"><div><div className="flex items-center gap-3"><h2 className="font-display font-semibold">Report review</h2><Badge tone={status === "approved" ? "green" : status === "failed" ? "orange" : "blue"}>{generationStatus === "ready" ? status : generationStatus}</Badge></div>{savedAt ? <p className="mt-1 text-xs text-[var(--ink-muted)]">Saved {savedAt}</p> : null}</div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={save} disabled={busy || status === "approved"}><FloppyDisk size={17} />Save</Button>{status !== "approved" ? <Button variant="success" onClick={approve} disabled={busy || generationStatus !== "ready"}><CheckCircle size={17} />Approve</Button> : null}</div></div>
      {generationStatus === "failed" ? <div className="border-b border-orange-200 bg-[var(--orange-soft)] px-5 py-4 text-sm"><p className="font-semibold text-[var(--orange)]">Generation failed; the survey-derived document remains available for review.</p><p className="mt-1 text-[var(--ink-muted)]">Retry from this page or open Report jobs for diagnostic details.</p></div> : null}
      {error ? <div className="m-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"><WarningCircle size={18} />{error}</div> : null}
      <div className="grid md:grid-cols-[190px_1fr]">
        <nav className="border-b border-[var(--line)] p-3 md:border-b-0 md:border-r" aria-label="Report sections">{sectionLabels.map(([key, label]) => <button key={key} type="button" onClick={() => { setActiveSection(key); setStructuredError(""); }} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${activeSection === key ? "bg-[var(--blue-soft)] font-semibold text-[var(--brand)]" : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"}`}>{label}{activeSection === key ? <PencilSimple size={14} /> : null}</button>)}</nav>
        <div className="min-w-0 space-y-5 p-5">
          <div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="report-title">Report title</label><input id="report-title" className="field mt-2" value={reportMetadata.title} onChange={(event) => updateMetadata("title", event.target.value)} disabled={status === "approved"} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="client">Client</label><input id="client" className="field mt-2" value={reportMetadata.clientName} onChange={(event) => updateMetadata("clientName", event.target.value)} disabled={status === "approved"} /></div><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="reference">Report reference</label><input id="reference" className="field mt-2" value={reportMetadata.reportReference} onChange={(event) => updateMetadata("reportReference", event.target.value)} disabled={status === "approved"} /></div></div>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{sectionLabels.find(([key]) => key === activeSection)?.[1]}</h3><p className="mt-1 text-xs text-[var(--ink-muted)]">{canRegenerateSection ? "AI-prefilled content remains editable until approval." : "This section is derived from stored survey evidence and remains manually editable."}</p></div><Button variant="secondary" size="sm" onClick={regenerate} disabled={busy || status === "approved" || !canRegenerateSection}><RefreshCw size={15} />{canRegenerateSection ? "Regenerate section" : "Survey-derived"}</Button></div>
          {isMetadata ? <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="report-date">Report date</label><input id="report-date" type="date" className="field mt-2" value={reportMetadata.reportDate} onChange={(event) => updateMetadata("reportDate", event.target.value)} disabled={status === "approved"} /></div><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="inspection-dates">Inspection dates</label><input id="inspection-dates" className="field mt-2" value={reportMetadata.inspectionDates.join(", ")} onChange={(event) => update("metadata", { ...reportMetadata, inspectionDates: event.target.value.split(",").map((date) => date.trim()).filter(Boolean) })} disabled={status === "approved"} placeholder="YYYY-MM-DD, YYYY-MM-DD" /></div><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="prepared-by">Prepared by</label><input id="prepared-by" className="field mt-2" value={reportMetadata.preparedBy} onChange={(event) => updateMetadata("preparedBy", event.target.value)} disabled={status === "approved"} /></div><div><label className="text-xs font-semibold text-[var(--ink-muted)]" htmlFor="checked-by">Checked by</label><input id="checked-by" className="field mt-2" value={reportMetadata.checkedBy} onChange={(event) => updateMetadata("checkedBy", event.target.value)} disabled={status === "approved"} /></div></div> : isNarrative ? <textarea className="field min-h-[360px] resize-y leading-7" value={String(activeValue ?? "")} onChange={(event) => update(activeSection, event.target.value as ReportDocument[typeof activeSection])} disabled={status === "approved"} /> : <StructuredContentEditor key={`${String(activeSection)}-${version}-${generationStatus}`} value={activeValue} label={`${String(activeSection)} structured content`} disabled={status === "approved"} onChange={(value) => update(activeSection, value as ReportDocument[typeof activeSection])} onValidityChange={setStructuredError} />}
          {reportDocument.dataQualityIssues.length ? <div className="rounded-xl border border-orange-200 bg-[var(--orange-soft)] p-4 text-sm"><p className="font-semibold text-[var(--orange)]">Review warnings</p><ul className="mt-2 list-disc space-y-1 pl-5">{reportDocument.dataQualityIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
        </div>
      </div>
    </Card>
    <div className="min-h-[760px] print:min-h-0"><div className="mb-3 flex items-center justify-between print:hidden"><p className="eyebrow">Print preview</p><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={16} />Print</Button><a href={status === "approved" ? `/api/reports/${reportId}/pdf` : printUrl} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><DownloadSimple size={16} />{status === "approved" ? "Download PDF" : "Preview PDF"}</Button></a></div></div><PrintPreview document={reportDocument} draft={status !== "approved"} title={reportTitle} photoUrls={photoUrls} /></div>
  </div>;
}

function PrintPreview({ document, draft, title, photoUrls }: { document: ReportDocument; draft: boolean; title: string; photoUrls: Record<string, string> }) {
  const components = useMemo(() => document.componentSections ?? [], [document.componentSections]);
  const metadata = document.metadata ?? fallbackReportDocument(title).metadata;
  return <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="report-paper relative mx-auto min-h-[1123px] max-w-[794px] border border-[var(--line)] bg-white px-8 py-10 text-slate-900 print:max-w-none print:border-0 print:px-12 print:py-12">
    {draft ? <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"><span className="rotate-[-28deg] text-5xl font-black tracking-widest text-red-600/10">DRAFT – NOT APPROVED</span></div> : null}
    <div className="mb-12 h-2 bg-[#165DAD]" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#397047]">Stock condition survey</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-[#172033]">{title}</h1><p className="mt-3 text-sm text-slate-500">{metadata.clientName || "Client not recorded"} · {metadata.reportDate || "Date not recorded"}</p>
    <section className="mt-12 border-t border-slate-200 pt-6"><h2 className="text-xl font-bold text-[#165DAD]">Contents</h2><ol className="mt-4 grid gap-2 text-sm text-slate-600">{sectionLabels.map(([, label], index) => <li key={label} className="flex justify-between border-b border-dotted border-slate-200 pb-2"><span>{index + 1}. {label}</span><span>{index + 3}</span></li>)}</ol></section>
    <PreviewSection title="Executive summary" content={document.executiveSummary} /><PreviewSection title="Introduction" content={document.introduction} /><PreviewSection title="Methodology" content={document.methodology} /><PreviewSection title="Scope and limitations" content={document.limitations.join("\n")} /><PreviewSection title="Stock profile" content={Object.entries(document.stockProfile).map(([key, value]) => `${key}: ${value}`).join("\n")} />
    {document.dataQualityIssues.length ? <PreviewSection title="Data quality" content={document.dataQualityIssues.join("\n")} /> : null}
    <section className="mt-8 break-before-page"><h2 className="preview-heading">Overall stock condition</h2><SummaryTable rows={document.conditionSummary} /><h3 className="mt-8 text-lg font-bold text-[#165DAD]">Priority summary</h3><SummaryTable rows={document.prioritySummary} /></section>
    {components.map((component) => <section key={component.component} className="mt-8 break-before-page"><h2 className="preview-heading">{component.component}</h2><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{component.narrative}</p><div className="mt-5 grid gap-3">{component.elements.map((element) => <div key={element.surveyElementId} className="border-t border-slate-200 pt-3"><h3 className="font-bold">{element.element}</h3><p className="mt-1 text-sm text-slate-600">{element.construction || "Construction not recorded"} · Condition {element.condition || "not recorded"} · Priority {element.priority || "not recorded"}{element.estimatedCost !== undefined ? ` · £${element.estimatedCost.toLocaleString("en-GB")}` : ""}</p><p className="mt-2 text-sm leading-6">{element.defects.length ? `Defects: ${element.defects.join(", ")}` : "No defect information recorded."}</p>{element.recommendedWorks ? <p className="mt-1 text-sm leading-6">Works: {element.recommendedWorks}</p> : null}</div>)}</div></section>)}
    <PreviewSection title="Lifecycle schedule" content={document.lifecycleSchedule.map((item) => `${item.element}: ${item.horizon ?? "Horizon not recorded"}${item.replacementYear ? ` · ${item.replacementYear}` : ""}`).join("\n")} /><PreviewSection title="Planned maintenance" content={document.plannedMaintenance} /><PreviewSection title="Recommendations and conclusion" content={document.recommendations.join("\n\n")} /><section className="mt-10 break-before-page"><h2 className="preview-heading">Photo schedule</h2><div className="grid grid-cols-2 gap-4">{document.photoSchedule.filter((photo) => photo.included).map((photo, index) => <figure key={photo.id} className="break-inside-avoid">{photoUrls[photo.mediaId] ? <div className="relative aspect-[4/3]"><Image src={photoUrls[photo.mediaId]} alt={photo.caption || `Figure ${index + 1}`} fill unoptimized sizes="(max-width: 768px) 50vw, 360px" className="object-cover" /></div> : <div className="aspect-[4/3] border border-dashed border-slate-300 bg-slate-50" />}<figcaption className="mt-2 text-xs text-slate-600">Figure {index + 1}: {photo.caption || "Photograph caption not recorded"}</figcaption></figure>)}</div></section><div className="mt-12 flex justify-between border-t border-slate-200 pt-3 text-xs text-slate-500"><span>{title}</span><span>Stock Condition Survey · Page</span></div>
  </motion.article>;
}

function PreviewSection({ title, content }: { title: string; content: string }) { return <section className="mt-10 break-before-page"><h2 className="preview-heading">{title}</h2><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{content || "Information was not available within the survey dataset."}</p></section>; }
function SummaryTable({ rows }: { rows: Array<{ label: string; count: number; percentage: number }> }) { return <div className="mt-4 overflow-hidden border border-slate-200"><div className="grid grid-cols-3 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide"><span>Rating</span><span>Items</span><span>Percent</span></div>{rows.map((row) => <div key={row.label} className="grid grid-cols-3 border-t border-slate-200 px-3 py-2 text-sm"><span>{row.label}</span><span>{row.count}</span><span>{row.percentage}%</span></div>)}</div>; }

function StructuredContentEditor({ value, label, disabled, onChange, onValidityChange }: { value: unknown; label: string; disabled: boolean; onChange: (value: unknown) => void; onValidityChange: (message: string) => void }) {
  const [draft, setDraft] = useState(() => toText(value));
  const [parseError, setParseError] = useState("");
  function edit(next: string) {
    setDraft(next);
    try { onChange(JSON.parse(next)); setParseError(""); onValidityChange(""); }
    catch { const message = "Enter valid JSON before saving this section."; setParseError(message); onValidityChange(message); }
  }
  return <div><textarea className="field min-h-[360px] resize-y font-mono text-xs leading-6" value={draft} onChange={(event) => edit(event.target.value)} disabled={disabled} aria-label={label} />{parseError ? <p className="mt-2 text-xs text-[var(--danger)]" role="alert">{parseError}</p> : <p className="mt-2 text-xs text-[var(--ink-muted)]">Structured JSON is stored with the report snapshot. It does not change source survey evidence.</p>}</div>;
}
