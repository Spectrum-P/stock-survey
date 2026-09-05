"use client";

import { useState } from "react";
import { Plus, X } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AnimatePresence, motion } from "framer-motion";

export function CustomElementManager({ surveyId, componentName }: { surveyId: string; componentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    const response = await authenticatedFetch("/api/survey-elements/custom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ surveyId, componentName, elementName: name }) });
    setSaving(false);
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? "Could not add this element."); return; }
    const result = await response.json() as { id: string };
    router.push(`/surveys/${surveyId}/element/${result.id}`);
  }

  return <>
    <Button size="sm" variant="ghost" onClick={() => { setName(""); setError(""); setOpen(true); }}><Plus size={16} />Add element</Button>
    <AnimatePresence>{open ? <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><div className="flex items-start justify-between"><div><p className="eyebrow">Custom survey element</p><h2 className="mt-2 text-xl font-semibold">Add under {componentName}</h2></div><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close"><X /></Button></div><div className="mt-6"><Field label="Element name" htmlFor="custom-element-name" required helper="This value is saved to this survey only."><Input id="custom-element-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Bin store doors" required autoFocus /></Field></div>{error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Adding" : "Add element"}</Button></div></motion.form></motion.div> : null}</AnimatePresence>
  </>;
}
