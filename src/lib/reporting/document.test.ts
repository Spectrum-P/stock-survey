import { describe, expect, it } from "vitest";
import { buildDeterministicReportDocument, mergeGeneratedSection, mergeReportNarrative, normalizeReportDocument, REPORT_NARRATIVE_JSON_SCHEMA } from "@/lib/reporting/document";

const survey = {
  id: "survey-1",
  property_id: "property-1",
  unit_id: "unit-1",
  inspection_date: "2026-08-18",
  status: "completed",
  properties: { name: "Harbour View Court", reference: "HVC-001", address_line_1: "14 Dockside Way", town: "Liverpool", postcode: "L3 4AB" },
  units: { name: "Flat 01" },
  profiles: { full_name: "Amina Okafor" },
  survey_elements: [
    {
      id: "element-1", status: "completed", construction_type: "uPVC double glazed", remaining_life: 4, replacement_year: 2030,
      planning_horizon: "1-10 years", estimated_cost: "4200.00", cost_basis: "Budget estimate", recommended_works: "Replace failed units",
      elements: { name: "Windows" }, component_categories: { name: "External Envelope" }, media: [],
      defect_findings: [{ defect_type_label: "Failed sealed unit", condition: "C", priority: "2" }],
    },
    { id: "element-2", status: "not_started", elements: { name: "Roof" }, component_categories: { name: "External Envelope" }, media: [], defect_findings: [] },
  ],
};

describe("report document construction", () => {
  it("closes every object in the Claude narrative schema", () => {
    const visit = (schema: unknown) => {
      if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
      const node = schema as Record<string, unknown>;
      if (node.type === "object") expect(node.additionalProperties).toBe(false);
      if (node.properties && typeof node.properties === "object") Object.values(node.properties).forEach(visit);
      visit(node.items);
    };
    visit(REPORT_NARRATIVE_JSON_SCHEMA);
  });

  it("builds authoritative unit context and excludes untouched elements", () => {
    const document = buildDeterministicReportDocument([survey], { kind: "survey", surveyId: "survey-1" }, "Example Housing");
    expect(document.metadata.title).toBe("Harbour View Court · Flat 01 stock condition survey report");
    expect(document.metadata.clientName).toBe("Example Housing");
    expect(document.metadata.reportReference).toBe("HVC-001");
    expect(document.metadata.preparedBy).toBe("Amina Okafor");
    expect(document.stockProfile.assessedElements).toBe(1);
    expect(document.stockProfile.estimatedCost).toBe(4200);
    expect(document.componentSections[0].elements).toHaveLength(1);
    expect(document.conditionSummary.find((item) => item.label === "C")?.percentage).toBe(100);
  });

  it("merges AI narrative without replacing factual tables", () => {
    const base = buildDeterministicReportDocument([survey], { kind: "property", propertyId: "property-1" }, "Example Housing");
    const merged = mergeReportNarrative(base, {
      executiveSummary: "Recorded defects require planned action.", introduction: "This report covers the property.", methodology: "Stored visual survey evidence was reviewed.",
      limitations: ["Visual inspection only."], componentNarratives: [{ component: "External Envelope", narrative: "The windows require planned renewal." }],
      plannedMaintenance: "Programme window works.", recommendations: ["Confirm the renewal programme."], dataQualityIssues: [],
    });
    expect(merged.executiveSummary).toContain("planned action");
    expect(merged.componentSections[0].elements[0].estimatedCost).toBe(4200);
    expect(merged.componentSections[0].narrative).toContain("windows");
  });

  it("regenerates component narrative without replacing the editable fact snapshot", () => {
    const current = buildDeterministicReportDocument([survey], { kind: "survey", surveyId: "survey-1" }, "Example Housing");
    current.componentSections[0].elements[0].estimatedCost = 5000;
    const generated = structuredClone(current);
    generated.componentSections[0].narrative = "Fresh narrative.";
    generated.componentSections[0].elements[0].estimatedCost = 4200;
    const merged = mergeGeneratedSection(current, generated, "componentSections");
    expect(merged.componentSections[0].narrative).toBe("Fresh narrative.");
    expect(merged.componentSections[0].elements[0].estimatedCost).toBe(5000);
  });

  it("normalizes malformed legacy documents without throwing", () => {
    const document = normalizeReportDocument({ metadata: undefined, componentSections: null, dataQualityIssues: null }, "Recovered report");
    expect(document.metadata.title).toBe("Recovered report");
    expect(document.componentSections).toEqual([]);
    expect(document.dataQualityIssues).toEqual([]);
  });
});
