import { getProperty, getUnits } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UnitManager } from "@/components/properties/unit-manager";
import { StartSurveyButton } from "@/components/properties/start-survey-button";
import { DuplicateCompletedFlatButton } from "@/components/properties/duplicate-completed-flat-button";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Buildings } from "@/components/ui/icons";

export default async function UnitsPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params; const [property, units] = await Promise.all([getProperty(propertyId), getUnits(propertyId)]);
  if (!property) notFound();
  return <div className="grid gap-7"><PageHeader title={`${property.name} units`} description="Generate numbered flats or maintain individual rooms and unit references." actions={<UnitManager propertyId={propertyId} />} />{units.length ? <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-[var(--surface-muted)] text-xs text-[var(--ink-muted)]"><tr><th className="px-6 py-3">Unit</th><th className="px-4 py-3">Flat type</th><th className="px-4 py-3">Floor</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Latest survey</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{units.map((unit, index) => <tr key={unit.id} className="border-t border-[var(--line)]"><td className="px-6 py-4 font-semibold">{unit.name}</td><td className="px-4 py-4 text-[var(--ink-muted)]">{unit.flatType ?? "Not recorded"}</td><td className="px-4 py-4 text-[var(--ink-muted)]">{unit.floor ?? "Not recorded"}</td><td className="px-4 py-4 text-[var(--ink-muted)]">UNIT-{String(index + 1).padStart(3, "0")}</td><td className="px-4 py-4 text-[var(--ink-muted)]">{unit.lastSurvey ?? "Not surveyed"}</td><td className="px-4 py-4">{unit.records}</td><td className="px-4 py-4"><StatusBadge status={unit.status} /></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2">{unit.completedSurveyId ? <DuplicateCompletedFlatButton surveyId={unit.completedSurveyId} sourceName={unit.name} /> : null}<StartSurveyButton propertyId={propertyId} unitId={unit.id} compact /></div></td></tr>)}</tbody></table></div></Card> : <EmptyState icon={Buildings} title="No flats or units yet" description="Generate numbered flats or add individual units before opening a survey workspace." tips={["Generated names are ordered deterministically, for example Flat 01, Flat 02.", "Each unit keeps its own survey status and inspection history."]} />}</div>;
}
