import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const schema = z.object({ propertyId: z.string().uuid(), unitId: z.string().uuid(), inspectionDate: z.string().date() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return jsonError("Check the survey details", 422);
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ...parsed.data }, { status: 201 });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data: unit } = await context.supabase!.from("units").select("id,property_id").eq("id", parsed.data.unitId).eq("property_id", parsed.data.propertyId).eq("organization_id", context.organizationId).eq("archived", false).maybeSingle();
  if (!unit) return jsonError("Unit not found for this property", 404);
  const { data: active } = await context.supabase!.from("surveys").select("id").eq("organization_id", context.organizationId).eq("unit_id", parsed.data.unitId).in("status", ["draft", "in_progress"]).order("inspection_date", { ascending: false }).limit(1).maybeSingle();
  if (active) return NextResponse.json(active);
  const { data, error } = await context.supabase!.from("surveys").insert({ organization_id: context.organizationId, property_id: parsed.data.propertyId, unit_id: parsed.data.unitId, inspection_date: parsed.data.inspectionDate, surveyor_id: context.user.id, status: "in_progress" }).select("id").single();
  if (error) return jsonError(error.message, 500); return NextResponse.json(data, { status: 201 });
}
