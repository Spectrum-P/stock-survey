import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  not_started: "Not started", partial: "Partial", in_progress: "In progress", completed: "Completed", not_applicable: "Not applicable", inaccessible: "Inaccessible", draft: "Draft", approved: "Approved", generating: "Generating", failed: "Failed", archived: "Archived"
};

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" || status === "approved" ? "green" : status === "partial" || status === "in_progress" || status === "draft" || status === "generating" ? "orange" : status === "failed" || status === "inaccessible" ? "red" : "neutral";
  return <Badge tone={tone}>{labels[status] ?? status}</Badge>;
}
