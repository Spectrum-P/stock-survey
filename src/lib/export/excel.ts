import ExcelJS from "exceljs";

export type ExcelExportScope = "unit" | "property";

export interface ExcelExportRecord {
  recordId: string;
  surveyDate: string;
  propertyName: string;
  addressLine1: string;
  addressLine2?: string | null;
  town: string;
  postcode: string;
  unitName: string;
  flatType?: string | null;
  floor?: string | null;
  component: string;
  element: string;
  constructionType?: string | null;
  constructionNotes?: string | null;
  defect?: string | null;
  defectCause?: string | null;
  defectNotes?: string | null;
  condition?: string | null;
  priority?: string | null;
  planningHorizon?: string | null;
  lifeReference?: string | null;
  typicalLifeYears?: number | null;
  installationYear?: number | null;
  remainingLife?: number | null;
  replacementYear?: number | null;
  recommendedWorks?: string | null;
  generalNotes?: string | null;
  accessLimitations?: string | null;
  furtherInvestigation?: boolean | null;
}

export interface ExcelExportInput {
  scope: ExcelExportScope;
  propertyName: string;
  unitName?: string;
  records: ExcelExportRecord[];
  exportedAt?: Date;
}

export const UNIT_EXPORT_HEADERS = [
  "Record ID", "Date", "Address", "Postcode", "Flat / Unit", "Flat Type", "Component Area", "Element", "Construction Type",
  "Defect / Deficiency", "Condition", "Priority", "Planning Horizon", "Life Exp (text)", "Life Exp (yrs)", "Install Year",
  "Age (yrs)", "Rem Life (yrs)", "Replace Yr", "Recommended Works",
] as const;

export const PROPERTY_EXPORT_HEADERS = [
  "Record #", "Survey Date", "Address", "Postcode", "Flat / Unit", "Flat Type", "Floor", "Component Area", "Element",
  "Construction Type", "Defect / Deficiency", "Additional Detail", "Condition Rating", "Priority Rating", "Planning Horizon",
  "Life Exp (text)", "Life Exp (yrs)", "Install Year", "Age (yrs)", "Remaining Life (yrs)", "Replacement Year",
  "Recommended Works", "Notes",
] as const;

const CONDITION_LABELS: Record<string, string> = { A: "A – Good", B: "B – Satisfactory", C: "C – Poor", D: "D – Bad" };
const PRIORITY_LABELS: Record<string, string> = { "1": "1 – Urgent", "2": "2 – Essential", "3": "3 – Desirable", "4": "4 – Long-term" };
const HORIZON_LABELS: Record<string, string> = {
  "1-10 years": "1–10 years",
  "11-20 years": "11–20 years",
  "21-30 years": "21–30 years",
};

const COLORS = {
  navy: "FF1F3864",
  red: "FFC00000",
  yellow: "FFFFF9C4",
  lightBlue: "FFD9EAF7",
  white: "FFFFFFFF",
  border: "FFD9E2F3",
  text: "FF172B3A",
  conditionA: "FFE2F0D9",
  conditionB: "FFFFF2CC",
  conditionC: "FFFCE4D6",
  conditionD: "FFF4CCCC",
  priority1: "FFF4CCCC",
  priority2: "FFFCE4D6",
  priority3: "FFFFF2CC",
  priority4: "FFE2F0D9",
};

function textLines(parts: Array<[string, string | null | undefined]>) {
  return parts.filter(([, value]) => value?.trim()).map(([label, value]) => `${label}: ${value!.trim()}`).join("\n");
}

function address(record: ExcelExportRecord) {
  return [record.propertyName, record.addressLine1, record.addressLine2, record.town].map((part) => part?.trim()).filter(Boolean).join(", ");
}

function surveyDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

function ageAtSurvey(record: ExcelExportRecord) {
  if (record.installationYear == null) return null;
  const year = Number(record.surveyDate.slice(0, 4));
  return Number.isFinite(year) ? Math.max(0, year - record.installationYear) : null;
}

function remainingLife(record: ExcelExportRecord) {
  if (record.remainingLife != null) return record.remainingLife;
  const age = ageAtSurvey(record);
  return age != null && record.typicalLifeYears != null ? record.typicalLifeYears - age : null;
}

function replacementYear(record: ExcelExportRecord) {
  if (record.replacementYear != null) return record.replacementYear;
  return record.installationYear != null && record.typicalLifeYears != null ? record.installationYear + record.typicalLifeYears : null;
}

function defectLabel(record: ExcelExportRecord) {
  return record.defect?.trim() || "No defect observed";
}

function conditionLabel(value?: string | null) {
  return value ? CONDITION_LABELS[value] ?? value : "";
}

function priorityLabel(value?: string | null) {
  return value ? PRIORITY_LABELS[value] ?? value : "";
}

function horizonLabel(value?: string | null) {
  return value ? HORIZON_LABELS[value] ?? value : "";
}

export function toUnitExportRow(record: ExcelExportRecord): Array<string | number | Date | null> {
  const defect = [defectLabel(record), textLines([["Cause", record.defectCause], ["Detail", record.defectNotes]])].filter(Boolean).join("\n");
  return [
    record.recordId, surveyDate(record.surveyDate), address(record), record.postcode, record.unitName, record.flatType ?? "", record.component,
    record.element, record.constructionType ?? "", defect, conditionLabel(record.condition), priorityLabel(record.priority),
    horizonLabel(record.planningHorizon), record.lifeReference ?? "", record.typicalLifeYears ?? null, record.installationYear ?? null,
    ageAtSurvey(record), remainingLife(record), replacementYear(record), record.recommendedWorks ?? "",
  ];
}

