import Link from "next/link";
import { Buildings, MagnifyingGlass, PencilSimple, Plus, Warning } from "@/components/ui/icons";
import { getProperties } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeletePropertyButton } from "@/components/properties/delete-property-button";

export const metadata = { title: "Properties" };

export default async function PropertiesPage() {
  const properties = await getProperties();
  return <div className="grid gap-7"><PageHeader title="Properties" description="Manage buildings, units and their active stock condition surveys." actions={<Link href="/properties/new"><Button><Plus size={18} />Add property</Button></Link>} />
    <div className="relative max-w-lg"><MagnifyingGlass size={19} className="absolute left-3 top-3 text-[var(--ink-muted)]" /><input className="field-control pl-10" placeholder="Search properties or postcodes" aria-label="Search properties" /></div>
    {properties.length ? <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{properties.map((property) => { const percent = property.units ? Math.round((property.surveyedUnits / property.units) * 100) : 0; return <Card key={property.id} className="h-full p-5 transition-[border-color,box-shadow] duration-150 hover:border-[var(--brand)]"><div className="flex items-start justify-between gap-4"><Link href={`/properties/${property.id}`} className="group grid size-11 place-items-center rounded-xl bg-blue-50 text-[var(--brand)] transition-[background-color,transform] duration-150 hover:bg-blue-100 hover:scale-[1.02] dark:bg-blue-950/60 dark:hover:bg-blue-900/70" aria-label={`Open ${property.name}`}><Buildings size={23} weight="duotone" /></Link><div className="flex items-center gap-2"><Badge tone={property.urgentFindings ? "red" : "green"}>{property.urgentFindings ? <><Warning size={14} />{property.urgentFindings} urgent</> : "No urgent findings"}</Badge><Link href={`/properties/${property.id}/edit`}><Button size="icon" variant="secondary" aria-label={`Edit ${property.name}`} title={`Edit ${property.name}`}><PencilSimple size={17} /></Button></Link><DeletePropertyButton propertyId={property.id} propertyName={property.name} iconOnly /></div></div><Link href={`/properties/${property.id}`} className="group block"><h2 className="mt-5 text-lg font-semibold group-hover:text-[var(--brand)]">{property.name}</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">{property.address}</p><p className="text-sm text-[var(--ink-muted)]">{property.postcode}</p><div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4 text-sm"><div><strong className="metric-number block text-lg">{property.units}</strong><span className="text-xs text-[var(--ink-muted)]">Units</span></div><div><strong className="metric-number block text-lg">{property.surveyedUnits}</strong><span className="text-xs text-[var(--ink-muted)]">Surveyed</span></div><div><strong className="metric-number block text-lg">{percent}%</strong><span className="text-xs text-[var(--ink-muted)]">Coverage</span></div></div></Link></Card>; })}</section> : <EmptyState icon={Buildings} title="No properties yet" description="Create your first property to add flats or units and start a survey." action={<Link href="/properties/new"><Button><Plus size={18} />Add property</Button></Link>} />}
  </div>;
}
