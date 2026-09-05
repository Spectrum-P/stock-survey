import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const schema = z.object({ propertyId: z.string().uuid(), prefix: z.string().min(1).max(40), start: z.number().int().min(1), count: z.number().int().min(1).max(200), flatType: z.string().max(80).optional(), floor: z.string().max(80).optional() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return jsonError("Check the unit generator values", 422, parsed.error.flatten());
  const context = await requestContext(request); const { propertyId, prefix, start, count, flatType, floor } = parsed.data;
  if (context.demo) {
    const units = Array.from({ length: count }, (_, offset) => ({ id: crypto.randomUUID(), organization_id: context.organizationId, property_id: propertyId, name: `${prefix} ${String(start + offset).padStart(2, "0")}`, reference: `${prefix.slice(0, 3).toUpperCase()}-${String(start + offset).padStart(3, "0")}`, flat_type: flatType || null, floor: floor || null }));
    return NextResponse.json(units, { status: 201 });
  }
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data: property } = await context.supabase!.from("properties").select("id").eq("id", propertyId).eq("organization_id", context.organizationId).eq("archived", false).maybeSingle();
  if (!property) return jsonError("Property not found", 404);
  const units = Array.from({ length: count }, (_, offset) => ({ id: crypto.randomUUID(), organization_id: context.organizationId, property_id: propertyId, name: `${prefix} ${String(start + offset).padStart(2, "0")}`, reference: `${prefix.slice(0, 3).toUpperCase()}-${String(start + offset).padStart(3, "0")}`, flat_type: flatType || null, floor: floor || null }));
  const { data, error } = await context.supabase!.from("units").insert(units).select("id,name");
  if (error) {
    if (error.code === "23505") return jsonError("One or more generated unit names already exist for this property. Change the starting number or prefix and try again.", 409);
    return jsonError(error.message, 500);
  }
  return NextResponse.json(data, { status: 201 });
}
