import { NextResponse } from "next/server";
import { propertySchema } from "@/lib/schemas";
import { jsonError, requestContext } from "@/lib/api";

export async function POST(request: Request) {
  const parsed = propertySchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Check the property details", 422, parsed.error.flatten());
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ id: crypto.randomUUID(), ...parsed.data }, { status: 201 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const input = parsed.data;
  const { data, error } = await context.supabase!.from("properties").insert({ organization_id: context.organizationId, name: input.name, building_name: input.buildingName || input.name, property_type: input.propertyType, address_line_1: input.addressLine1, address_line_2: input.addressLine2 || null, town: input.town, postcode: input.postcode.toUpperCase(), construction_year: input.constructionYear ?? null, number_of_storeys: input.numberOfStoreys ?? null, reference: input.reference || null }).select("id").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
