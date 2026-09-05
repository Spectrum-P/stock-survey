"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle, FloppyDisk, Plus, Trash, Warning } from "@/components/ui/icons";
import { catalog as fallbackCatalog, categories as fallbackCategories, conditionOptions, priorityOptions, type CatalogElement } from "@/lib/catalog";
import { averageLifespan, calculateLifecycle } from "@/lib/lifecycle";
import { offlineDb, queueMedia, queueMutation, saveDraft, syncQueuedMedia } from "@/lib/offline/db";
import { useSurveyDraftStore } from "@/lib/store/survey-draft";
import type { SurveyElementDraft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/client-api";
import { PhotoGallery } from "@/components/survey/photo-gallery";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/loading-skeleton";

const steps = ["Element", "Construction", "Defects", "Lifecycle", "Works", "Review"];

function newDraft(surveyId: string, elementName: string, sourceCatalog = fallbackCatalog): SurveyElementDraft {
  const selected = sourceCatalog.find((item) => item.name === elementName) ?? sourceCatalog[0] ?? fallbackCatalog[0];
  return {
    id: crypto.randomUUID(), surveyId, category: selected.category, element: selected.name, categoryId: undefined, elementId: undefined, accessibility: "inspection_required", accessibilityReason: "", constructionType: "", constructionNotes: "", installationYear: undefined, typicalLifeYears: averageLifespan(selected.lifespanLabel, selected.lifespan), lifeReference: selected.lifespanLabel, remainingLife: undefined, replacementYear: undefined, planningHorizon: "", planningOverrideReason: "", estimatedCost: undefined, costBasis: "", defects: [{ id: crypto.randomUUID(), defectType: "No defect observed", cause: "", condition: "A", priority: "4", notes: "", photoIds: [] }], recommendedWorks: "", generalNotes: "", accessLimitations: "", furtherInvestigation: false, mediaIds: [], status: "not_started", version: 0, updatedAt: new Date().toISOString()
  };
}

export function ElementStepper({ surveyId, initialElement, initialDraft, catalogItems }: { surveyId: string; initialElement: string; initialDraft?: SurveyElementDraft; catalogItems?: CatalogElement[] }) {
  const router = useRouter();
  const { draft, step, setDraft, patchDraft, setStep, addFinding, patchFinding, removeFinding, reset } = useSurveyDraftStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const referenceCatalog = catalogItems ?? fallbackCatalog;
  const referenceCategories = [...new Set(referenceCatalog.map((item) => item.category))];
  const catalog = referenceCatalog;
  const categories = referenceCategories.length ? referenceCategories : fallbackCategories;

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const stored = await offlineDb()?.drafts.where("surveyId").equals(surveyId).filter((item) => item.element === initialElement).first();
      if (active) {
        setDraft(stored ?? initialDraft ?? newDraft(surveyId, initialElement, referenceCatalog));
        const savedStep = Number(window.localStorage.getItem(`survey-step:${surveyId}:${initialElement}`) ?? 0);
        setStep(Math.min(5, Math.max(0, savedStep)));
        setLoading(false);
      }
    }
    hydrate();
    return () => { active = false; reset(); };
  }, [initialDraft, initialElement, referenceCatalog, reset, setDraft, setStep, surveyId]);

  useEffect(() => {
    if (!loading) window.localStorage.setItem(`survey-step:${surveyId}:${initialElement}`, String(step));
  }, [initialElement, loading, step, surveyId]);

  useEffect(() => {
    if (!draft) return;
    const timer = window.setTimeout(() => saveDraft(draft), 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const selectedCatalog = useMemo(() => referenceCatalog.find((item) => item.name === draft?.element) ?? { constructionTypes: [] as string[], defectTypes: [] as string[] }, [draft?.element, referenceCatalog]);
  const constructionOptions = selectedCatalog?.constructionTypes ?? [];
  const defectOptions = selectedCatalog?.defectTypes ?? [];
  const lifecycle = useMemo(() => calculateLifecycle(draft?.installationYear, draft?.typicalLifeYears), [draft?.installationYear, draft?.typicalLifeYears]);
  const photoIds = draft ? [...draft.mediaIds, ...draft.defects.flatMap((finding) => finding.photoIds)] : [];
  const photoKey = photoIds.join("|");
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setPhotoPreviews({});
    async function hydratePhotoPreviews() {
      const db = offlineDb();
      const ids = photoKey ? photoKey.split("|") : [];
      if (!ids.length) return;
      const items = db ? await Promise.all(ids.map((id) => db.media.get(id))) : [];
      const next: Record<string, string> = {};
      const localIds = new Set<string>();
      for (const item of items) {
        if (!item) continue;
        const url = URL.createObjectURL(item.blob);
        urls.push(url);
        next[item.id] = url;
        localIds.add(item.id);
      }
      const missingIds = ids.filter((id) => !localIds.has(id));
      if (missingIds.length && navigator.onLine) {
        try {
          const response = await authenticatedFetch(`/api/media/preview?ids=${encodeURIComponent(missingIds.join(","))}`);
          if (response.ok) {
            const body = await response.json() as { urls?: Record<string, string> };
            Object.assign(next, body.urls ?? {});
          }
        } catch {
          // The offline preview remains available when the signed URL request cannot be reached.
        }
      }
      if (cancelled) {
        urls.forEach((url) => URL.revokeObjectURL(url));
      } else {
        setPhotoPreviews(next);
      }
    }
    hydratePhotoPreviews();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoKey]);

  useEffect(() => {
    if (!draft) return;
    if (draft.remainingLife !== (lifecycle.remainingLife ?? undefined) || draft.replacementYear !== (lifecycle.replacementYear ?? undefined)) {
      patchDraft({ remainingLife: lifecycle.remainingLife ?? undefined, replacementYear: lifecycle.replacementYear ?? undefined, planningHorizon: draft.planningOverrideReason ? draft.planningHorizon : lifecycle.suggestedHorizon });
    }
  }, [draft, lifecycle, patchDraft]);

  if (loading || !draft) return <Card className="p-6"><div className="grid gap-3"><Skeleton className="h-7 w-52" /><Skeleton className="h-11" /><Skeleton className="h-32" /></div></Card>;

  function changeCategory(category: string) {
    const first = referenceCatalog.find((item) => item.category === category) ?? referenceCatalog[0] ?? fallbackCatalog[0];
    patchDraft({ category, categoryId: undefined, customComponentName: undefined, element: first.name, elementId: undefined, customElementName: undefined, typicalLifeYears: averageLifespan(first.lifespanLabel, first.lifespan), lifeReference: first.lifespanLabel, constructionType: "", defects: [] });
  }
  function changeElement(element: string) {
    const item = referenceCatalog.find((candidate) => candidate.name === element) ?? referenceCatalog[0] ?? fallbackCatalog[0];
    patchDraft({ element, category: item.category, categoryId: undefined, customComponentName: undefined, elementId: undefined, customElementName: undefined, typicalLifeYears: averageLifespan(item.lifespanLabel, item.lifespan), lifeReference: item.lifespanLabel, constructionType: "", defects: [] });
  }
  async function addPhotos(files: FileList | null, findingIndex?: number) {
    if (!files?.length) return;
    const current = useSurveyDraftStore.getState().draft;
    if (!current) return;
    const existingIds = findingIndex === undefined ? current.mediaIds : current.defects[findingIndex]?.photoIds ?? [];
    const remaining = 4 - existingIds.length;
    if (remaining <= 0) {
      setPhotoError("A maximum of 4 photographs can be attached here.");
      return;
    }
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setPhotoError("Please select an image file.");
      return;
    }
    const selectedFiles = imageFiles.slice(0, remaining);
    setPhotoError(imageFiles.length > remaining ? `Only ${remaining} more photograph${remaining === 1 ? "" : "s"} can be added here.` : "");
    const ids: string[] = [];
    for (const file of selectedFiles) {
      const id = crypto.randomUUID(); ids.push(id);
      await queueMedia({ id, surveyId, surveyElementId: current.id, findingId: findingIndex === undefined ? undefined : current.defects[findingIndex]?.id, filename: file.name, contentType: file.type, blob: file, status: "queued", createdAt: new Date().toISOString() });
    }
    if (navigator.onLine) {
      await syncQueuedMedia();
    }
    if (findingIndex === undefined) patchDraft({ mediaIds: [...current.mediaIds, ...ids] });
    else patchFinding(findingIndex, { photoIds: [...current.defects[findingIndex].photoIds, ...ids] });
  }
  async function deleteStoredPhoto(targetId: string) {
    const db = offlineDb();
    const local = await db?.media.get(targetId);
    if (local && local.status !== "uploaded") {
      await db?.media.delete(targetId);
      return true;
    }
    if (!navigator.onLine) {
      setPhotoError("Reconnect to remove an uploaded photograph.");
      return false;
    }
    try {
      const response = await authenticatedFetch(`/api/media/${targetId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      await db?.media.delete(targetId);
      return true;
    } catch {
      setPhotoError("The photograph could not be removed. Try again.");
      return false;
    }
  }
  async function replacePhoto(targetId: string, file: File, findingIndex?: number) {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.");
      return;
    }
    const current = useSurveyDraftStore.getState().draft;
    if (!current) return;
    const ids = findingIndex === undefined ? current.mediaIds : current.defects[findingIndex]?.photoIds ?? [];
    if (!ids.includes(targetId)) return;
    if (!(await deleteStoredPhoto(targetId))) return;
    const id = crypto.randomUUID();
    await queueMedia({ id, surveyId, surveyElementId: current.id, findingId: findingIndex === undefined ? undefined : current.defects[findingIndex]?.id, filename: file.name, contentType: file.type, blob: file, status: "queued", createdAt: new Date().toISOString() });
    const nextIds = ids.map((item) => item === targetId ? id : item);
    if (findingIndex === undefined) patchDraft({ mediaIds: nextIds });
    else patchFinding(findingIndex, { photoIds: nextIds });
    setPhotoError("");
  }
  async function removePhoto(targetId: string, findingIndex?: number) {
    const current = useSurveyDraftStore.getState().draft;
    if (!current) return;
    if (!(await deleteStoredPhoto(targetId))) return;
    if (findingIndex === undefined) patchDraft({ mediaIds: current.mediaIds.filter((id) => id !== targetId) });
    else patchFinding(findingIndex, { photoIds: current.defects[findingIndex].photoIds.filter((id) => id !== targetId) });
    setPhotoError("");
  }
  function validationMessage() {
    const current = useSurveyDraftStore.getState().draft;
    if (!current) return "The draft is not available.";
    if (!current.category || !current.element) return "Select a component and element.";
    if (current.accessibility === "inaccessible" && !current.accessibilityReason.trim()) return "Explain why this element is inaccessible.";
    if (current.accessibility !== "inspection_required") return "";
    if (!current.constructionType.trim()) return "Enter a construction type.";
    if (current.defects.some((finding) => !finding.condition || !finding.priority)) return "Complete the condition and priority for every finding. Defect description is optional.";
    if (!current.planningHorizon) return "Confirm the planning horizon.";
    return "";
  }
  async function submit(status: "partial" | "completed") {
    const current = useSurveyDraftStore.getState().draft;
    if (!current) return;
    const validation = status === "completed" ? validationMessage() : "";
    if (validation) { setError(validation); return; }
    setSaving(true); setError("");
    const finalStatus: SurveyElementDraft["status"] = status === "partial" ? "partial" : current.accessibility === "not_applicable" ? "not_applicable" : current.accessibility === "inaccessible" ? "inaccessible" : "completed";
    const payload: SurveyElementDraft = { ...current, status: finalStatus, remainingLife: lifecycle.remainingLife ?? undefined, replacementYear: lifecycle.replacementYear ?? undefined, version: current.version + 1, updatedAt: new Date().toISOString() };
    await saveDraft(payload);
    const mutationId = crypto.randomUUID();
    if (navigator.onLine) {
      try {
        const response = await authenticatedFetch("/api/survey-elements", { method: "PUT", headers: { "Content-Type": "application/json", "X-Mutation-Id": mutationId }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(await response.text());
      } catch {
        await queueMutation({ id: mutationId, entity: "survey_element", operation: "upsert", entityId: payload.id, expectedVersion: current.version, payload, createdAt: new Date().toISOString(), attempts: 0, status: "queued" });
      }
    } else {
      await queueMutation({ id: mutationId, entity: "survey_element", operation: "upsert", entityId: payload.id, expectedVersion: current.version, payload, createdAt: new Date().toISOString(), attempts: 0, status: "queued" });
    }
    reset();
    window.localStorage.removeItem(`survey-step:${surveyId}:${initialElement}`);
    router.push(`/surveys/${surveyId}/workspace?saved=${encodeURIComponent(payload.element)}`);
  }

  return <div className="grid gap-5">
    <Card className="overflow-hidden"><div className="overflow-x-auto scrollbar-thin"><ol className="flex min-w-[720px]" aria-label="Survey stages">{steps.map((label, index) => <li key={label} className={`relative flex min-w-[120px] flex-1 items-center gap-3 border-r border-[var(--line)] px-4 py-4 ${index === step ? "bg-blue-50 text-[var(--brand)] dark:bg-blue-950/40" : index < step ? "text-[var(--leaf)]" : "text-[var(--ink-muted)]"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${index === step ? "bg-[var(--brand)] text-white" : index < step ? "bg-[var(--leaf)] text-white" : "bg-[var(--surface-muted)]"}`}>{index < step ? <Check size={15} weight="bold" /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></li>)}</ol></div></Card>
    <Card className="p-5 sm:p-7"><AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
      {step === 0 ? <div className="grid gap-6"><SectionIntro title="Choose the element" description="The flat remains selected while you move through each component." /><div className="grid gap-5 sm:grid-cols-2"><Field label="Component area" htmlFor="category" required><Select id="category" value={draft.customComponentName ? "__other__" : draft.category} onChange={(event) => { if (event.target.value === "__other__") patchDraft({ category: "", categoryId: undefined, customComponentName: "", element: "", elementId: undefined, customElementName: "" }); else changeCategory(event.target.value); }}><option value="">Select component</option>{categories.map((category) => <option key={category}>{category}</option>)}<option value="__other__">Other / Not listed</option></Select>{draft.customComponentName !== undefined ? <Input className="mt-2" value={draft.customComponentName} onChange={(event) => patchDraft({ category: event.target.value, customComponentName: event.target.value })} placeholder="Enter component name" required /> : null}</Field><Field label="Element" htmlFor="element" required><Select id="element" value={draft.customElementName ? "__other__" : draft.element} onChange={(event) => { if (event.target.value === "__other__") patchDraft({ element: "", elementId: undefined, customElementName: "" }); else changeElement(event.target.value); }}><option value="">Select element</option>{catalog.filter((item) => item.category === draft.category).map((item) => <option key={item.name}>{item.name}</option>)}<option value="__other__">Other / Not listed</option></Select>{draft.customElementName !== undefined ? <Input className="mt-2" value={draft.customElementName} onChange={(event) => patchDraft({ element: event.target.value, customElementName: event.target.value })} placeholder="Enter element name" required /> : null}</Field></div><Field label="Inspection status" htmlFor="accessibility" required><Select id="accessibility" value={draft.accessibility} onChange={(event) => patchDraft({ accessibility: event.target.value as SurveyElementDraft["accessibility"] })}><option value="inspection_required">Inspection required</option><option value="not_applicable">Not applicable</option><option value="inaccessible">Inaccessible</option></Select></Field>{draft.accessibility !== "inspection_required" ? <Field label={draft.accessibility === "inaccessible" ? "Reason for no access" : "Status note"} htmlFor="accessibilityReason" required={draft.accessibility === "inaccessible"}><Textarea id="accessibilityReason" value={draft.accessibilityReason} onChange={(event) => patchDraft({ accessibilityReason: event.target.value })} placeholder="Record the reason and any follow-up required." /></Field> : null}</div> : null}
      {step === 1 ? <div className="grid gap-6"><SectionIntro title="Record construction" description="Choose a controlled type or enter another construction where needed." /><Field label="Construction type" htmlFor="construction" required><Select id="construction" value={constructionOptions.includes(draft.constructionType) ? draft.constructionType : draft.constructionType ? "__other__" : ""} onChange={(event) => patchDraft({ constructionType: event.target.value === "__other__" ? "" : event.target.value })}><option value="">Select construction</option>{constructionOptions.map((type) => <option key={type}>{type}</option>)}<option value="__other__">Other / Not listed</option></Select>{(!constructionOptions.includes(draft.constructionType) || draft.constructionType === "") ? <Input className="mt-2" value={constructionOptions.includes(draft.constructionType) ? "" : draft.constructionType} onChange={(event) => patchDraft({ constructionType: event.target.value })} placeholder="Enter construction type" required /> : null}</Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Installation or replacement year" htmlFor="installationYear" helper="This year drives the remaining-life calculation."><Input id="installationYear" type="number" min="1600" max={new Date().getFullYear()} value={draft.installationYear ?? ""} onChange={(event) => patchDraft({ installationYear: event.target.value ? Number(event.target.value) : undefined })} /></Field><Field label="Typical lifespan" htmlFor="typicalLifeYears" helper={`Reference: ${draft.lifeReference}`}><Input id="typicalLifeYears" type="number" min="1" value={draft.typicalLifeYears ?? ""} onChange={(event) => patchDraft({ typicalLifeYears: event.target.value ? Number(event.target.value) : undefined })} /></Field></div><Field label="Construction notes" htmlFor="constructionNotes"><Textarea id="constructionNotes" value={draft.constructionNotes} onChange={(event) => patchDraft({ constructionNotes: event.target.value })} placeholder="Material, specification, location or observed alterations." /></Field></div> : null}
      {step === 2 ? <div className="grid gap-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><SectionIntro title="Record defects" description="Each finding has its own condition, priority, notes and evidence." /><Button variant="secondary" onClick={addFinding}><Plus size={18} />Add finding</Button></div>{draft.defects.length ? <div className="grid gap-5">{draft.defects.map((finding, index) => <div key={finding.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><div><Badge tone="blue">Finding {index + 1}</Badge><p className="mt-2 text-xs text-[var(--ink-muted)]">Assessment for {draft.element}</p></div><Button variant="ghost" size="sm" onClick={() => removeFinding(index)} aria-label={`Remove finding ${index + 1}`}><Trash size={18} /></Button></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Defect or deficiency (optional)" htmlFor={`defect-${index}`}><Select id={`defect-${index}`} value={defectOptions.includes(finding.defectType) ? finding.defectType : finding.defectType ? "__other__" : ""} onChange={(event) => patchFinding(index, { defectType: event.target.value === "__other__" ? "" : event.target.value })}><option value="">Select defect</option>{defectOptions.filter((type) => type !== "Other defect").map((type) => <option key={type}>{type}</option>)}<option value="__other__">Other / Not listed</option></Select>{(!defectOptions.includes(finding.defectType) || finding.defectType === "") ? <Input className="mt-2" value={defectOptions.includes(finding.defectType) || finding.defectType === "Other defect" ? "" : finding.defectType} onChange={(event) => patchFinding(index, { defectType: event.target.value })} placeholder="Optional defect description" /> : null}</Field><Field label="Cause" htmlFor={`cause-${index}`}><Input id={`cause-${index}`} value={finding.cause} onChange={(event) => patchFinding(index, { cause: event.target.value })} placeholder="Known or suspected cause" /></Field><Field label="Condition rating" htmlFor={`condition-${index}`} required><Select id={`condition-${index}`} value={finding.condition} onChange={(event) => patchFinding(index, { condition: event.target.value as SurveyElementDraft["defects"][number]["condition"] })}><option value="">Select condition</option>{conditionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><Field label="Priority rating" htmlFor={`priority-${index}`} required><Select id={`priority-${index}`} value={finding.priority} onChange={(event) => patchFinding(index, { priority: event.target.value as SurveyElementDraft["defects"][number]["priority"] })}><option value="">Select priority</option>{priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><div className="sm:col-span-2"><Field label="Finding notes" htmlFor={`notes-${index}`}><Textarea id={`notes-${index}`} value={finding.notes} onChange={(event) => patchFinding(index, { notes: event.target.value })} /></Field></div><div className="sm:col-span-2"><PhotoGallery ids={finding.photoIds} previews={photoPreviews} addLabel="Add photographs" onAdd={(files) => addPhotos(files, index)} onReplace={(id, file) => replacePhoto(id, file, index)} onRemove={(id) => removePhoto(id, index)} error={photoError} /></div></div></div>)}</div> : <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center"><Warning size={28} className="mx-auto text-[var(--orange)]" /><p className="mt-3 font-semibold">No findings recorded</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Add a finding, including No defect observed where appropriate.</p></div>}</div> : null}
      {step === 3 ? <div className="grid gap-6"><SectionIntro title="Confirm lifecycle" description="The component installation year is the basis for all calculations." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><LifecycleTile label="Component age" value={lifecycle.age === null ? "Not available" : `${lifecycle.age} years`} /><LifecycleTile label="Typical life" value={draft.typicalLifeYears ? `${draft.typicalLifeYears} years` : "Not available"} /><LifecycleTile label="Remaining life" value={lifecycle.remainingLife === null ? "Not available" : `${lifecycle.remainingLife} years`} warning={(lifecycle.remainingLife ?? 1) < 0} /><LifecycleTile label="Replacement due" value={lifecycle.replacementYear ?? "Not available"} /></div><Field label="Planning horizon" htmlFor="planningHorizon" required helper={lifecycle.suggestedHorizon ? `Suggested from remaining life: ${lifecycle.suggestedHorizon}` : "Enter installation year and typical life to calculate a suggestion."}><Select id="planningHorizon" value={draft.planningHorizon} onChange={(event) => patchDraft({ planningHorizon: event.target.value as SurveyElementDraft["planningHorizon"], planningOverrideReason: event.target.value === lifecycle.suggestedHorizon ? "" : draft.planningOverrideReason })}><option value="">Select planning horizon</option><option>Overdue</option><option>1-10 years</option><option>11-20 years</option><option>21-30 years</option><option>Beyond 30 years</option></Select></Field>{draft.planningHorizon && lifecycle.suggestedHorizon && draft.planningHorizon !== lifecycle.suggestedHorizon ? <Field label="Override reason" htmlFor="overrideReason" required><Textarea id="overrideReason" value={draft.planningOverrideReason} onChange={(event) => patchDraft({ planningOverrideReason: event.target.value })} placeholder="Explain why the surveyor-selected horizon differs from the calculated suggestion." /></Field> : null}</div> : null}
      {step === 4 ? <div className="grid gap-6"><SectionIntro title="Plan the response" description="Record actionable works and any limitations that affect the recommendation." /><Field label="Recommended remedial works" htmlFor="works"><Textarea id="works" value={draft.recommendedWorks} onChange={(event) => patchDraft({ recommendedWorks: event.target.value })} placeholder="Describe the repair, replacement or monitoring action." /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Estimated cost (£)" htmlFor="estimatedCost" helper="Optional element-level planning allowance. Do not enter a tender value unless verified."><Input id="estimatedCost" type="number" min="0" step="0.01" value={draft.estimatedCost ?? ""} onChange={(event) => patchDraft({ estimatedCost: event.target.value ? Number(event.target.value) : undefined })} /></Field><Field label="Cost basis" htmlFor="costBasis" helper="Explain the source or basis for the allowance."><Input id="costBasis" value={draft.costBasis} onChange={(event) => patchDraft({ costBasis: event.target.value })} placeholder="Surveyor allowance, schedule of rates, etc." /></Field></div><Field label="General notes" htmlFor="generalNotes"><Textarea id="generalNotes" value={draft.generalNotes} onChange={(event) => patchDraft({ generalNotes: event.target.value })} /></Field><Field label="Access limitations" htmlFor="accessLimitations"><Textarea id="accessLimitations" value={draft.accessLimitations} onChange={(event) => patchDraft({ accessLimitations: event.target.value })} /></Field><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] p-4"><input type="checkbox" className="mt-1 size-4 accent-[var(--brand)]" checked={draft.furtherInvestigation} onChange={(event) => patchDraft({ furtherInvestigation: event.target.checked })} /><span><strong className="block text-sm">Further investigation required</strong><span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">Flag this element for a specialist inspection or intrusive investigation.</span></span></label><PhotoGallery ids={draft.mediaIds} previews={photoPreviews} addLabel="Add general photos" onAdd={(files) => addPhotos(files)} onReplace={(id, file) => replacePhoto(id, file)} onRemove={(id) => removePhoto(id)} error={photoError} /></div> : null}
      {step === 5 ? <div className="grid gap-6"><SectionIntro title="Review element" description="Check the evidence and ratings before returning to the flat workspace." />{error ? <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200" role="alert">{error}</div> : null}<ReviewGroup title="Element" onEdit={() => setStep(0)} rows={[["Component", draft.category], ["Element", draft.element], ["Status", draft.accessibility.replaceAll("_", " ")]]} /><ReviewGroup title="Construction" onEdit={() => setStep(1)} rows={[["Type", draft.constructionType || "Not recorded"], ["Installation year", draft.installationYear ?? "Not recorded"], ["Typical life", `${draft.typicalLifeYears ?? "Not recorded"} years`]]} /><ReviewGroup title={`Findings (${draft.defects.length})`} onEdit={() => setStep(2)} rows={draft.defects.map((finding, index) => [`Finding ${index + 1}`, `${finding.defectType || "Incomplete"} | Condition ${finding.condition || "?"} | Priority ${finding.priority || "?"}`])} /><ReviewGroup title="Lifecycle" onEdit={() => setStep(3)} rows={[["Remaining life", lifecycle.remainingLife === null ? "Not available" : `${lifecycle.remainingLife} years`], ["Replacement due", lifecycle.replacementYear ?? "Not available"], ["Planning horizon", draft.planningHorizon || "Not selected"]]} /><ReviewGroup title="Recommended works" onEdit={() => setStep(4)} rows={[["Works", draft.recommendedWorks || "Not recorded"], ["Estimated cost", draft.estimatedCost === undefined ? "Not recorded" : `£${draft.estimatedCost.toLocaleString("en-GB")}`], ["Notes", draft.generalNotes || "Not recorded"], ["Further investigation", draft.furtherInvestigation ? "Required" : "Not required"], ["Photographs", String(draft.mediaIds.length + draft.defects.reduce((sum, finding) => sum + finding.photoIds.length, 0))]]} /><div className="grid gap-2 border-t border-[var(--line)] pt-5 sm:grid-cols-2"><Button variant="secondary" size="lg" disabled={saving} onClick={() => submit("partial")}><FloppyDisk size={19} />Save partial</Button><Button variant="success" size="lg" disabled={saving} onClick={() => submit("completed")}><CheckCircle size={19} />{saving ? "Saving" : "Complete element"}</Button></div></div> : null}
    </motion.div></AnimatePresence></Card>
    {step < 5 ? <div className="flex items-center justify-between"><Button variant="secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}><ArrowLeft size={18} />Back</Button><div className="text-xs text-[var(--ink-muted)]">Draft saved on this device</div><Button onClick={() => setStep(Math.min(5, step + 1))}>Continue<ArrowRight size={18} /></Button></div> : null}
  </div>;
}

function SectionIntro({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{description}</p></div>; }
function LifecycleTile({ label, value, warning }: { label: string; value: string | number; warning?: boolean }) { return <div className={`rounded-xl border p-4 ${warning ? "border-orange-300 bg-[var(--orange-soft)]" : "border-[var(--line)] bg-[var(--surface-muted)]"}`}><p className="text-xs font-semibold text-[var(--ink-muted)]">{label}</p><p className={`metric-number mt-2 text-lg font-semibold ${warning ? "text-[var(--orange)]" : ""}`}>{value}</p></div>; }
function ReviewGroup({ title, rows, onEdit }: { title: string; rows: Array<[string, string | number]>; onEdit: () => void }) { return <section className="overflow-hidden rounded-2xl border border-[var(--line)]"><div className="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-3"><h3 className="text-sm font-semibold">{title}</h3><button className="text-xs font-semibold text-[var(--brand)] hover:underline" onClick={onEdit}>Edit</button></div><dl className="divide-y divide-[var(--line)]">{rows.map(([label, value]) => <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_1fr]"><dt className="text-xs font-medium text-[var(--ink-muted)]">{label}</dt><dd className="text-sm">{value}</dd></div>)}</dl></section>; }
