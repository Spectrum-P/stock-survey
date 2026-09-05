import type { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";

type OverviewItem = {
  icon: Icon;
  label: string;
  value: string | number;
  note: string;
  tone?: "brand" | "green" | "orange";
};

export function DashboardOverview({ items }: { items: OverviewItem[] }) {
  return (
    <Card className="overflow-hidden">
      <section className="grid md:grid-cols-4 grid-col-2" aria-label="Stock overview metrics">
        {items.map(
          (
            { icon: IconComponent, label, value, note, tone = "brand" },
            index,
          ) => {
            const valueColor =
              tone === "green"
                ? "text-[var(--leaf)]"
                : tone === "orange"
                  ? "text-[var(--orange)]"
                  : "text-[var(--brand)]";
            const divider =
              index < 2 ? "border-b border-[var(--line)] lg:border-b-0" : "";
            const verticalDivider =
              index !== items.length 
                ? "lg:border-r lg:border-[var(--line)]"
                : "";
            return (
              <div
                key={label}
                className={`min-h-36 px-5 py-6 sm:px-7 lg:py-8 ${divider} ${verticalDivider}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink-muted)]">
                  <IconComponent size={18} aria-hidden />
                  {label}
                </div>
                <p
                  className={`metric-number mt-4 text-3xl font-semibold sm:text-4xl ${valueColor}`}
                >
                  {value}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)] sm:text-sm">
                  {note}
                </p>
              </div>
            );
          },
        )}
      </section>
    </Card>
  );
}
