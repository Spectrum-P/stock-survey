import { RecordsTable } from "@/components/records/records-table";
import { PageHeader } from "@/components/ui/page-header";
import { getExcelExportOptions, getRecords } from "@/lib/data";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardText } from "@/components/ui/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RecordsPage() {
  const [records, exportOptions] = await Promise.all([getRecords(), getExcelExportOptions()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfolio evidence"
        title="Survey records"
        description="Filter, review and export component-level findings across every property and flat."
      />
      {records.length || exportOptions.length ? (
        <RecordsTable records={records} exportOptions={exportOptions} />
      ) : (
        <EmptyState
          icon={ClipboardText}
          title="No survey records yet"
          description="Records appear here as surveyors save element findings. Start with a property and flat workspace, then save a partial or completed element assessment."
          tips={[
            "One row represents one defect finding, with property and flat context retained.",
            "No-defect observations are also recorded when the element is completed.",
          ]}
          action={
            <Link href="/properties">
              <Button>Open properties</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
