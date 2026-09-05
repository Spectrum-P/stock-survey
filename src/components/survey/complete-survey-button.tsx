"use client";

import { useState } from "react";
import { CheckCircle, Warning } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/client-api";
import { AnimatePresence, motion } from "framer-motion";

export function CompleteSurveyButton({ surveyId, incompleteCount }: { surveyId: string; incompleteCount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function complete() {
    setLoading(true); setError("");
    const response = await authenticatedFetch(`/api/surveys/${surveyId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyId, expectedVersion: 0, acknowledgedIncomplete: incompleteCount > 0 }) });
    setLoading(false);
    if (response.ok) { setDone(true); setOpen(false); }
    else { const body = await response.json().catch(() => null); setError(body?.error ?? "Could not complete this survey."); }
  }
  return <><Button variant={done ? "success" : "primary"} onClick={() => { setError(""); setOpen(true); }}><CheckCircle size={18} />{done ? "Survey completed" : "Complete survey"}</Button><AnimatePresence>{open ? <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div role="dialog" aria-modal="true" aria-labelledby="complete-title" className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 28 }}><div className="grid size-11 place-items-center rounded-xl bg-[var(--orange-soft)] text-[var(--orange)]"><Warning size={23} /></div><h2 id="complete-title" className="mt-5 text-xl font-semibold">Complete this survey?</h2><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{incompleteCount ? `${incompleteCount} elements are still incomplete. Manual completion is allowed, and the coverage gap will remain visible in the final review.` : "Every required element has an accepted status. The survey will be ready for report generation."}</p>{error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200" role="alert">{error}</p> : null}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setOpen(false)}>Keep surveying</Button><Button variant="warning" disabled={loading} onClick={complete}>{loading ? "Completing" : "Confirm completion"}</Button></div></motion.div></motion.div> : null}</AnimatePresence></>;
}
