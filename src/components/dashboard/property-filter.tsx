"use client";

import { useRouter } from "next/navigation";

export function PropertyFilter({ properties, value }: { properties: Array<{ id: string; name: string }>; value?: string }) {
  const router = useRouter();
  return <label className="flex items-center gap-3 text-sm font-semibold"><span className="text-[var(--ink-muted)]">Property</span><select className="field-control min-h-10 min-w-48 text-sm" value={value ?? ""} onChange={(event) => router.push(event.target.value ? `/dashboard?propertyId=${encodeURIComponent(event.target.value)}` : "/dashboard") }><option value="">All properties</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>;
}
