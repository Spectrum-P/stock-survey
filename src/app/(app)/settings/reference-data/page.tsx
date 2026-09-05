import { PageHeader } from "@/components/ui/page-header";
import { ReferenceData } from "@/components/settings/reference-data";

export default function ReferenceDataPage() {
  return <div className="space-y-6"><PageHeader eyebrow="Controlled vocabulary" title="Reference data" description="Maintain component, construction, defect and lifecycle options used throughout inspections." /><ReferenceData /></div>;
}
