"use client";

import Dexie, { type EntityTable } from "dexie";
import type { OfflineMutation, SurveyElementDraft } from "@/lib/types";
import { authenticatedFetch } from "@/lib/client-api";

export interface OfflineMedia {
  id: string;
  surveyId: string;
  surveyElementId: string;
  findingId?: string;
  filename: string;
  contentType: string;
  blob: Blob;
  status: "queued" | "uploading" | "uploaded" | "failed";
  error?: string;
  createdAt: string;
}

class SurveyOfflineDatabase extends Dexie {
  drafts!: EntityTable<SurveyElementDraft, "id">;
  outbox!: EntityTable<OfflineMutation, "id">;
  media!: EntityTable<OfflineMedia, "id">;

  constructor() {
    super("stock-condition-survey");
    this.version(1).stores({
      drafts: "id,surveyId,status,updatedAt",
      outbox: "id,entity,entityId,status,createdAt",
      media: "id,surveyId,surveyElementId,findingId,status,createdAt"
    });
  }
}

let database: SurveyOfflineDatabase | undefined;

export function offlineDb() {
  if (typeof window === "undefined") return undefined;
  database ??= new SurveyOfflineDatabase();
  return database;
}

export async function saveDraft(draft: SurveyElementDraft) {
  await offlineDb()?.drafts.put(draft);
}

export async function loadDraft(id: string) {
  return offlineDb()?.drafts.get(id);
}

export async function queueMutation(mutation: OfflineMutation) {
  await offlineDb()?.outbox.put(mutation);
}

export async function queuedMutationCount() {
  const db = offlineDb();
  if (!db) return 0;
  const [mutations, media] = await Promise.all([db.outbox.where("status").equals("queued").count(), db.media.where("status").equals("queued").count()]);
  return mutations + media;
}

export async function queueMedia(media: OfflineMedia) {
  await offlineDb()?.media.put(media);
}

export async function syncOutbox() {
  const db = offlineDb();
  if (!db || !navigator.onLine) return { synced: 0, conflicts: 0 };
  const queued = await db.outbox.where("status").equals("queued").toArray();
  let synced = 0;
  let conflicts = 0;
  for (const mutation of queued) {
    await db.outbox.update(mutation.id, { status: "syncing", attempts: mutation.attempts + 1 });
    try {
      const endpoint = mutation.entity === "survey_element" ? "/api/survey-elements" : mutation.entity === "survey" ? `/api/surveys/${mutation.entityId}/complete` : "/api/media/sign";
      const response = await authenticatedFetch(endpoint, { method: mutation.operation === "complete" ? "POST" : "PUT", headers: { "Content-Type": "application/json", "X-Mutation-Id": mutation.id }, body: JSON.stringify(mutation.payload) });
      if (response.status === 409) {
        conflicts += 1;
        await db.outbox.update(mutation.id, { status: "conflict", error: "The server record changed while this device was offline" });
      } else if (!response.ok) {
        await db.outbox.update(mutation.id, { status: "failed", error: await response.text() });
      } else {
        synced += 1;
        await db.outbox.delete(mutation.id);
      }
    } catch (error) {
      await db.outbox.update(mutation.id, { status: "queued", error: error instanceof Error ? error.message : "Sync failed" });
    }
  }
  return { synced, conflicts };
}

export async function syncQueuedMedia(surveyElementId?: string) {
  const db = offlineDb();
  if (!db || !navigator.onLine) return { synced: 0, failed: 0, errors: [] as string[] };
  const pending = await db.media.where("status").anyOf("queued", "failed").toArray();
  const queued = surveyElementId ? pending.filter((item) => item.surveyElementId === surveyElementId) : pending;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const item of queued) {
    await db.media.update(item.id, { status: "uploading" });
    const form = new FormData();
    form.set("id", item.id); form.set("surveyId", item.surveyId); form.set("surveyElementId", item.surveyElementId);
    if (item.findingId) form.set("findingId", item.findingId);
    form.set("file", new File([item.blob], item.filename, { type: item.contentType }));
    try {
      const response = await authenticatedFetch("/api/media/upload", { method: "POST", body: form });
      if (!response.ok) throw new Error(await response.text());
      await db.media.update(item.id, { status: "uploaded", error: undefined });
      synced += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Upload failed";
      errors.push(message);
      await db.media.update(item.id, { status: "failed", error: message });
    }
  }
  return { synced, failed, errors };
}
