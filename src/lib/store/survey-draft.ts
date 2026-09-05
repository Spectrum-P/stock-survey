"use client";

import { create } from "zustand";
import type { DefectFindingInput, SurveyElementDraft } from "@/lib/types";

interface SurveyDraftState {
  draft: SurveyElementDraft | null;
  step: number;
  setDraft: (draft: SurveyElementDraft) => void;
  patchDraft: (patch: Partial<SurveyElementDraft>) => void;
  setStep: (step: number) => void;
  addFinding: () => void;
  patchFinding: (index: number, patch: Partial<DefectFindingInput>) => void;
  removeFinding: (index: number) => void;
  reset: () => void;
}

export const useSurveyDraftStore = create<SurveyDraftState>((set) => ({
  draft: null,
  step: 0,
  setDraft: (draft) => set({ draft }),
  patchDraft: (patch) => set((state) => ({ draft: state.draft ? { ...state.draft, ...patch, updatedAt: new Date().toISOString() } : null })),
  setStep: (step) => set({ step }),
  addFinding: () => set((state) => ({
    draft: state.draft ? {
      ...state.draft,
      defects: [...state.draft.defects, { id: crypto.randomUUID(), defectType: "", cause: "", condition: "", priority: "", notes: "", photoIds: [] }]
    } : null
  })),
  patchFinding: (index, patch) => set((state) => ({
    draft: state.draft ? { ...state.draft, defects: state.draft.defects.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } : null
  })),
  removeFinding: (index) => set((state) => ({ draft: state.draft ? { ...state.draft, defects: state.draft.defects.filter((_, itemIndex) => itemIndex !== index) } : null })),
  reset: () => set({ draft: null, step: 0 })
}));
