import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { propertySchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const parsed = propertySchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Check the property details", 422, parsed.error.flatten());
  const context = await requestContext(request);
  const { propertyId } = await params;
  if (context.demo) return NextResponse.json({ id: propertyId, ...parsed.data });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const input = parsed.data;
  const { data, error } = await context.supabase!.from("properties").update({
    name: input.name, building_name: input.buildingName || input.name, property_type: input.propertyType,
    address_line_1: input.addressLine1, address_line_2: input.addressLine2 || null, town: input.town,
    postcode: input.postcode.toUpperCase(), construction_year: input.constructionYear ?? null,
    number_of_storeys: input.numberOfStoreys ?? null, reference: input.reference || null,
  }).eq("id", propertyId).eq("organization_id", context.organizationId).eq("archived", false).select("id").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Property not found", 404);
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const context = await requestContext(request);
  const { propertyId } = await params;
  if (context.demo) return new NextResponse(null, { status: 204 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data, error } = await context.supabase!.from("properties").update({ archived: true }).eq("id", propertyId).eq("organization_id", context.organizationId).eq("archived", false).select("id").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Property not found", 404);
  return new NextResponse(null, { status: 204 });
}
