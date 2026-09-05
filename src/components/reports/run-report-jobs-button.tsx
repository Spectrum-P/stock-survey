"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, SpinnerGap, WarningCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/client-api";

export function RunReportJobsButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch("/api/report-jobs/dispatch", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not run queued jobs");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not run queued jobs"); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col items-end gap-1"><Button onClick={run} disabled={disabled || busy}>{busy ? <SpinnerGap className="animate-spin" size={17} /> : <RefreshCw size={17} />}Run queued</Button>{error ? <span className="flex items-center gap-1 text-xs text-[var(--danger)]" role="alert"><WarningCircle size={13} />{error}</span> : null}</div>;
}
