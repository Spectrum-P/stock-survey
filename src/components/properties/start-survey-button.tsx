"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/client-api";

export function StartSurveyButton({ propertyId, unitId, compact = false }: { propertyId: string; unitId: string; compact?: boolean }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function start() { setLoading(true); setError(""); const response = await authenticatedFetch("/api/surveys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ propertyId, unitId, inspectionDate: new Date().toISOString().slice(0, 10) }) }); if (response.ok) { const survey = await response.json(); router.push(`/surveys/${survey.id}/workspace`); } else { setLoading(false); const body = await response.json().catch(() => null); setError(body?.error ?? "Could not open this survey."); } }
  return <span className="inline-flex items-center gap-2">{error ? <span className="text-xs text-red-700 dark:text-red-300" role="alert">{error}</span> : null}<Button size={compact ? "sm" : "md"} variant={compact ? "ghost" : "primary"} onClick={start} disabled={loading}>{loading ? "Opening" : "Survey"}<ArrowRight /></Button></span>;
}
