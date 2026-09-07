"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Funnel, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

const statuses = ["all", "queued", "processing", "failed", "completed"] as const;

export function ReportJobFilters({ currentStatus }: { currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const selected = statuses.includes(currentStatus as (typeof statuses)[number]) ? currentStatus : "all";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <div className="hidden flex-wrap gap-2 md:flex">
      {statuses.map((status) => <StatusLink key={status} status={status} selected={selected === status} />)}
    </div>
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold shadow-sm transition-colors duration-150 hover:border-[var(--brand)] hover:text-[var(--brand)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="report-job-filter-dialog"
      >
        <Funnel size={18} /> Filters
        {selected !== "all" ? <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] text-white">1</span> : null}
      </button>
    </div>
    <AnimatePresence initial={false}>{open ? <motion.div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-3 backdrop-blur-[2px] md:hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
    ><motion.section
      id="report-job-filter-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-job-filter-title"
      className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
    >
      <header className="flex items-start justify-between border-b border-[var(--line)] px-4 py-3">
        <div><p className="eyebrow">Job history</p><h2 id="report-job-filter-title" className="mt-1 text-xl font-semibold">Filter by status</h2></div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close filters" autoFocus><X size={20} /></Button>
      </header>
      <nav aria-label="Report job status" className="grid gap-2 p-4">
        {statuses.map((status) => <StatusLink key={status} status={status} selected={selected === status} onClick={() => setOpen(false)} mobile />)}
      </nav>
    </motion.section></motion.div> : null}</AnimatePresence>
  </>;
}

function StatusLink({ status, selected, onClick, mobile = false }: { status: string; selected: boolean; onClick?: () => void; mobile?: boolean }) {
  return <Link
    href={`/reports/jobs?status=${status}&page=1`}
    onClick={onClick}
    aria-current={selected ? "page" : undefined}
    className={`${mobile ? "flex min-h-12 items-center justify-between rounded-xl px-4 py-3" : "rounded-full px-3 py-1.5"} text-sm font-semibold ${selected ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]"}`}
  >
    {status[0].toUpperCase() + status.slice(1)}
    {mobile && selected ? <span aria-hidden>✓</span> : null}
  </Link>;
}
