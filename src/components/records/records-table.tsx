"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight, DownloadSimple, Funnel, MagnifyingGlass, X } from "@/components/ui/icons";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import type { SurveyRecord } from "@/lib/types";
import { downloadCsv } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { AnimatePresence, motion } from "framer-motion";
import { ExcelExportControls, type ExcelExportPropertyOption } from "@/components/records/excel-export";

const helper = createColumnHelper<SurveyRecord>();

export function RecordsTable({ records, exportOptions }: { records: SurveyRecord[]; exportOptions: ExcelExportPropertyOption[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "property", desc: false }, { id: "unit", desc: false }, { id: "surveyDate", desc: true }]);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [building, setBuilding] = useState("");
  const [property, setProperty] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<SurveyRecord | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("stock-records-view");
      if (!saved) return;
      const state = JSON.parse(saved) as { search?: string; condition?: string; priority?: string; status?: string; property?: string; building?: string; propertyType?: string; fromDate?: string; toDate?: string; columnVisibility?: Record<string, boolean> };
      setSearch(state.search ?? ""); setCondition(state.condition ?? ""); setPriority(state.priority ?? ""); setStatus(state.status ?? ""); setProperty(state.property ?? ""); setBuilding(state.building ?? ""); setPropertyType(state.propertyType ?? ""); setFromDate(state.fromDate ?? ""); setToDate(state.toDate ?? ""); setColumnVisibility(state.columnVisibility ?? {});
    } catch { /* ignore malformed local view state */ }
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  const filtered = useMemo(() => records.filter((record) => {
    const text = `${record.property} ${record.unit} ${record.component} ${record.element} ${record.defect}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!condition || record.condition === condition) && (!priority || record.priority === priority) && (!status || record.surveyStatus === status) && (!property || record.property === property) && (!building || record.building === building) && (!propertyType || record.propertyType === propertyType) && (!fromDate || record.surveyDate >= fromDate) && (!toDate || record.surveyDate <= toDate);
  }), [records, search, condition, priority, status, property, building, propertyType, fromDate, toDate]);

  const columns = useMemo(() => [
    helper.accessor("surveyDate", { header: "Survey date" }),
    helper.accessor("property", { header: "Property" }),
    helper.accessor("building", { header: "Building" }),
    helper.accessor("unit", { header: "Flat / unit" }),
    helper.accessor("flatType", { header: "Flat type" }),
    helper.accessor("floor", { header: "Floor" }),
    helper.accessor("component", { header: "Component" }),
    helper.accessor("element", { header: "Element" }),
    helper.accessor("defect", { header: "Defect" }),
    helper.accessor("condition", { header: "Condition", cell: ({ getValue }) => <Badge tone={getValue() === "D" ? "orange" : getValue() === "A" ? "green" : "neutral"}>{getValue()}</Badge> }),
    helper.accessor("priority", { header: "Priority", cell: ({ getValue }) => <Badge tone={getValue() === "1" ? "orange" : "neutral"}>P{getValue()}</Badge> }),
    helper.accessor("planningHorizon", { header: "Planning horizon" }),
    helper.accessor("remainingLife", { header: "Remaining life", cell: ({ getValue }) => `${getValue()} yrs` }),
    helper.accessor("replacementYear", { header: "Replacement year" }),
    helper.accessor("surveyStatus", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
    helper.accessor("photoCount", { header: "Photos" }),
    helper.accessor("estimatedCost", { header: "Cost", cell: ({ getValue }) => { const value = getValue(); return value === undefined ? "Not recorded" : `£${value.toLocaleString("en-GB")}`; } })
  ], []);

  const table = useReactTable({ data: filtered, columns, state: { sorting, columnVisibility }, onSortingChange: setSorting, onColumnVisibilityChange: setColumnVisibility, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } });

  function saveView() {
    window.localStorage.setItem("stock-records-view", JSON.stringify({ search, condition, priority, status, property, building, propertyType, fromDate, toDate, columnVisibility }));
  }

  function clearView() {
    setSearch(""); setCondition(""); setPriority(""); setStatus(""); setProperty(""); setBuilding(""); setPropertyType(""); setFromDate(""); setToDate(""); setColumnVisibility({}); window.localStorage.removeItem("stock-records-view");
  }

  function exportRows() {
    downloadCsv("stock-condition-records.csv", filtered.map((record) => ({
      "Survey date": record.surveyDate, Property: record.property, Building: record.building, "Property type": record.propertyType, Unit: record.unit, "Flat type": record.flatType, Floor: record.floor, Component: record.component, Element: record.element,
      Construction: record.construction, Defect: record.defect, Condition: record.condition, Priority: record.priority,
      "Planning horizon": record.planningHorizon, "Remaining life": record.remainingLife, "Replacement year": record.replacementYear,
      Status: record.surveyStatus, Surveyor: record.surveyor, Photos: record.photoCount, "Estimated cost": record.estimatedCost ?? ""
    })));
  }

  const activeFilterCount = [search, condition, priority, status, property, building, propertyType, fromDate, toDate].filter(Boolean).length;

  return <>
    <Card className="overflow-hidden p-0">
      <ExcelExportControls properties={exportOptions} />
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-3 md:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold shadow-sm transition-colors duration-150 hover:border-[var(--brand)] hover:text-[var(--brand)]"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          aria-controls="records-filter-dialog"
        >
          <Funnel size={18} /> Filters
          {activeFilterCount ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[11px] leading-4 text-white" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</span> : null}
        </button>
        <span className="text-xs font-medium text-[var(--muted)]">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
      </div>
      <div className="hidden gap-3 border-b border-[var(--border)] p-4 md:grid lg:grid-cols-[minmax(260px,1fr)_150px_150px_150px_170px_150px_150px_auto]">
        <label className="relative"><span className="sr-only">Search records</span><MagnifyingGlass className="absolute left-3 top-3.5 text-[var(--muted)]" size={17} /><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property, flat or defect" /></label>
        <Field label="Condition" hideLabel><select aria-label="Condition" className="field" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">All conditions</option>{["A", "B", "C", "D"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Priority" hideLabel><select aria-label="Priority" className="field" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priorities</option>{["1", "2", "3", "4"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Status" hideLabel><select aria-label="Status" className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></Field>
        <Field label="Property" hideLabel><select aria-label="Property" className="field" value={property} onChange={(event) => setProperty(event.target.value)}><option value="">All properties</option>{[...new Set(records.map((record) => record.property))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Building" hideLabel><select aria-label="Building" className="field" value={building} onChange={(event) => setBuilding(event.target.value)}><option value="">All buildings</option>{[...new Set(records.map((record) => record.building))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Property type" hideLabel><select aria-label="Property type" className="field" value={propertyType} onChange={(event) => setPropertyType(event.target.value)}><option value="">All property types</option>{[...new Set(records.map((record) => record.propertyType).filter((value) => value !== "Not recorded"))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <label className="grid gap-1 text-xs text-[var(--muted)]"><span>From date</span><input className="field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-[var(--muted)]"><span>To date</span><input className="field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <details className="relative"><summary className="field flex cursor-pointer list-none items-center justify-between">Columns <span aria-hidden>⌄</span></summary><div className="absolute right-0 z-10 mt-2 grid min-w-52 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">{table.getAllLeafColumns().map((column) => <label key={column.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />{String(column.columnDef.header)}</label>)}</div></details>
        <Button variant="ghost" onClick={saveView}>Save view</Button><Button variant="ghost" onClick={clearView}>Clear</Button>
        <Button variant="secondary" onClick={exportRows}><DownloadSimple size={17} /> Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1250px] w-full text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="px-4 py-3 font-semibold"><button className="flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}</button></th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row, index) => { const previous = table.getRowModel().rows[index - 1]?.original; const newFlat = !previous || previous.propertyId !== row.original.propertyId || previous.unit !== row.original.unit; return <Fragment key={row.id}>{newFlat ? <tr className="border-t-2 border-[var(--brand)] bg-[var(--blue-soft)]"><td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-2 text-xs font-semibold text-[var(--brand)]">{row.original.building} · {row.original.property} · {row.original.unit}{row.original.flatType !== "Not recorded" ? ` · ${row.original.flatType}` : ""}</td></tr> : null}<tr className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-subtle)]" onClick={() => setSelected(row.original)}>{row.getVisibleCells().map((cell) => <td key={cell.id} className="whitespace-nowrap px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr></Fragment>; })}</tbody>
        </table>
        {!filtered.length && <div className="p-12 text-center text-sm text-[var(--muted)]"><Funnel size={28} className="mx-auto mb-3" />No records match these filters.</div>}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"><span>{filtered.length} records · Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span><div className="flex gap-2"><Button size="icon" variant="ghost" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><CaretLeft /></Button><Button size="icon" variant="ghost" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><CaretRight /></Button></div></div>
    </Card>

    <AnimatePresence initial={false}>{filtersOpen ? <motion.div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-3 backdrop-blur-[2px] md:hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}
    ><motion.section
      id="records-filter-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="records-filter-title"
      className="max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div><p className="eyebrow">Records scope</p><h2 id="records-filter-title" className="mt-1 text-xl font-semibold">Filters</h2></div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setFiltersOpen(false)} aria-label="Close filters" autoFocus><X size={20} /></Button>
      </header>
      <div className="grid gap-4 p-4">
        <Field label="Search records"><span className="relative block"><MagnifyingGlass className="absolute left-3 top-3.5 text-[var(--muted)]" size={17} /><input aria-label="Search records" className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property, flat or defect" /></span></Field>
        <Field label="Condition"><select aria-label="Condition" className="field" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">All conditions</option>{["A", "B", "C", "D"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Priority"><select aria-label="Priority" className="field" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priorities</option>{["1", "2", "3", "4"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Status"><select aria-label="Status" className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></Field>
        <Field label="Property"><select aria-label="Property" className="field" value={property} onChange={(event) => setProperty(event.target.value)}><option value="">All properties</option>{[...new Set(records.map((record) => record.property))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Building"><select aria-label="Building" className="field" value={building} onChange={(event) => setBuilding(event.target.value)}><option value="">All buildings</option>{[...new Set(records.map((record) => record.building))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Property type"><select aria-label="Property type" className="field" value={propertyType} onChange={(event) => setPropertyType(event.target.value)}><option value="">All property types</option>{[...new Set(records.map((record) => record.propertyType).filter((value) => value !== "Not recorded"))].sort().map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="From date"><input aria-label="From date" className="field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
        <Field label="To date"><input aria-label="To date" className="field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
        <details><summary className="field flex cursor-pointer list-none items-center justify-between">Columns <span aria-hidden>⌄</span></summary><div className="mt-2 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">{table.getAllLeafColumns().map((column) => <label key={column.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />{String(column.columnDef.header)}</label>)}</div></details>
        <div className="grid grid-cols-2 gap-3"><Button variant="secondary" onClick={saveView}>Save view</Button><Button variant="secondary" onClick={exportRows}><DownloadSimple size={17} /> Export CSV</Button></div>
      </div>
      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4">
        <Button type="button" variant="secondary" onClick={clearView}>Clear</Button>
        <Button type="button" onClick={() => setFiltersOpen(false)}>Show {filtered.length} result{filtered.length === 1 ? "" : "s"}</Button>
      </footer>
    </motion.section></motion.div> : null}</AnimatePresence>

    <AnimatePresence>{selected ? <motion.div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setSelected(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.aside className="h-full w-full max-w-lg overflow-y-auto bg-[var(--surface)] p-6" onClick={(event) => event.stopPropagation()} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 32 }}><div className="mb-8 flex items-start justify-between"><div><p className="eyebrow">Element record</p><h2 className="font-display mt-2 text-2xl font-semibold">{selected.element}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.property} · {selected.unit}</p></div><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setSelected(null)}><X /></Button></div><div className="grid grid-cols-2 gap-4">{[["Survey date", selected.surveyDate], ["Building", selected.building], ["Construction", selected.construction], ["Condition", selected.condition], ["Priority", `P${selected.priority}`], ["Planning horizon", selected.planningHorizon], ["Remaining life", `${selected.remainingLife} years`], ["Replacement year", selected.replacementYear], ["Estimated cost", selected.estimatedCost === undefined ? "Not recorded" : `£${selected.estimatedCost.toLocaleString("en-GB")}`], ["Surveyor", selected.surveyor]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div><div className="mt-5 rounded-xl border-l-4 border-[var(--orange)] bg-[var(--orange-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--orange)]">Recorded defect</p><p className="mt-2 font-medium">{selected.defect}</p>{selected.defectCause ? <p className="mt-2 text-sm text-[var(--muted)]">Cause: {selected.defectCause}</p> : null}</div><div className="mt-5 rounded-xl border border-[var(--border)] p-4 text-sm"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Recommended works</p><p className="mt-2">{selected.recommendedWorks || "Not recorded"}</p></div><div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">{selected.photoCount} linked photograph{selected.photoCount === 1 ? "" : "s"}</div></motion.aside></motion.div> : null}</AnimatePresence>
  </>;
}
