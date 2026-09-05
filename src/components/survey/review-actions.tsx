"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function ReviewActions({ surveyId, incompleteCount, savedCount }: { surveyId: string; incompleteCount: number; savedCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function complete() {
    setBusy(true); setError("");
    const response = await authenticatedFetch(`/api/surveys/${surveyId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ surveyId, expectedVersion: 0, acknowledgedIncomplete: incompleteCount > 0 }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "The survey could not be completed."); setBusy(false); return; }
    router.push(`/surveys/${surveyId}/workspace?completed=true`);
  }
  return <><div className="flex flex-wrap items-center justify-end gap-3"><Button variant="secondary" onClick={() => router.push(`/surveys/${surveyId}/workspace`)}>Back to workspace</Button><Button disabled={!savedCount} onClick={() => { setError(""); setOpen(true); }}><HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />Complete survey</Button></div><AnimatePresence>{open ? <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div role="dialog" aria-modal="true" aria-labelledby="review-complete-title" className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><p className="eyebrow text-[var(--orange)]">Final survey decision</p><h2 id="review-complete-title" className="mt-2 text-xl font-semibold">Complete this survey?</h2><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{incompleteCount ? `${incompleteCount} elements still need attention. You can complete now; the coverage gap will remain visible in the audit record.` : "All elements have an accepted status and this survey is ready for reporting."}</p>{error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Keep reviewing</Button><Button variant="success" disabled={busy} onClick={complete}>{busy ? "Completing…" : "Confirm completion"}</Button></div></motion.div></motion.div> : null}</AnimatePresence></>;
}
