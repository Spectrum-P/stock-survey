import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requestContext } from "@/lib/api";

const navigationSchema = z.object({ surveyId: z.string().uuid(), direction: z.enum(["next", "previous"]) });

export async function POST(request: Request) {
  const parsed = navigationSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Survey navigation details are invalid", 422);
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ surveyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", unitId: "demo-unit-1", unitName: "Flat 02", direction: parsed.data.direction });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data: current } = await context.supabase!.from("surveys").select("property_id,unit_id,inspection_date").eq("id", parsed.data.surveyId).eq("organization_id", context.organizationId).maybeSingle();
  if (!current) return jsonError("Survey not found", 404);
  const { data: units } = await context.supabase!.from("units").select("id,name").eq("property_id", current.property_id).eq("organization_id", context.organizationId).eq("archived", false).order("name");
  const index = (units ?? []).findIndex((unit) => unit.id === current.unit_id);
  const destination = parsed.data.direction === "next" ? units?.[index + 1] : units?.[index - 1];
  if (!destination) return jsonError(`There is no ${parsed.data.direction} apartment`, 404);
  const { data: active } = await context.supabase!.from("surveys").select("id").eq("organization_id", context.organizationId).eq("unit_id", destination.id).in("status", ["draft", "in_progress"]).order("inspection_date", { ascending: false }).limit(1).maybeSingle();
  if (active) return NextResponse.json({ surveyId: active.id, unitId: destination.id, unitName: destination.name, direction: parsed.data.direction });
  const { data: created, error } = await context.supabase!.from("surveys").insert({ organization_id: context.organizationId, property_id: current.property_id, unit_id: destination.id, inspection_date: current.inspection_date, surveyor_id: context.user.id, status: "in_progress" }).select("id").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ surveyId: created.id, unitId: destination.id, unitName: destination.name, direction: parsed.data.direction }, { status: 201 });
}
