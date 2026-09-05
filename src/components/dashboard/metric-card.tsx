import type { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";

export function MetricCard({ icon: IconComponent, label, value, note, tone = "blue" }: { icon: Icon; label: string; value: number | string; note: string; tone?: "blue" | "green" | "orange" }) {
  const colors = tone === "green" ? "bg-[var(--leaf-soft)] text-[var(--leaf)]" : tone === "orange" ? "bg-[var(--orange-soft)] text-[var(--orange)]" : "bg-[var(--blue-soft)] text-[var(--brand)]";
  return <Card className="p-5"><div className={`grid size-10 place-items-center rounded-lg ${colors}`}><IconComponent size={21} weight="duotone" /></div><p className="mt-5 text-sm font-medium text-[var(--ink-muted)]">{label}</p><p className="metric-number mt-1 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{note}</p></Card>;
}
