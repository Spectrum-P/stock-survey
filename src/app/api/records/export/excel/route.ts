import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";
import { buildExcelExport, safeExcelFilename } from "@/lib/export/excel";
import { ExcelExportNotFoundError, loadExcelExportData } from "@/lib/export/excel-data";

export const runtime = "nodejs";

const uuid = z.string().uuid();
const selectionSchema = z.union([
  z.object({ scope: z.literal("property"), propertyId: uuid }),
  z.object({ scope: z.literal("unit"), surveyId: uuid, propertyId: uuid.optional(), unitId: uuid.optional() }),
  z.object({ scope: z.literal("unit"), surveyId: z.undefined(), propertyId: uuid, unitId: uuid }),
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = {
    scope: url.searchParams.get("scope") ?? "",
    propertyId: url.searchParams.get("propertyId") || undefined,
    unitId: url.searchParams.get("unitId") || undefined,
    surveyId: url.searchParams.get("surveyId") || undefined,
  };
  const parsed = selectionSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Choose a valid property or completed unit survey to export", 422, parsed.error.flatten());

  const context = await requestContext(request);
  if (!context.demo && (!context.user || !context.organizationId)) return jsonError("Authentication required", 401);

  try {
    const input = await loadExcelExportData(context.supabase, context.organizationId!, parsed.data);
    const workbook = await buildExcelExport(input);
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeExcelFilename(input)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ExcelExportNotFoundError) return jsonError(error.message, 404);
    console.error("[excel-export] Failed to generate workbook", error);
    return jsonError("The Excel export could not be generated. Please try again.", 500);
  }
}
