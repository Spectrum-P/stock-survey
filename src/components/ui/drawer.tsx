"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Drawer({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return <AnimatePresence>{open ? <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu"><motion.button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => onOpenChange(false)} /><motion.aside className="relative flex h-full w-[min(85vw,320px)] flex-col border-r border-[var(--line)] bg-[var(--surface)]" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 360, damping: 32 }}>{children}</motion.aside></div> : null}</AnimatePresence>;
}
