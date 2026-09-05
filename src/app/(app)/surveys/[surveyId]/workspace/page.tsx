import Link from "next/link";
import { ArrowRight, CheckCircle, ClipboardText, MapPin, Sparkle, User } from "@/components/ui/icons";
import { catalog as fallbackCatalog } from "@/lib/catalog";
import { getSurveyCatalog, getSurveyContext } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CompleteSurveyButton } from "@/components/survey/complete-survey-button";
import { CustomElementManager } from "@/components/survey/custom-element-manager";
import { UnitNavigation } from "@/components/survey/unit-navigation";
import { getSurveyNavigation } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function SurveyWorkspacePage({ params, searchParams }: { params: Promise<{ surveyId: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { surveyId } = await params; const query = await searchParams; const [context, navigation, catalogItems] = await Promise.all([getSurveyContext(surveyId), getSurveyNavigation(surveyId), getSurveyCatalog()]);
  if (!context) notFound();
  const catalog = catalogItems.length ? catalogItems : fallbackCatalog;
  const categories = [...new Set(catalog.map((item) => item.category))];
  const customItemsForProgress = context.customElements ?? [];
  const completed = catalog.filter((item) => ["completed", "not_applicable", "inaccessible"].includes(context.statuses.get(item.name) ?? "not_started")).length + customItemsForProgress.filter((item) => ["completed", "not_applicable", "inaccessible"].includes(item.status)).length;
  const partial = catalog.filter((item) => context.statuses.get(item.name) === "partial").length + customItemsForProgress.filter((item) => item.status === "partial").length;
  const totalElements = catalog.length + customItemsForProgress.length;
  const incomplete = totalElements - completed;
  const customCategories = [...new Set((context.customElements ?? []).map((item) => item.category))];
  const nextElement = catalog.find((item) => !["completed", "not_applicable", "inaccessible"].includes(context.statuses.get(item.name) ?? "not_started"))?.name ?? (context.customElements ?? []).find((item) => !["completed", "not_applicable", "inaccessible"].includes(item.status))?.element;
  const allCategories = [...new Set([...categories, ...customCategories])];
  return <div className="grid gap-7">
    <PageHeader title={`${context.unit} survey`} description={`${context.property}, ${context.address}`} actions={<><UnitNavigation surveyId={surveyId} propertyId={context.propertyId} currentUnitId={context.unitId} units={navigation?.units ?? []} /><Link href={`/surveys/${surveyId}/review`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold hover:border-[var(--brand)]"><ClipboardText size={18} />Review survey</Link><CompleteSurveyButton surveyId={surveyId} incompleteCount={incomplete} /></>} />
    {query.saved ? <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-[var(--leaf-soft)] p-4 text-sm text-[var(--leaf)]" role="status"><CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0" /><div><strong>{query.saved} saved successfully.</strong><p className="mt-1 text-[var(--ink-muted)]">Select the next element to continue this flat survey.</p></div></div> : null}
    <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[var(--brand)] dark:bg-blue-950/60"><MapPin size={21} /></span><div><span className="block text-xs text-[var(--ink-muted)]">Property</span><strong className="text-sm">{context.property}</strong></div></div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--leaf-soft)] text-[var(--leaf)]"><User size={21} /></span><div><span className="block text-xs text-[var(--ink-muted)]">Surveyor</span><strong className="text-sm">{context.surveyor}</strong></div></div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--orange-soft)] text-[var(--orange)]"><ClipboardText size={21} /></span><div><span className="block text-xs text-[var(--ink-muted)]">Inspection date</span><strong className="text-sm">{new Date(context.inspectionDate).toLocaleDateString("en-GB")}</strong></div></div></div></Card>
      <Card className="p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold text-[var(--ink-muted)]">Element coverage</p><p className="metric-number mt-1 text-3xl font-semibold">{completed}<span className="text-base font-medium text-[var(--ink-muted)]"> / {totalElements}</span></p></div><Badge tone={partial ? "orange" : "green"}>{partial} partial</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--leaf)]" style={{ width: `${totalElements ? Math.round((completed / totalElements) * 100) : 0}%` }} /></div></Card>
    </section>
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Select an element</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">Completed elements remain available for review and editing.</p></div>{nextElement ? <Badge tone="blue"><Sparkle size={14} />Next: {nextElement}</Badge> : null}</div>
    <section className="grid gap-5">{allCategories.map((category) => { const standardItems = catalog.filter((item) => item.category === category).map((item) => ({ name: item.name, key: item.name, id: undefined as string | undefined, status: context.statuses.get(item.name) ?? "not_started" as const })); const customItems = (context.customElements ?? []).filter((item) => item.category === category).map((item) => ({ name: item.element, key: item.id, id: item.id, status: item.status })); const items = [...standardItems, ...customItems]; const accepted = items.filter((item) => ["completed", "not_applicable", "inaccessible"].includes(item.status)).length; return <Card key={category} className="overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-muted)] px-5 py-4"><div><h3 className="text-base font-semibold">{category}</h3><p className="mt-0.5 text-xs text-[var(--ink-muted)]">{accepted} of {items.length} accepted</p></div><div className="flex items-center gap-2"><span className="metric-number text-sm font-semibold">{items.length ? Math.round((accepted / items.length) * 100) : 0}%</span><CustomElementManager surveyId={surveyId} componentName={category} /></div></div><div className="grid md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Link key={item.key} href={`/surveys/${surveyId}/element/${item.id ?? encodeURIComponent(item.name)}`} className="group flex min-h-20 items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 hover:bg-[var(--surface-muted)] md:border-r"><div><strong className="text-sm group-hover:text-[var(--brand)]">{item.name}</strong><div className="mt-2"><StatusBadge status={item.status} /></div></div><ArrowRight size={18} className="shrink-0 text-[var(--ink-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand)]" /></Link>)}</div></Card>; })}</section>
  </div>;
}
