import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/ui/icons";
import { getReportById } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { ReportEditor } from "@/components/reports/report-editor";

export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await getReportById(reportId);
  if (!report) notFound();
  return <div className="space-y-6"><Link href="/reports" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft /> Back to reports</Link><PageHeader eyebrow="Stock condition report" title={`${report.property} · ${report.unit}`} description="Edit the generated narrative without changing the underlying survey evidence." /><ReportEditor reportId={report.id} surveyId={report.surveyId} propertyId={report.propertyId} scopeType={report.scopeType} initialStatus={report.status} initialGenerationStatus={report.generationStatus} propertyName={report.property} unitName={report.unit} /></div>;
}
