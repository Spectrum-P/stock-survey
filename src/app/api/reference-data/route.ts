import { NextResponse } from "next/server";
import { jsonError, requestContext } from "@/lib/api";
import { catalog } from "@/lib/catalog";

type ReferenceKind = "element" | "construction" | "defect" | "lifecycle";

function validKind(value: unknown): value is ReferenceKind {
  return value === "element" || value === "construction" || value === "defect" || value === "lifecycle";
}

export async function GET(request: Request) {
  const context = await requestContext(request);
  if (context.demo) return NextResponse.json({ demo: true, elements: catalog.map((item, index) => ({ id: `demo-${index}`, category: item.category, name: item.name, lifespan: item.lifespan, lifespanLabel: item.lifespanLabel, construction: item.constructionTypes, defects: item.defectTypes })) });
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { data, error } = await context.supabase!.from("elements").select("id,name,component_categories!inner(name),construction_types(id,name),defect_types(id,name),lifecycle_references(id,typical_life_years,minimum_life_years,maximum_life_years,source_label)").eq("organization_id", context.organizationId).order("name");
  if (error) return jsonError("Could not load reference data", 500);
  return NextResponse.json({ elements: (data ?? []).map((row) => { const item = row as unknown as { id: string; name: string; component_categories?: { name?: string } | null; lifecycle_references?: unknown; construction_types?: unknown[]; defect_types?: unknown[] }; return { id: item.id, category: item.component_categories?.name ?? "Other", name: item.name, lifecycle: Array.isArray(item.lifecycle_references) ? item.lifecycle_references[0] : item.lifecycle_references, construction: item.construction_types ?? [], defects: item.defect_types ?? [] }; }) });
}

export async function POST(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const body = await request.json().catch(() => null);
  if (!body || !validKind(body.kind)) return jsonError("A valid reference-data type is required");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("A name is required");
  if (body.kind === "element") {
    const categoryName = typeof body.category === "string" ? body.category.trim() : "";
    if (!categoryName) return jsonError("A category is required for an element");
    let { data: category } = await context.supabase!.from("component_categories").select("id").eq("organization_id", context.organizationId).eq("name", categoryName).maybeSingle();
    if (!category) {
      const created = await context.supabase!.from("component_categories").insert({ organization_id: context.organizationId, name: categoryName }).select("id").single();
      if (created.error || !created.data) return jsonError("Could not create category", 500);
      category = created.data;
    }
    const result = await context.supabase!.from("elements").insert({ organization_id: context.organizationId, category_id: category.id, name }).select("id").single();
    if (result.error) return jsonError("Could not create element", 500);
    return NextResponse.json({ id: result.data.id }, { status: 201 });
  }
  const elementId = typeof body.elementId === "string" ? body.elementId : "";
  if (!elementId) return jsonError("Choose an element first");
  if (body.kind === "lifecycle") {
    const years = Number(body.years);
    if (!Number.isInteger(years) || years < 1) return jsonError("Typical life must be at least one year");
    const result = await context.supabase!.from("lifecycle_references").upsert({ organization_id: context.organizationId, element_id: elementId, typical_life_years: years, source_label: typeof body.sourceLabel === "string" && body.sourceLabel.trim() ? body.sourceLabel.trim() : `${years} years` }, { onConflict: "element_id" });
    if (result.error) return jsonError("Could not save lifecycle reference", 500);
  } else {
    const result = await context.supabase!.from(body.kind === "construction" ? "construction_types" : "defect_types").insert({ organization_id: context.organizationId, element_id: elementId, name });
    if (result.error) return jsonError("Could not create reference option", 500);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await requestContext(request);
  if (!context.user || !context.organizationId) return jsonError("Authentication required", 401);
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind"); const id = searchParams.get("id");
  if (!id || !validKind(kind)) return jsonError("A valid reference-data record is required");
  const table = kind === "element" ? "elements" : kind === "construction" ? "construction_types" : kind === "defect" ? "defect_types" : "lifecycle_references";
  const { error } = await context.supabase!.from(table).delete().eq("id", id).eq("organization_id", context.organizationId);
  if (error) return jsonError("Could not delete reference-data record", 500);
  return NextResponse.json({ ok: true });
}
