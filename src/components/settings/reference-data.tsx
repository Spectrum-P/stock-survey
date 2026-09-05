"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Plus } from "@/components/ui/icons";
import { catalog } from "@/lib/catalog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ReferenceData() {
  const [search, setSearch] = useState("");
  const rows = useMemo(() => catalog.filter((row) => `${row.category} ${row.name}`.toLowerCase().includes(search.toLowerCase())), [search]);
  return <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4"><label className="relative min-w-[260px] flex-1"><MagnifyingGlass className="absolute left-3 top-3.5 text-[var(--muted)]" /><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catalog" /></label><Button><Plus /> Add element</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-wider text-[var(--muted)]"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Element</th><th className="px-4 py-3">Typical life</th><th className="px-4 py-3">Construction options</th><th className="px-4 py-3">Defect options</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.category}-${row.name}`} className="border-t border-[var(--border)]"><td className="px-4 py-3"><Badge>{row.category}</Badge></td><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.lifespan} years</td><td className="px-4 py-3 text-[var(--muted)]">{row.constructionTypes.length}</td><td className="px-4 py-3 text-[var(--muted)]">{row.defectTypes.length}</td></tr>)}</tbody></table></div></Card>;
}
