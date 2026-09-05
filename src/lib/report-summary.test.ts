import { describe, expect, it } from "vitest";
import { mapReportSummary } from "@/lib/data";

const base = { id: "report-1", status: "generating", generation_status: "queued", review_status: "draft", progress: 0, updated_at: "2026-09-04T12:00:00Z" };

describe("report summary mapping", () => {
  it("uses the report property relationship for property reports", () => {
    const summary = mapReportSummary({ ...base, scope_type: "property", property_id: "property-1", report_property: [{ name: "Willow Bank House" }] });
    expect(summary.property).toBe("Willow Bank House");
    expect(summary.unit).toBe("All units");
  });

  it("handles array-shaped survey relationships for unit reports", () => {
    const summary = mapReportSummary({ ...base, scope_type: "survey", survey_id: "survey-1", survey: [{ units: [{ name: "Flat 03", properties: [{ name: "Willow Bank House" }] }] }] });
    expect(summary.property).toBe("Willow Bank House");
    expect(summary.unit).toBe("Flat 03");
  });
});
