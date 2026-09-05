import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/ui/icons";
import { getRecords } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExcelExportButton } from "@/components/records/excel-export";

export default async function SurveyRecordPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const records = (await getRecords()).filter((record) => record.surveyId === surveyId);
  if (!records.length) notFound();
  const first = records[0];
  return <div className="space-y-6"><Link href="/records" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft /> Back to records</Link><PageHeader eyebrow={first.surveyDate} title={`${first.property} · ${first.unit}`} description={`${records.length} recorded findings from this survey.`} actions={first.surveyStatus === "completed" ? <ExcelExportButton url={`/api/records/export/excel?scope=unit&surveyId=${encodeURIComponent(surveyId)}`} label="Export this unit survey" /> : undefined} /><div className="grid gap-4">{records.map((record) => <Card key={record.id} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{record.component}</p><h2 className="font-display mt-1 text-lg font-semibold">{record.element}</h2><p className="mt-2 text-sm text-[var(--muted)]">{record.defect} · {record.construction}</p></div><div className="flex gap-2"><Badge tone={record.condition === "D" ? "orange" : "neutral"}>Condition {record.condition}</Badge><Badge tone={record.priority === "1" ? "orange" : "neutral"}>P{record.priority}</Badge></div></Card>)}</div></div>;
}
