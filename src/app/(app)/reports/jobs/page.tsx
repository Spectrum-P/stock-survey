import Link from "next/link";
import { getReportJobsPage } from "@/lib/data";
import { publicWorkerHealth } from "@/lib/reporting/queue";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { ReportJobsTable } from "@/components/reports/report-jobs-table";
import { RunReportJobsButton } from "@/components/reports/run-report-jobs-button";
import { ReportJobFilters } from "@/components/reports/report-job-filters";

const statuses = ["all", "queued", "processing", "failed", "completed"];

export default async function ReportJobsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const status = statuses.includes(query.status ?? "") && query.status !== "all" ? query.status : undefined;
  const [jobs, worker] = await Promise.all([getReportJobsPage(page, 10, status), Promise.resolve(publicWorkerHealth())]);
  return <div className="space-y-6">
    <PageHeader eyebrow="Report operations" title="Report jobs" description="Monitor queued generation work, inspect failures, and manually start or retry jobs." actions={<div className="flex gap-2"><Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold" href="/reports">Back to reports</Link><RunReportJobsButton disabled={!worker.ready} /></div>} />
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">Worker status</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{worker.message}</p></div><Badge tone={worker.ready ? "green" : "orange"}>{worker.ready ? "Ready" : "Configuration required"}</Badge></Card>
    <ReportJobFilters currentStatus={status ?? "all"} />
    {jobs.items.length ? <ReportJobsTable jobs={jobs.items} workerReady={worker.ready} /> : <Card className="p-8 text-center"><p className="font-semibold">No report jobs found</p><p className="mt-2 text-sm text-[var(--ink-muted)]">Jobs will appear here after a report is generated.</p></Card>}
    <Pagination basePath="/reports/jobs" page={jobs.page} pageCount={jobs.pageCount} total={jobs.total} label="jobs" params={{ status: status ?? "all" }} />
  </div>;
}