export function toPropertyExportRow(record: ExcelExportRecord): Array<string | number | Date | null> {
  const additionalDetail = textLines([["Cause", record.defectCause], ["Detail", record.defectNotes]]);
  const notes = textLines([
    ["Construction notes", record.constructionNotes],
    ["General notes", record.generalNotes],
    ["Access limitations", record.accessLimitations],
    ["Further investigation", record.furtherInvestigation ? "Required" : ""],
  ]);
  return [
    record.recordId, surveyDate(record.surveyDate), address(record), record.postcode, record.unitName, record.flatType ?? "", record.floor ?? "",
    record.component, record.element, record.constructionType ?? "", defectLabel(record), additionalDetail, conditionLabel(record.condition),
    priorityLabel(record.priority), horizonLabel(record.planningHorizon), record.lifeReference ?? "", record.typicalLifeYears ?? null,
    record.installationYear ?? null, ageAtSurvey(record), remainingLife(record), replacementYear(record), record.recommendedWorks ?? "", notes,
  ];
}

function applyWorkbookStyle(worksheet: ExcelJS.Worksheet, columnCount: number, rowCount: number, conditionColumn: number, priorityColumn: number) {
  worksheet.views = [{ state: "frozen", ySplit: 4, activeCell: "A5", showGridLines: false }];
  worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, rowCount), column: columnCount } };
  worksheet.properties.defaultRowHeight = 20;

  const title = worksheet.getRow(2);
  title.height = 30;
  title.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    cell.font = { name: "Arial", size: 15, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  const notice = worksheet.getRow(3);
  notice.height = 28;
  notice.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.yellow } };
    cell.font = { name: "Arial", size: 10, italic: true, color: { argb: COLORS.text } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  const header = worksheet.getRow(4);
  header.height = 34;
  header.eachCell((cell, colNumber) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colNumber === conditionColumn || colNumber === priorityColumn ? COLORS.red : COLORS.navy } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { right: { style: "thin", color: { argb: COLORS.white } } };
  });

  for (let rowNumber = 5; rowNumber <= rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.height = 36;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Arial", size: 10, color: { argb: COLORS.text } };
      cell.alignment = { vertical: "top", horizontal: colNumber >= 15 && colNumber <= 21 ? "right" : "left", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.border } } };
    });
    row.getCell(2).numFmt = "dd/mm/yyyy";
    row.getCell(1).numFmt = "@";
    row.getCell(4).numFmt = "@";

    const condition = String(row.getCell(conditionColumn).value ?? "").slice(0, 1);
    const priority = String(row.getCell(priorityColumn).value ?? "").slice(0, 1);
    if (condition && COLORS[`condition${condition}` as keyof typeof COLORS]) {
      row.getCell(conditionColumn).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS[`condition${condition}` as keyof typeof COLORS] } };
    }
    if (priority && COLORS[`priority${priority}` as keyof typeof COLORS]) {
      row.getCell(priorityColumn).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS[`priority${priority}` as keyof typeof COLORS] } };
    }
  }
}

export async function buildExcelExport(input: ExcelExportInput) {
  if (!input.records.length) throw new Error("At least one export record is required");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Stock Condition Survey";
  workbook.created = input.exportedAt ?? new Date();
  workbook.modified = input.exportedAt ?? new Date();

  const isUnit = input.scope === "unit";
  const headers = isUnit ? UNIT_EXPORT_HEADERS : PROPERTY_EXPORT_HEADERS;
  const worksheet = workbook.addWorksheet(isUnit ? "Unit Survey" : "Master Database", { views: [{ showGridLines: false }] });
  worksheet.mergeCells(2, 1, 2, headers.length);
  worksheet.getCell(2, 1).value = isUnit
    ? `${input.propertyName} · ${input.unitName ?? input.records[0].unitName} stock condition data`
    : `${input.propertyName} · all flats stock condition data`;
  worksheet.mergeCells(3, 1, 3, headers.length);
  worksheet.getCell(3, 1).value = isUnit
    ? "One row per defect or assessed element with no recorded defect. Filter the header row to review the survey."
    : "One row per defect or assessed element with no recorded defect. Filter Flat / Unit to review an individual flat.";
  worksheet.getRow(4).values = [...headers];
  for (const record of input.records) worksheet.addRow(isUnit ? toUnitExportRow(record) : toPropertyExportRow(record));

  const widths = isUnit
    ? [38, 13, 38, 12, 16, 16, 22, 24, 28, 42, 18, 18, 18, 38, 15, 14, 12, 15, 14, 48]
    : [38, 13, 38, 12, 16, 16, 16, 22, 24, 28, 30, 38, 18, 18, 18, 38, 15, 14, 12, 18, 17, 48, 42];
  worksheet.columns.forEach((column, index) => { column.width = widths[index]; });
  applyWorkbookStyle(worksheet, headers.length, worksheet.rowCount, isUnit ? 11 : 13, isUnit ? 12 : 14);

  return workbook;
}

export function safeExcelFilename(input: ExcelExportInput) {
  const slug = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "stock-condition";
  const date = (input.exportedAt ?? new Date()).toISOString().slice(0, 10);
  return input.scope === "unit"
    ? `${slug(input.propertyName)}_${slug(input.unitName ?? input.records[0]?.unitName ?? "unit")}_stock-condition_${date}.xlsx`
    : `${slug(input.propertyName)}_all-flats_stock-condition_${date}.xlsx`;
}
