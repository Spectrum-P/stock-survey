import Link from "next/link";
import { Buildings, MagnifyingGlass, Plus, Warning } from "@/components/ui/icons";
import { getProperties } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Properties" };

export default async function PropertiesPage() {
  const properties = await getProperties();
  return <div className="grid gap-7"><PageHeader title="Properties" description="Manage buildings, units and their active stock condition surveys." actions={<Link href="/properties/new"><Button><Plus size={18} />Add property</Button></Link>} />
    <div className="relative max-w-lg"><MagnifyingGlass size={19} className="absolute left-3 top-3 text-[var(--ink-muted)]" /><input className="field-control pl-10" placeholder="Search properties or postcodes" aria-label="Search properties" /></div>
    {properties.length ? <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{properties.map((property) => { const percent = property.units ? Math.round((property.surveyedUnits / property.units) * 100) : 0; return <Link key={property.id} href={`/properties/${property.id}`} className="group"><Card className="h-full p-5 transition-colors group-hover:border-[var(--brand)]"><div className="flex items-start justify-between gap-4"><div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-[var(--brand)] dark:bg-blue-950/60"><Buildings size={23} weight="duotone" /></div>{property.urgentFindings ? <Badge tone="red"><Warning size={14} />{property.urgentFindings} urgent</Badge> : <Badge tone="green">No urgent findings</Badge>}</div><h2 className="mt-5 text-lg font-semibold group-hover:text-[var(--brand)]">{property.name}</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">{property.address}</p><p className="text-sm text-[var(--ink-muted)]">{property.postcode}</p><div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4 text-sm"><div><strong className="metric-number block text-lg">{property.units}</strong><span className="text-xs text-[var(--ink-muted)]">Units</span></div><div><strong className="metric-number block text-lg">{property.surveyedUnits}</strong><span className="text-xs text-[var(--ink-muted)]">Surveyed</span></div><div><strong className="metric-number block text-lg">{percent}%</strong><span className="text-xs text-[var(--ink-muted)]">Coverage</span></div></div></Card></Link>; })}</section> : <EmptyState icon={Buildings} title="No properties yet" description="Create your first property to add flats or units and start a survey." action={<Link href="/properties/new"><Button><Plus size={18} />Add property</Button></Link>} />}
  </div>;
}
