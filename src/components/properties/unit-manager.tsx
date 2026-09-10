"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authenticatedFetch } from "@/lib/client-api";
import { AnimatePresence, motion } from "framer-motion";

export function UnitManager({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("Flat");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState(1);
  const [flatType, setFlatType] = useState("");
  const [floor, setFloor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await authenticatedFetch("/api/units", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ propertyId, prefix, start, count, flatType: flatType || undefined, floor: floor || undefined }),
    });
    setSaving(false);
    if (response.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not create units. Try again.");
    }
  }
  return (
    <>
      <Button
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Plus size={18} />
        Add units
      </Button>
      <AnimatePresence>{open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form
            onSubmit={submit}
            className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Unit generator</p>
                <h2 className="font-display mt-2 text-xl font-semibold">
                  Add flats or rooms
                </h2>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X />
              </Button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Name prefix">
                <Input
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                  required
                />
              </Field>
              <Field label="First flat / unit number" helper="Numbers and letters are accepted, for example 20, 20A or B12.">
                <Input
                  value={start}
                  onChange={(event) => setStart(event.target.value.toUpperCase())}
                  pattern="[A-Za-z0-9]+"
                  required
                />
              </Field>
              <Field label="How many">
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  required
                />
              </Field>
              <Field label="Flat type"><Input value={flatType} onChange={(event) => setFlatType(event.target.value)} placeholder="10-bed" /></Field>
              <Field label="Floor"><Input value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="Ground floor" /></Field>
            </div>
            <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--ink-muted)]">
              {count === 1 ? <>Creates <strong>{prefix} {start || "…"}</strong>.</> : <>Creates {count} numbered units, starting with <strong>{prefix} {start || "…"}</strong>.</>}
            </p>
            {error ? (
              <p
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating" : "Create units"}
              </Button>
            </div>
          </motion.form>
        </motion.div>
      )}</AnimatePresence>
    </>
  );
}
