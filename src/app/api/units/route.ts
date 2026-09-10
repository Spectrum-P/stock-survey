import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const schema = z.object({ propertyId: z.string().uuid(), prefix: z.string().min(1).max(40), start: z.string().trim().regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only for the flat or unit number").max(40), count: z.number().int().min(1).max(200), flatType: z.string().max(80).optional(), floor: z.string().max(80).optional() }).superRefine((value, context) => {
  if (value.count > 1 && !/^\d+$/.test(value.start)) context.addIssue({ code: "custom", path: ["start"], message: "A batch must start with a number. Create alphanumeric flats one at a time." });
});

function generatedUnits({ propertyId, prefix, start, count, flatType, floor }: z.infer<typeof schema>, organizationId: string) {
  const firstNumber = Number(start);
  return Array.from({ length: count }, (_, offset) => {
    const number = count === 1 ? start : String(firstNumber + offset).padStart(2, "0");
    return { id: crypto.randomUUID(), organization_id: organizationId, property_id: propertyId, name: `${prefix.trim()} ${number}`, reference: `${prefix.trim().slice(0, 3).toUpperCase()}-${number}`, flat_type: flatType || null, floor: floor || null };
  });
}
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return jsonError("Check the unit generator values", 422, parsed.error.flatten());
  const context = await requestContext(request); const { propertyId } = parsed.data;
  if (context.demo) {
    const units = generatedUnits(parsed.data, context.organizationId);
    return NextResponse.json(units, { status: 201 });
  }
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data: property } = await context.supabase!.from("properties").select("id").eq("id", propertyId).eq("organization_id", context.organizationId).eq("archived", false).maybeSingle();
  if (!property) return jsonError("Property not found", 404);
  const units = generatedUnits(parsed.data, context.organizationId);
  const { data, error } = await context.supabase!.from("units").insert(units).select("id,name");
  if (error) {
    if (error.code === "23505") return jsonError("One or more generated unit names already exist for this property. Change the starting number or prefix and try again.", 409);
    return jsonError(error.message, 500);
  }
  return NextResponse.json(data, { status: 201 });
}
