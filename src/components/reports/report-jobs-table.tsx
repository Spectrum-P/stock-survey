"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, SpinnerGap, WarningCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/client-api";
import type { ReportJobSummary } from "@/lib/types";

function age(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ReportJobsTable({ jobs, workerReady }: { jobs: ReportJobSummary[]; workerReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const hasActiveJobs = jobs.some((job) => job.status === "queued" || job.status === "processing");
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs, router]);
  async function run(path: string, key: string) {
    setBusy(key); setError("");
    try {
      const response = await authenticatedFetch(path, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not start report job");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not start report job"); }
    finally { setBusy(null); }
  }
  return <div className="space-y-3">
    {error ? <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><WarningCircle size={18} />{error}</div> : null}
    {jobs.map((job) => <div key={job.id} className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:grid-cols-[minmax(240px,1.35fr)_minmax(220px,1fr)_auto] lg:items-center">
      <div className="min-w-0"><Link href={`/reports/${job.reportId}`} className="font-semibold text-[var(--ink)] hover:text-[var(--brand)]">{job.property} · {job.unit}</Link><p className="mt-1 truncate text-xs text-[var(--ink-muted)]">{job.reportTitle}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{job.scopeType} scope · Created {new Date(job.createdAt).toLocaleString("en-GB")} · Age {age(job.createdAt)}</p></div>
      <div><div className="flex items-center gap-2"><Badge tone={job.status === "completed" ? "green" : job.status === "failed" ? "orange" : "blue"}>{job.status}</Badge><span className="text-xs text-[var(--ink-muted)]">Attempt {job.attempts}</span></div><p className="mt-2 text-xs text-[var(--ink-muted)]">{job.currentStep ?? "No active step"}</p>{job.status === "queued" ? <p className="mt-1 text-xs text-[var(--ink-muted)]">Available {new Date(job.availableAt).toLocaleString("en-GB")}</p> : null}{job.status === "processing" && job.lockedAt ? <p className="mt-1 text-xs text-[var(--ink-muted)]">Claimed {new Date(job.lockedAt).toLocaleString("en-GB")}</p> : null}{job.completedAt ? <p className="mt-1 text-xs text-[var(--ink-muted)]">Completed {new Date(job.completedAt).toLocaleString("en-GB")}</p> : null}{job.errorMessage ? <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-[var(--danger)]"><span className="font-semibold">Stored error from this job:</span> {job.errorMessage}</div> : null}</div>
      <div>{job.status === "queued" || job.status === "failed" ? <Button size="sm" variant="secondary" disabled={!workerReady || busy !== null} onClick={() => run(`/api/report-jobs/${job.id}/run`, job.id)}>{busy === job.id ? <SpinnerGap className="animate-spin" size={15} /> : <RefreshCw size={15} />}{job.status === "failed" ? "Retry" : "Run now"}</Button> : null}</div>
    </div>)}
  </div>;
}
