"use client";

import { useMemo, useState } from "react";
import { DownloadSimple, SpinnerGap } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authenticatedFetch } from "@/lib/client-api";

export interface ExcelExportPropertyOption {
  id: string;
  name: string;
  units: Array<{ id: string; name: string; surveyId: string }>;
}

async function downloadExcel(url: string) {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "The Excel export could not be generated",
    );
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ?? "stock-condition.xlsx";
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ExcelExportButton({
  url,
  label,
  disabled = false,
  size = "md",
  variant = "secondary",
}: {
  url: string;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "icon";
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "ghost";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await downloadExcel(url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The Excel export could not be generated",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-1">
      <Button
        variant={variant}
        size={size}
        disabled={disabled || busy}
        onClick={run}
        title={disabled ? "No completed survey is available" : undefined}
      >
        {busy ? (
          <SpinnerGap className="animate-spin" size={17} />
        ) : (
          <DownloadSimple size={17} />
        )}
        {busy ? "Preparing…" : label}
      </Button>
      {error ? (
        <p
          role="alert"
          className="max-w-64 text-right text-xs text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ExcelExportControls({
  properties,
}: {
  properties: ExcelExportPropertyOption[];
}) {
  const [scope, setScope] = useState<"property" | "unit">("property");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId),
    [properties, propertyId],
  );
  const [surveyId, setSurveyId] = useState(
    properties[0]?.units[0]?.surveyId ?? "",
  );

  function selectProperty(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setSurveyId(
      properties.find((property) => property.id === nextPropertyId)?.units[0]
        ?.surveyId ?? "",
    );
  }

  const url =
    scope === "property"
      ? `/api/records/export/excel?scope=property&propertyId=${encodeURIComponent(propertyId)}`
      : `/api/records/export/excel?scope=unit&surveyId=${encodeURIComponent(surveyId)}`;
  const disabled = !propertyId || (scope === "unit" && !surveyId);

  if (!properties.length)
    return (
      <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
        Complete a unit survey to enable Excel exports.
      </div>
    );

  return (
    <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-4 lg:grid-cols-[180px_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
      <Field label="Excel scope" htmlFor="excel-export-scope">
        <select
          id="excel-export-scope"
          className="field"
          value={scope}
          onChange={(event) =>
            setScope(event.target.value as "property" | "unit")
          }
        >
          <option value="property">Whole property</option>
          <option value="unit">Single unit</option>
        </select>
      </Field>
      <Field label="Property" htmlFor="excel-export-property">
        <select
          id="excel-export-property"
          className="field"
          value={propertyId}
          onChange={(event) => selectProperty(event.target.value)}
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </Field>
      {scope === "unit" ? (
        <Field label="Flat / unit" htmlFor="excel-export-unit">
          <select
            id="excel-export-unit"
            className="field"
            value={surveyId}
            onChange={(event) => setSurveyId(event.target.value)}
          >
            {(selectedProperty?.units ?? []).map((unit) => (
              <option key={unit.surveyId} value={unit.surveyId}>
                {unit.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="hidden lg:block" />
      )}
      <ExcelExportButton
        url={url}
        label={
          scope === "property" ? "Export property Excel" : "Export unit Excel"
        }
        disabled={disabled}
        variant="primary"
      />
    </div>
  );
}
