import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle, ClipboardText, WarningCircle } from "@/components/ui/icons";
import { catalog as fallbackCatalog } from "@/lib/catalog";
import { getRecords, getSurveyCatalog, getSurveyContext } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReviewActions } from "@/components/survey/review-actions";

export default async function SurveyReviewPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const [context, records, catalogItems] = await Promise.all([getSurveyContext(surveyId), getRecords(), getSurveyCatalog()]);
  if (!context) notFound();
  const catalog = catalogItems.length ? catalogItems : fallbackCatalog;
  const customItems = context.customElements ?? [];
  const elements = [...catalog.map((item) => ({ id: undefined, category: item.category, name: item.name, status: context.statuses.get(item.name) ?? "not_started" as const })), ...customItems.map((item) => ({ id: item.id, category: item.category, name: item.element, status: item.status }))];
  const acceptedStatuses = ["completed", "not_applicable", "inaccessible"];
  const accepted = elements.filter((item) => acceptedStatuses.includes(item.status)).length;
  const incomplete = elements.length - accepted;
  const saved = elements.filter((item) => item.status !== "not_started").length;
  const scopedRecords = records.filter((record) => record.surveyId === surveyId);
  const urgent = scopedRecords.filter((record) => record.priority === "1").length;
  const photos = scopedRecords.reduce((sum, record) => sum + record.photoCount, 0);
  const findingsByElement = new Map<string, typeof scopedRecords>();
  for (const record of scopedRecords) findingsByElement.set(record.element, [...(findingsByElement.get(record.element) ?? []), record]);
  const editHref = (element: { id?: string; name: string }) => `/surveys/${surveyId}/element/${element.id ?? encodeURIComponent(element.name)}`;
  return <div className="grid gap-6">
    <Link href={`/surveys/${surveyId}/workspace`} className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--brand)]"><ArrowLeft size={17} />Back to element workspace</Link>
    <PageHeader eyebrow="Survey review" title={`Review ${context.unit}`} description={`${context.property} · ${context.address}. Confirm the evidence, coverage, and actions before marking this unit complete.`} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ReviewMetric icon={ClipboardText} label="Element coverage" value={`${accepted} / ${elements.length}`} note={`${incomplete} need attention`} tone={incomplete ? "orange" : "green"} /><ReviewMetric icon={CheckCircle} label="Saved elements" value={saved} note="Partial and accepted statuses" /><ReviewMetric icon={WarningCircle} label="Urgent findings" value={urgent} note="Priority 1" tone={urgent ? "orange" : undefined} /><ReviewMetric icon={Camera} label="Evidence photos" value={photos} note="Linked to this survey" /></section>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6"><div><p className="eyebrow">Coverage map</p><h2 className="mt-1 text-xl font-semibold">Element-by-element review</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">Use Edit to return to the six-stage stepper for any element.</p></div><div className="min-w-56"><div className="flex justify-between text-xs text-[var(--ink-muted)]"><span>{accepted} accepted</span><strong>{elements.length ? Math.round((accepted / elements.length) * 100) : 0}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--leaf)] transition-[width] duration-500" style={{ width: `${elements.length ? (accepted / elements.length) * 100 : 0}%` }} /></div></div></div><div className="divide-y divide-[var(--line)]">{elements.map((element) => { const findings = findingsByElement.get(element.name) ?? []; const isAttention = !acceptedStatuses.includes(element.status); return <div key={element.id ?? element.name} className={`grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${isAttention ? "bg-[var(--orange-soft)]/35" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">{element.category}</span><StatusBadge status={element.status} /></div><h3 className="mt-2 truncate text-base font-semibold">{element.name}</h3><p className="mt-1 text-sm text-[var(--ink-muted)]">{findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"} · ${findings.map((finding) => finding.defect).join(", ")}` : element.status === "not_started" ? "No assessment saved" : "No defect findings recorded"}</p></div><div className="flex items-center gap-3"><Link href={editHref(element)} className="text-sm font-semibold text-[var(--brand)] hover:underline">Edit</Link>{findings.some((finding) => finding.priority === "1") ? <Badge tone="red">Urgent</Badge> : null}</div></div>; })}</div></Card>
    <section className="grid gap-5 lg:grid-cols-[1fr_340px]"><Card className="p-5 sm:p-6"><div className="flex items-start gap-3"><WarningCircle className="mt-0.5 shrink-0 text-[var(--orange)]" size={22} /><div><p className="eyebrow text-[var(--orange)]">Surveyor acknowledgement</p><h2 className="mt-1 text-lg font-semibold">Coverage is a deliberate decision</h2><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Incomplete, inaccessible, and not-applicable elements remain visible in the audit trail. Completion does not imply that every component was inspected or defect-free.</p></div></div></Card><Card className="flex flex-col justify-between gap-5 p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Survey status</p><p className="mt-2 text-lg font-semibold">{context.status.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{saved} of {elements.length} elements have saved work.</p></div><ReviewActions surveyId={surveyId} incompleteCount={incomplete} savedCount={saved} /></Card></section>
  </div>;
}

function ReviewMetric({ icon: Icon, label, value, note, tone }: { icon: typeof ClipboardText; label: string; value: string | number; note: string; tone?: "green" | "orange" }) {
  return <Card className="flex items-start gap-3 p-5"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone === "orange" ? "bg-[var(--orange-soft)] text-[var(--orange)]" : tone === "green" ? "bg-[var(--leaf-soft)] text-[var(--leaf)]" : "bg-[var(--blue-soft)] text-[var(--brand)]"}`}><Icon size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">{label}</p><p className="metric-number mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{note}</p></div></Card>;
}
