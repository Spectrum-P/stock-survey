import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildExcelExport, PROPERTY_EXPORT_HEADERS, safeExcelFilename, toPropertyExportRow, toUnitExportRow, UNIT_EXPORT_HEADERS, type ExcelExportRecord } from "@/lib/export/excel";
import { latestCompletedSurveyPerUnit } from "@/lib/export/excel-data";

const record: ExcelExportRecord = {
  recordId: "11111111-1111-4111-8111-111111111111",
  surveyDate: "2026-08-30",
  propertyName: "Runnymede Hall",
  addressLine1: "Kingston Lane",
  town: "Uxbridge",
  postcode: "UB8 3PH",
  unitName: "Flat 01",
  flatType: "10-Bed",
  floor: "Ground Floor",
  component: "External Envelope",
  element: "Roof",
  constructionType: "Pitched – Concrete Tile",
  constructionNotes: "Inspected from ground level",
  defect: "Slipped / Missing Tiles",
  defectCause: "Storm damage",
  defectNotes: "Eight tiles displaced",
  condition: "C",
  priority: "2",
  planningHorizon: "1-10 years",
  lifeReference: "Concrete tile roof covering: 50–70 yrs",
  typicalLifeYears: 60,
  installationYear: 1998,
  remainingLife: null,
  replacementYear: null,
  recommendedWorks: "Replace displaced tiles",
  generalNotes: "Rear elevation affected",
  accessLimitations: "Roof not accessed",
  furtherInvestigation: true,
};

describe("Excel stock-condition exports", () => {
  it("maps the exact unit template columns and derives lifecycle values at the survey date", () => {
    const row = toUnitExportRow(record);
    expect(UNIT_EXPORT_HEADERS).toHaveLength(20);
    expect(row).toHaveLength(20);
    expect(row[9]).toContain("Cause: Storm damage");
    expect(row[10]).toBe("C – Poor");
    expect(row[11]).toBe("2 – Essential");
    expect(row[12]).toBe("1–10 years");
    expect(row[16]).toBe(28);
    expect(row[17]).toBe(32);
    expect(row[18]).toBe(2058);
  });

  it("maps the exact property template columns and keeps supporting notes in existing fields", () => {
    const row = toPropertyExportRow(record);
    expect(PROPERTY_EXPORT_HEADERS).toHaveLength(23);
    expect(row).toHaveLength(23);
    expect(row[11]).toContain("Detail: Eight tiles displaced");
    expect(row[22]).toContain("Access limitations: Roof not accessed");
    expect(row[22]).toContain("Further investigation: Required");
  });

  it("represents a completed element without a finding without inventing ratings", () => {
    const row = toPropertyExportRow({ ...record, recordId: "element-1", defect: null, defectCause: null, defectNotes: null, condition: null, priority: null });
    expect(row[10]).toBe("No defect observed");
    expect(row[12]).toBe("");
    expect(row[13]).toBe("");
  });

  it("serializes a styled, filterable property workbook with typed dates and numbers", async () => {
    const workbook = await buildExcelExport({ scope: "property", propertyName: record.propertyName, records: [record], exportedAt: new Date("2026-09-05T00:00:00Z") });
    const bytes = await workbook.xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(bytes);
    const sheet = loaded.getWorksheet("Master Database")!;
    expect(sheet.getRow(4).values).toEqual([undefined, ...PROPERTY_EXPORT_HEADERS]);
    expect(sheet.getCell("B5").value).toBeInstanceOf(Date);
    expect(sheet.getCell("Q5").value).toBe(60);
    expect(sheet.getCell("S5").value).toBe(28);
    expect(sheet.autoFilter).toEqual("A4:W5");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 4, showGridLines: false });
  });

  it("produces safe scope-specific filenames", () => {
    expect(safeExcelFilename({ scope: "unit", propertyName: "Willow Bank House", unitName: "Flat 03", records: [record], exportedAt: new Date("2026-09-05T00:00:00Z") }))
      .toBe("willow-bank-house_flat-03_stock-condition_2026-09-05.xlsx");
    expect(safeExcelFilename({ scope: "property", propertyName: "Willow Bank House", records: [record], exportedAt: new Date("2026-09-05T00:00:00Z") }))
      .toBe("willow-bank-house_all-flats_stock-condition_2026-09-05.xlsx");
  });

  it("selects only the latest completed survey for every unit", () => {
    const selected = latestCompletedSurveyPerUnit([
      { id: "old", unit_id: "unit-1", property_id: "property-1", inspection_date: "2026-01-01", status: "completed" },
      { id: "draft", unit_id: "unit-1", property_id: "property-1", inspection_date: "2026-09-01", status: "draft" },
      { id: "new", unit_id: "unit-1", property_id: "property-1", inspection_date: "2026-08-01", status: "completed" },
      { id: "unit-2", unit_id: "unit-2", property_id: "property-1", inspection_date: "2026-07-01", status: "completed" },
    ]);
    expect(selected.map((survey) => survey.id).sort()).toEqual(["new", "unit-2"]);
  });
});
