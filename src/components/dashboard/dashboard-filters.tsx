"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarBlank, DownloadSimple, Funnel, X } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import type { PropertySummary } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface FilterValues {
  propertyId?: string;
  building?: string;
  propertyType?: string;
  from?: string;
  to?: string;
}

interface DashboardFiltersProps {
  properties: PropertySummary[];
  buildings: string[];
  propertyTypes: string[];
  values: FilterValues;
}

export function DashboardFilters({ properties, buildings, propertyTypes, values }: DashboardFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);
  const activeCount = Object.values(values).filter(Boolean).length;

  useEffect(() => setDraft(values), [values]);
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

  function navigate(next: FilterValues) {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([name, item]) => { if (item) params.set(name, item); });
    router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function update(key: keyof FilterValues, value: string) {
    navigate({ ...values, [key]: value || undefined });
  }

  function applyMobileFilters() {
    setOpen(false);
    navigate(draft);
  }

  function clearMobileFilters() {
    const empty: FilterValues = {};
    setDraft(empty);
    setOpen(false);
    navigate(empty);
  }

  function exportDashboard() {
    setOpen(false);
    window.setTimeout(() => window.print(), 0);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 print:hidden md:hidden">
        <button
          type="button"
          onClick={() => { setDraft(values); setOpen(true); }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] shadow-sm transition-colors duration-150 hover:border-[var(--brand)] hover:text-[var(--brand)]"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="dashboard-filter-dialog"
        >
          <Funnel size={18} />
          Filters
          {activeCount ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[11px] leading-4 text-white" aria-label={`${activeCount} active filters`}>{activeCount}</span> : null}
        </button>
        {activeCount ? <span className="text-xs font-medium text-[var(--ink-muted)]">{activeCount} active</span> : null}
      </div>

      <div className="hidden flex-wrap items-end gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 print:hidden md:flex">
        <FilterFields properties={properties} buildings={buildings} propertyTypes={propertyTypes} values={values} onChange={update} compact />
        <Button variant="secondary" className="h-10" onClick={exportDashboard}><DownloadSimple size={17} />Export</Button>
        <span className="ml-auto hidden items-center gap-1 text-xs text-[var(--ink-muted)] lg:flex"><Funnel size={15} />Filters update all panels</span>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-3 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          >
            <motion.section
              id="dashboard-filter-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-filter-title"
              className="max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            >
              <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
                <div><p className="eyebrow">Dashboard scope</p><h2 id="dashboard-filter-title" className="mt-1 text-xl font-semibold">Filters</h2></div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close filters" autoFocus><X size={20} /></Button>
              </header>
              <div className="grid gap-5 p-5">
                <FilterFields properties={properties} buildings={buildings} propertyTypes={propertyTypes} values={draft} onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value || undefined }))} />
                <Button type="button" variant="secondary" className="w-full" onClick={exportDashboard}><DownloadSimple size={18} />Export dashboard</Button>
              </div>
              <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[var(--line)] bg-[var(--surface)] p-4">
                <Button type="button" variant="secondary" onClick={clearMobileFilters}>Clear</Button>
                <Button type="button" onClick={applyMobileFilters}>Apply filters{Object.values(draft).filter(Boolean).length ? ` (${Object.values(draft).filter(Boolean).length})` : ""}</Button>
              </footer>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function FilterFields({ properties, buildings, propertyTypes, values, onChange, compact = false }: {
  properties: PropertySummary[];
  buildings: string[];
  propertyTypes: string[];
  values: FilterValues;
  onChange: (key: keyof FilterValues, value: string) => void;
  compact?: boolean;
}) {
  const labelClass = compact ? "grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]" : "grid gap-2 text-sm font-semibold text-[var(--ink)]";
  const controlClass = compact ? "field-control h-10 min-h-10 text-sm" : "field-control min-h-12 text-base";
  return <>
    <label className={compact ? `${labelClass} min-w-36` : labelClass}><span>Property</span><select className={controlClass} value={values.propertyId ?? ""} onChange={(event) => onChange("propertyId", event.target.value)}><option value="">All properties</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
    <label className={labelClass}><span>Building</span><select className={controlClass} value={values.building ?? ""} onChange={(event) => onChange("building", event.target.value)}><option value="">All buildings</option>{buildings.map((building) => <option key={building}>{building}</option>)}</select></label>
    <label className={labelClass}><span>Property type</span><select className={controlClass} value={values.propertyType ?? ""} onChange={(event) => onChange("propertyType", event.target.value)}><option value="">All types</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
    <DateField label="From" value={values.from ?? ""} onChange={(value) => onChange("from", value)} compact={compact} />
    <DateField label="To" value={values.to ?? ""} onChange={(value) => onChange("to", value)} compact={compact} />
  </>;
}

function DateField({ label, value, onChange, compact }: { label: string; value: string; onChange: (value: string) => void; compact: boolean }) {
  return <label className={compact ? "grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]" : "grid gap-2 text-sm font-semibold text-[var(--ink)]"}><span>{label}</span><span className="relative"><CalendarBlank className={`pointer-events-none absolute left-3 text-[var(--ink-muted)] ${compact ? "top-2.5" : "top-3.5"}`} size={16} /><input className={`${compact ? "field-control h-10 min-h-10 text-sm" : "field-control min-h-12 text-base"} pl-9`} type="date" value={value} onChange={(event) => onChange(event.target.value)} /></span></label>;
}
