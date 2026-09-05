"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle } from "@/components/ui/icons";
import type { PropertySummary } from "@/lib/types";
import type { ReportFlatScope } from "@/lib/data";
import { authenticatedFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function ReportGenerator({ properties, flats }: { properties: PropertySummary[]; flats: ReportFlatScope[] }) {
  const router = useRouter();
  const [scope, setScope] = useState("portfolio");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [surveyId, setSurveyId] = useState(flats[0]?.surveyId ?? "");
  const unitOptions = flats.filter((flat) => flat.propertyId === propertyId);
  const selectedProperty = properties.find((property) => property.id === propertyId);
  const surveyedFlatCount = new Set(unitOptions.map((flat) => flat.surveyId)).size;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function changeScope(nextScope: string) {
    setScope(nextScope);
    if (nextScope === "unit" && !flats.some((flat) => flat.propertyId === propertyId && flat.surveyId === surveyId)) {
      setSurveyId(flats.find((flat) => flat.propertyId === propertyId)?.surveyId ?? "");
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const selectedScope = scope === "portfolio" ? { kind: "portfolio" } : scope === "unit" ? { kind: "survey", surveyId } : { kind: "property", propertyId };
      const response = await authenticatedFetch("/api/reports/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope: selectedScope, reportType: "stock_condition" }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const providerMessage = body?.details?.providerMessage;
        const requestId = body?.details?.requestId;
        setError(
          [
            providerMessage ?? body?.error ?? "Could not generate the report.",
            requestId ? `Request ID: ${requestId}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        );
        return;
      }
      const reportId = body?.reportId ?? body?.id;
      if (!reportId) throw new Error("The server did not return a report ID.");
      router.push(`/reports/${reportId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the report.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[220px_minmax(220px,1fr)_auto] sm:items-end">
    <Field label="What should this report cover?" htmlFor="report-scope"><select id="report-scope" aria-label="Report scope" className="field-control" value={scope} onChange={(event) => changeScope(event.target.value)}><option value="portfolio">All properties and flats</option><option value="property">One property — all flats</option><option value="unit">One specific flat</option></select></Field>
    {scope === "property" ? <Field label="Property" htmlFor="report-property"><select id="report-property" className="field-control" value={propertyId} onChange={(event) => { const next = event.target.value; setPropertyId(next); setSurveyId(flats.find((flat) => flat.propertyId === next)?.surveyId ?? ""); }}>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></Field> : scope === "unit" ? <><Field label="Property" htmlFor="report-property"><select id="report-property" className="field-control" value={propertyId} onChange={(event) => { const next = event.target.value; setPropertyId(next); setSurveyId(flats.find((flat) => flat.propertyId === next)?.surveyId ?? ""); }}>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></Field><Field label="Unit" htmlFor="report-unit"><select id="report-unit" className="field-control" value={surveyId} onChange={(event) => setSurveyId(event.target.value)}><option value="" disabled>Select a surveyed unit</option>{unitOptions.map((flat) => <option key={flat.surveyId} value={flat.surveyId}>{flat.unitName}</option>)}</select></Field></> : <div className="hidden sm:block" />}
    <Button onClick={generate} disabled={busy || (scope === "property" && !propertyId) || (scope === "unit" && !surveyId)}><Sparkle size={18} />{busy ? "Generating" : "Generate report"}</Button>
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-muted)] sm:col-span-3" aria-live="polite">
      {scope === "portfolio" ? <><strong className="text-[var(--ink)]">All properties and flats:</strong> includes every surveyed property and flat in the organisation.</> : scope === "property" ? <><strong className="text-[var(--ink)]">{selectedProperty?.name ?? "Selected property"} — all flats:</strong> includes all {surveyedFlatCount} surveyed {surveyedFlatCount === 1 ? "flat" : "flats"} in this property.</> : <><strong className="text-[var(--ink)]">One specific flat:</strong> includes only {unitOptions.find((flat) => flat.surveyId === surveyId)?.unitName ?? "the selected flat"} at {selectedProperty?.name ?? "the selected property"}.</>}
    </div>
    {error ? <p className="text-sm text-[var(--danger)] sm:col-span-3" role="alert">{error}</p> : null}
  </div>;
}
