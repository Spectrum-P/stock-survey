import Link from "next/link";
import { ArrowRight, FileText } from "@/components/ui/icons";
import { getReportFlatScopes, getReportsPage } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProperties } from "@/lib/data";
import { ReportGenerator } from "@/components/reports/report-generator";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [reports, properties, flats] = await Promise.all([
    getReportsPage(page, 10),
    getProperties(),
    getReportFlatScopes(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence to narrative"
        title="Reports"
        description="Generate grounded drafts from stored surveys, review them, and approve a version before PDF export."
        actions={<Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--brand)]" href="/reports/jobs">View report jobs</Link>}
      />
      <ReportGenerator properties={properties} flats={flats} />
      {reports.items.length ? (
        <div className="grid gap-4">
          {reports.items.map((report) => (
            <Link href={`/reports/${report.id}`} key={report.id}>
              <Card className="group flex items-center justify-between gap-4 transition-colors hover:border-[var(--blue)] p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                    <FileText size={22} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display truncate font-semibold">{report.title ?? `${report.property} · ${report.unit}`}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {report.property} · {report.unit} · {report.scopeType ?? "survey"} · {report.progress ?? 0}% · Updated{" "}
                      {new Date(report.updatedAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    tone={
                      report.generationStatus === "ready" && report.status === "approved"
                        ? "green"
                        : report.generationStatus === "failed" || report.status === "failed"
                          ? "orange"
                          : "blue"
                    }
                  >
                    {report.generationStatus === "ready" ? report.status : report.generationStatus ?? report.status}
                  </Badge>
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No reports generated yet"
          description="Once a survey has saved evidence, generate a flat, property, or portfolio report. Claude will only use the stored survey snapshot."
          tips={[
            "Draft reports can be edited before approval.",
            "PDF export is enabled only for approved report versions.",
          ]}
          action={
            <Button variant="secondary" disabled={!properties.length}>
              Choose a scope above
            </Button>
          }
        />
      )}
      <Pagination basePath="/reports" page={reports.page} pageCount={reports.pageCount} total={reports.total} label="reports" />
    </div>
  );
}
