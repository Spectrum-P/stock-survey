"use client";

import { CalendarBlank, DownloadSimple, Funnel } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import type { PropertySummary } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface DashboardFiltersProps {
  properties: PropertySummary[];
  buildings: string[];
  propertyTypes: string[];
  values: {
    propertyId?: string;
    building?: string;
    propertyType?: string;
    from?: string;
    to?: string;
  };
}

export function DashboardFilters({
  properties,
  buildings,
  propertyTypes,
  values,
}: DashboardFiltersProps) {
  const router = useRouter();
  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const next = { ...values, [key]: value };
    Object.entries(next).forEach(([name, item]) => {
      if (item) params.set(name, item);
    });
    router.push(
      `/dashboard${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }
  function exportDashboard() {
    window.print();
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 print:hidden">
      <label className="grid min-w-36 gap-1 text-xs font-semibold text-[var(--ink-muted)]">
        <span>Property</span>
        <select
          className="field-control h-10 min-h-10 text-sm"
          value={values.propertyId ?? ""}
          onChange={(event) => update("propertyId", event.target.value)}
        >
          <option value="">All properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]">
        <span>Building</span>
        <select
          className="field-control h-10 min-h-10 text-sm"
          value={values.building ?? ""}
          onChange={(event) => update("building", event.target.value)}
        >
          <option value="">All buildings</option>
          {buildings.map((building) => (
            <option key={building}>{building}</option>
          ))}
        </select>
      </label>
      <label className="grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]">
        <span>Property type</span>
        <select
          className="field-control h-10 min-h-10 text-sm"
          value={values.propertyType ?? ""}
          onChange={(event) => update("propertyType", event.target.value)}
        >
          <option value="">All types</option>
          {propertyTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]">
        <span>From</span>
        <span className="relative">
          <CalendarBlank
            className="pointer-events-none absolute left-3 top-2.5 text-[var(--ink-muted)]"
            size={16}
          />
          <input
            className="field-control h-10 min-h-10 pl-9 text-sm"
            type="date"
            value={values.from ?? ""}
            onChange={(event) => update("from", event.target.value)}
          />
        </span>
      </label>
      <label className="grid min-w-32 gap-1 text-xs font-semibold text-[var(--ink-muted)]">
        <span>To</span>
        <span className="relative">
          <CalendarBlank
            className="pointer-events-none absolute left-3 top-2.5 text-[var(--ink-muted)]"
            size={16}
          />
          <input
            className="field-control h-10 min-h-10 pl-9 text-sm"
            type="date"
            value={values.to ?? ""}
            onChange={(event) => update("to", event.target.value)}
          />
        </span>
      </label>
      <Button variant="secondary" className="h-10" onClick={exportDashboard}>
        <DownloadSimple size={17} />
        Export
      </Button>
      <span className="ml-auto hidden items-center gap-1 text-xs text-[var(--ink-muted)] lg:flex">
        <Funnel size={15} />
        Filters update all panels
      </span>
    </div>
  );
}
