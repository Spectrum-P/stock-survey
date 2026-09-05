import { describe, expect, it } from "vitest";
import { surveyElementSchema } from "@/lib/schemas";

const base = { id: "11111111-1111-4111-8111-111111111111", surveyId: "22222222-2222-4222-8222-222222222222", category: "External Envelope", element: "Roof", accessibility: "inaccessible", accessibilityReason: "", constructionType: "", constructionNotes: "", lifeReference: "50-70 years", planningHorizon: "", planningOverrideReason: "", estimatedCost: undefined, costBasis: "", defects: [], recommendedWorks: "", generalNotes: "", accessLimitations: "", furtherInvestigation: false, mediaIds: [], status: "inaccessible", version: 1, updatedAt: new Date().toISOString() };
describe("survey element validation", () => {
  it("requires a reason for inaccessible elements", () => expect(surveyElementSchema.safeParse(base).success).toBe(false));
  it("accepts a documented inaccessible element", () => expect(surveyElementSchema.safeParse({ ...base, accessibilityReason: "Locked roof hatch" }).success).toBe(true));
  it("accepts survey-scoped custom component and element names", () => expect(surveyElementSchema.safeParse({ ...base, category: "Shared amenities", element: "Bin store doors", customComponentName: "Shared amenities", customElementName: "Bin store doors", accessibilityReason: "Not inspected from public route" }).success).toBe(true));
  it("allows an empty defect description when condition and priority are recorded", () => expect(surveyElementSchema.safeParse({ ...base, accessibility: "inspection_required", constructionType: "Masonry", defects: [{ id: "33333333-3333-4333-8333-333333333333", defectType: "", cause: "", condition: "A", priority: "4", notes: "", photoIds: [] }], planningHorizon: "Beyond 30 years", status: "completed" }).success).toBe(true));
  it("allows a completed element with no findings when no defect is present", () => expect(surveyElementSchema.safeParse({ ...base, accessibility: "inspection_required", constructionType: "Masonry", defects: [], planningHorizon: "Beyond 30 years", status: "completed" }).success).toBe(true));
});
