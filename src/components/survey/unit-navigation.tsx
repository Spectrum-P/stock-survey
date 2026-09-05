"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CaretDown } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface UnitOption { id: string; name: string; surveyId?: string }

export function UnitNavigation({ surveyId, propertyId, currentUnitId, units }: { surveyId: string; propertyId: string; currentUnitId: string; units: UnitOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"next" | "previous" | "picker" | "">("");
  const [error, setError] = useState("");
  const index = units.findIndex((unit) => unit.id === currentUnitId);
  const previous = index > 0 ? units[index - 1] : undefined;
  const next = index >= 0 && index < units.length - 1 ? units[index + 1] : undefined;

  async function move(direction: "next" | "previous") {
    setLoading(direction); setError("");
    const response = await authenticatedFetch("/api/surveys/next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ surveyId, direction }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "Could not open the adjacent apartment."); setLoading(""); return; }
    const result = await response.json() as { surveyId: string };
    router.push(`/surveys/${result.surveyId}/workspace`);
  }

  async function openUnit(unitId: string) {
    setLoading("picker"); setError("");
    const response = await authenticatedFetch("/api/surveys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ propertyId, unitId, inspectionDate: new Date().toISOString().slice(0, 10) }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "Could not open that apartment."); setLoading(""); return; }
    const result = await response.json() as { id: string };
    router.push(`/surveys/${result.id}/workspace`);
  }

  return <div className="flex flex-wrap items-center gap-2"><motion.div whileTap={{ scale: 0.97 }}><Button variant="secondary" size="sm" disabled={!previous || Boolean(loading)} onClick={() => move("previous")}><ArrowLeft size={16} />Previous</Button></motion.div><motion.div whileTap={{ scale: 0.97 }}><Button variant="secondary" size="sm" disabled={!next || Boolean(loading)} onClick={() => move("next")}>{loading === "next" ? "Opening" : "Next apartment"}<ArrowRight size={16} /></Button></motion.div><label className="relative"><span className="sr-only">Choose apartment</span><select className="field-control min-h-10 appearance-none pr-9 text-sm font-semibold" value={currentUnitId} onChange={(event) => openUnit(event.target.value)} disabled={Boolean(loading)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><CaretDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" /></label>{error ? <span className="basis-full text-xs text-[var(--danger)]" role="alert">{error}</span> : null}</div>;
}
