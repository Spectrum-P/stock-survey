"use client";

import Image from "next/image";
import { Camera, PencilSimple, Trash } from "@/components/ui/icons";

interface PhotoGalleryProps {
  ids: string[];
  previews: Record<string, string>;
  addLabel: string;
  onAdd: (files: FileList | null) => void;
  onReplace: (id: string, file: File) => void;
  onRemove: (id: string) => void;
  error?: string;
}

export function PhotoGallery({ ids, previews, addLabel, onAdd, onReplace, onRemove, error }: PhotoGalleryProps) {
  const atLimit = ids.length >= 4;

  return (
    <div className="grid gap-3">
      {ids.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ids.map((id, index) => (
            <div key={id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              {previews[id] ? (
                <Image src={previews[id]} alt={`Photograph ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center p-3 text-center text-xs font-medium text-[var(--ink-muted)]">Photo queued</div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-slate-950/70 p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <label className="grid size-9 cursor-pointer place-items-center rounded-lg bg-white/95 text-slate-800 transition hover:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-white" aria-label={`Replace photograph ${index + 1}`}>
                  <PencilSimple size={17} weight="bold" />
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onReplace(id, file); event.currentTarget.value = ""; }} />
                </label>
                <button type="button" className="grid size-9 place-items-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-white" onClick={() => onRemove(id)} aria-label={`Delete photograph ${index + 1}`}>
                  <Trash size={17} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--brand)] ${atLimit ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[var(--brand)]"}`}>
          <Camera size={19} />
          {atLimit ? "Maximum reached" : addLabel}
          <input type="file" accept="image/*" capture="environment" multiple className="sr-only" disabled={atLimit} onChange={(event) => { onAdd(event.target.files); event.currentTarget.value = ""; }} />
        </label>
        <span className="text-xs text-[var(--ink-muted)]">{ids.length}/4 photos</span>
      </div>
      {error ? <p className="text-xs font-medium text-[var(--orange)]" role="alert">{error}</p> : null}
    </div>
  );
}
