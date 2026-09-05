import type { PropertySummary, ReportSummary, SurveyRecord } from "@/lib/types";

export const demoProperties: PropertySummary[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Bishop Hall", buildingName: "Bishop Hall", propertyType: "Supported housing", address: "Kingston Lane, Uxbridge", postcode: "UB8 3PH", constructionYear: 1998, units: 25, surveyedUnits: 17, inProgressUnits: 5, completedUnits: 12, urgentFindings: 3 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Meadow Court", buildingName: "Meadow Court", propertyType: "General needs", address: "Cleveland Road, Uxbridge", postcode: "UB8 2EG", constructionYear: 2007, units: 18, surveyedUnits: 8, inProgressUnits: 0, completedUnits: 8, urgentFindings: 1 },
  { id: "33333333-3333-4333-8333-333333333333", name: "Lancaster House", buildingName: "Lancaster House", propertyType: "General needs", address: "Station Road, Hayes", postcode: "UB3 4BX", constructionYear: 1986, units: 32, surveyedUnits: 29, inProgressUnits: 0, completedUnits: 29, urgentFindings: 5 }
];

export const demoRecords: SurveyRecord[] = [
  { id: "r1", surveyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", propertyId: "11111111-1111-4111-8111-111111111111", surveyDate: "2026-08-29", property: "Bishop Hall", building: "Bishop Hall", propertyType: "Supported housing", unit: "Flat 01", flatType: "10-bed", floor: "Ground floor", surveyElementId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1", component: "External Envelope", element: "Windows", construction: "uPVC double glazed", defect: "Failed sealed unit", defectCause: "Seal failure", defectNotes: "Misting between panes", condition: "C", priority: "2", planningHorizon: "1-10 years", remainingLife: 4, replacementYear: 2030, surveyStatus: "in_progress", surveyor: "Amina Okafor", photoCount: 3, estimatedCost: 4200, recommendedWorks: "Replace failed sealed units" },
  { id: "r2", surveyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", propertyId: "11111111-1111-4111-8111-111111111111", surveyDate: "2026-08-29", property: "Bishop Hall", building: "Bishop Hall", propertyType: "Supported housing", unit: "Flat 01", flatType: "10-bed", floor: "Ground floor", surveyElementId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2", component: "Bathroom", element: "Extract Ventilation", construction: "Humidistat fan", defect: "Fan inoperative", defectCause: "Not recorded", defectNotes: "Fan not running on inspection", condition: "D", priority: "1", planningHorizon: "Overdue", remainingLife: -2, replacementYear: 2024, surveyStatus: "in_progress", surveyor: "Amina Okafor", photoCount: 2, estimatedCost: 850, recommendedWorks: "Replace humidistat fan" },
  { id: "r3", surveyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", propertyId: "33333333-3333-4333-8333-333333333333", surveyDate: "2026-08-28", property: "Lancaster House", building: "Lancaster House", propertyType: "General needs", unit: "Flat 14", flatType: "10-bed", floor: "First floor", surveyElementId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3", component: "Kitchen", element: "Kitchen Units", construction: "Laminate standard", defect: "Door damaged", defectCause: "Not recorded", defectNotes: "", condition: "B", priority: "3", planningHorizon: "11-20 years", remainingLife: 13, replacementYear: 2039, surveyStatus: "completed", surveyor: "Lewis Grant", photoCount: 1, estimatedCost: 2400, recommendedWorks: "Adjust and repair door" },
  { id: "r4", surveyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", propertyId: "22222222-2222-4222-8222-222222222222", surveyDate: "2026-08-27", property: "Meadow Court", building: "Meadow Court", propertyType: "General needs", unit: "Flat 07", flatType: "Studio", floor: "Second floor", surveyElementId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4", component: "Building Services", element: "Fire Alarm", construction: "LD2 interlinked", defect: "No defect observed", defectCause: "", defectNotes: "", condition: "A", priority: "4", planningHorizon: "21-30 years", remainingLife: 22, replacementYear: 2048, surveyStatus: "completed", surveyor: "Tariq Bello", photoCount: 0, estimatedCost: undefined, recommendedWorks: "" },
  { id: "r5", surveyId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", propertyId: "33333333-3333-4333-8333-333333333333", surveyDate: "2026-08-25", property: "Lancaster House", building: "Lancaster House", propertyType: "General needs", unit: "Flat 22", flatType: "8-bed", floor: "Third floor", surveyElementId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5", component: "External Envelope", element: "Roof", construction: "Pitched concrete tile", defect: "Defective flashing", defectCause: "Not recorded", defectNotes: "", condition: "C", priority: "2", planningHorizon: "1-10 years", remainingLife: 7, replacementYear: 2033, surveyStatus: "completed", surveyor: "Amina Okafor", photoCount: 4, estimatedCost: 3200, recommendedWorks: "Repair flashing" }
];

export const demoReports: ReportSummary[] = [
  { id: "rep1", surveyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", property: "Lancaster House", unit: "Flat 14", status: "approved", updatedAt: "2026-08-30T10:30:00Z", approvedAt: "2026-08-30T11:15:00Z" },
  { id: "rep2", surveyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", property: "Meadow Court", unit: "Flat 07", status: "draft", updatedAt: "2026-08-29T14:20:00Z" }
];

export const demoUnits = Array.from({ length: 25 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: `Flat ${String(index + 1).padStart(2, "0")}`,
  status: index < 12 ? "completed" : index < 17 ? "in_progress" : "not_started",
  flatType: index % 5 === 0 ? "Studio" : "10-bed",
  floor: index < 5 ? "Ground floor" : index < 12 ? "First floor" : "Second floor",
  records: index < 12 ? 32 : index < 17 ? 9 + (index % 4) : 0,
  lastSurvey: index < 17 ? `2026-08-${String(29 - index).padStart(2, "0")}` : null
}));

export const demoElementStatuses = new Map<string, "not_started" | "partial" | "completed" | "not_applicable" | "inaccessible">([
  ["Roof", "completed"], ["Chimneys", "not_applicable"], ["Brickwork", "completed"], ["Render", "partial"], ["Windows", "completed"],
  ["Walls", "completed"], ["Ceilings", "completed"], ["Floors", "partial"], ["Kitchen Units", "completed"], ["Bath / Shower", "completed"],
  ["Extract Ventilation", "inaccessible"], ["Heating", "completed"], ["Fire Alarm", "completed"]
]);
