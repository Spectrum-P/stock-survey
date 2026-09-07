"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Buildings, Check } from "@/components/ui/icons";
import Link from "next/link";
import { propertySchema } from "@/lib/schemas";
import type { PropertyInput } from "@/lib/types";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/client-api";

const propertyTypes = ["House", "Bungalow", "Flat", "Maisonette", "Park home"] as const;

export function PropertyForm({ propertyId, initialValues }: { propertyId?: string; initialValues?: Partial<PropertyInput> }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const editing = Boolean(propertyId);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PropertyInput>({ resolver: zodResolver(propertySchema), defaultValues: { town: "", postcode: "", propertyType: "House", ...initialValues } });
  async function onSubmit(values: PropertyInput) {
    setServerError("");
    const response = await authenticatedFetch(editing ? `/api/properties/${propertyId}` : "/api/properties", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) { const body = await response.json().catch(() => null); setServerError(body?.error ?? `Could not ${editing ? "update" : "create"} the property. Try again.`); return; }
    const property = await response.json();
    router.push(`/properties/${property.id}`);
    router.refresh();
  }
  return <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[1fr_340px]">
    <Card className="grid gap-5 p-5 sm:p-7">
      <div><h2 className="text-lg font-semibold">Property details</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">Use the official portfolio name and postal address.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Property name" htmlFor="name" required error={errors.name?.message}><Input id="name" {...register("name")} placeholder="Bishop Hall" aria-invalid={Boolean(errors.name)} /></Field></div>
        <Field label="Building name" htmlFor="buildingName" helper="Use this when several buildings share one property or postcode."><Input id="buildingName" {...register("buildingName")} placeholder="Bishop Hall" /></Field>
        <Field label="Property type" htmlFor="propertyType" required error={errors.propertyType?.message} helper="Used by dashboard filters."><Select id="propertyType" {...register("propertyType")} aria-invalid={Boolean(errors.propertyType)}>{propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Field label="Address line 1" htmlFor="addressLine1" required error={errors.addressLine1?.message}><Input id="addressLine1" {...register("addressLine1")} placeholder="Kingston Lane" aria-invalid={Boolean(errors.addressLine1)} /></Field></div>
        <Field label="Address line 2" htmlFor="addressLine2"><Input id="addressLine2" {...register("addressLine2")} /></Field>
        <Field label="Town or city" htmlFor="town" required error={errors.town?.message}><Input id="town" {...register("town")} aria-invalid={Boolean(errors.town)} /></Field>
        <Field label="Postcode" htmlFor="postcode" required error={errors.postcode?.message}><Input id="postcode" {...register("postcode")} className="uppercase" aria-invalid={Boolean(errors.postcode)} /></Field>
        <Field label="Construction year" htmlFor="constructionYear" helper="Used as property context, not for element lifecycle calculations." error={errors.constructionYear?.message}><Input id="constructionYear" type="number" {...register("constructionYear", { setValueAs: (value) => value === "" ? undefined : Number(value) })} /></Field>
        <Field label="Number of storeys" htmlFor="numberOfStoreys" error={errors.numberOfStoreys?.message}><Input id="numberOfStoreys" type="number" min="1" max="200" {...register("numberOfStoreys", { setValueAs: (value) => value === "" ? undefined : Number(value) })} /></Field>
        <Field label="Portfolio reference" htmlFor="reference"><Input id="reference" {...register("reference")} placeholder="BH-001" /></Field>
      </div>
      {serverError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200" role="alert">{serverError}</div> : null}
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end"><Link href={editing ? `/properties/${propertyId}` : "/properties"}><Button variant="secondary"><ArrowLeft size={18} />Cancel</Button></Link><Button type="submit" disabled={isSubmitting}><Check size={18} />{isSubmitting ? "Saving" : editing ? "Save changes" : "Create property"}</Button></div>
    </Card>
    <aside><Card className="sticky top-24 p-5"><div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-[var(--brand)] dark:bg-blue-950/60"><Buildings size={23} weight="duotone" /></div><h2 className="mt-5 text-lg font-semibold">{editing ? "Property management" : "What happens next"}</h2><ol className="mt-4 grid gap-4 text-sm leading-6 text-[var(--ink-muted)]"><li><strong className="text-[var(--ink)]">1. Add units on demand</strong><br />No units are created automatically. Add one or generate a batch only when needed.</li><li><strong className="text-[var(--ink)]">2. Start a survey</strong><br />Open any unit and create its inspection.</li><li><strong className="text-[var(--ink)]">3. Track progress</strong><br />Review completion and findings across the property.</li></ol></Card></aside>
  </form>;
}
