import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { ElementStepper } from "@/components/survey/element-stepper";
import { getSurveyCatalog, getSurveyContext, getSurveyElementDraft } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function ElementSurveyPage({ params }: { params: Promise<{ surveyId: string; elementId: string }> }) {
  const { surveyId, elementId } = await params; const element = decodeURIComponent(elementId); const [context, draft, catalogItems] = await Promise.all([getSurveyContext(surveyId), getSurveyElementDraft(surveyId, element), getSurveyCatalog()]);
  if (!context) notFound();
  return <div className="grid gap-6"><div><Link href={`/surveys/${surveyId}/workspace`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"><ArrowLeft size={17} />Back to {context.unit}</Link><h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{draft?.element ?? element} assessment</h1><p className="mt-2 text-sm text-[var(--ink-muted)]">{context.property}, {context.unit}</p></div><ElementStepper surveyId={surveyId} initialElement={element} initialDraft={draft} catalogItems={catalogItems} /></div>;
}
