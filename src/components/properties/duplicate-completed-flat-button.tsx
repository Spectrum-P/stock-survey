"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authenticatedFetch } from "@/lib/client-api";

export function DuplicateCompletedFlatButton({ surveyId, sourceName }: { surveyId: string; sourceName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function duplicate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(`/api/surveys/${surveyId}/duplicate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ unitName: name }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not duplicate this flat.");
      router.push(`/surveys/${body.surveyId}/workspace`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not duplicate this flat.");
    } finally { setBusy(false); }
  }

  return <>
    <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setName(""); setError(""); }}>Duplicate</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"><form onSubmit={duplicate} className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl"><p className="eyebrow">Copy completed flat</p><h2 className="mt-2 text-xl font-semibold">Duplicate {sourceName}</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">The new flat receives the completed survey’s assessment data, ready for review. Photographs are not copied.</p><div className="mt-5"><Field label="New flat name" htmlFor={`duplicate-flat-${surveyId}`} required><Input id={`duplicate-flat-${surveyId}`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Flat 20A" pattern="[A-Za-z0-9 ]+" required autoFocus /></Field></div>{error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Duplicating" : "Duplicate flat"}</Button></div></form></div> : null}
  </>;
}
