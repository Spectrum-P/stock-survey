import Link from "next/link";
import {
  Buildings,
  ChartBar,
  ClipboardText,
  Warning,
} from "@/components/ui/icons";
import { getDashboardData, getProperties } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { formatDate } from "@/lib/utils";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    propertyId?: string;
    building?: string;
    propertyType?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const query = await searchParams;
  const filters = {
    propertyId: query.propertyId,
    building: query.building,
    propertyType: query.propertyType,
    from: query.from,
    to: query.to,
  };
  const [data, properties] = await Promise.all([
    getDashboardData(filters),
    getProperties(),
  ]);
  const maxCondition = Math.max(...data.condition.map((item) => item.count), 1);
  const totalCondition = data.condition.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const conditionPercent = (count: number) =>
    totalCondition ? Math.round((count / totalCondition) * 100) : 0;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Asset intelligence"
        title="Stock condition overview"
        description="A live view of stock condition, maintenance pressure and data confidence."
      />
      <DashboardFilters
        properties={properties}
        buildings={data.filterOptions.buildings}
        propertyTypes={data.filterOptions.propertyTypes}
        values={filters}
      />
      {!data.recordCount ? (
        <EmptyState
          icon={ClipboardText}
          eyebrow="Awaiting survey evidence"
          title={
            data.targetUnits
              ? "No element findings match this scope"
              : "Your dashboard is ready for its first survey"
          }
          description={
            data.targetUnits
              ? "Adjust the property, building or date filters, or open a unit workspace to save the first element assessment."
              : "Create a property and add its flats before starting the first stock condition survey."
          }
          tips={[
            "Dashboard metrics appear after an element assessment is saved.",
            "Draft work remains available offline and syncs when connected.",
          ]}
          action={
            <Link href={data.targetUnits ? "/properties" : "/properties/new"}>
              <Button>
                {data.targetUnits ? "Open properties" : "Add first property"}
              </Button>
            </Link>
          }
        />
      ) : null}
      <DashboardOverview
        items={[
          {
            icon: Buildings,
            label: "Buildings surveyed",
            value: data.buildings,
            note: `${data.buildings || 0} with saved records`,
          },
          {
            icon: Buildings,
            label: "Properties surveyed",
            value: data.properties,
            note: `${data.surveyedUnits} flats / units`,
            tone: "green",
          },
          {
            icon: ClipboardText,
            label: "Assessed records",
            value: data.recordCount,
            note: `${data.elements} unique elements`,
          },
          {
            icon: ChartBar,
            label: "Survey coverage",
            value: `${data.surveyCoverage}%`,
            note: `${data.completed} completed units · ${data.targetUnits} total`,
            tone: "green",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr_1fr]">
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Condition summary"
            subtitle="Every recorded defect row"
          />
          <div className="mt-5 grid gap-3">
            {data.condition.map((item) => {
              const label = {
                A: "Good",
                B: "Satisfactory",
                C: "Poor",
                D: "Failed",
              }[item.rating];
              const tone =
                item.rating === "A"
                  ? "bg-[var(--leaf)]"
                  : item.rating === "B"
                    ? "bg-[var(--brand)]"
                    : item.rating === "C"
                      ? "bg-[var(--orange)]"
                      : "bg-[var(--danger)]";
              return (
                <div
                  key={item.rating}
                  className="grid grid-cols-[28px_1fr_56px] items-center gap-3"
                >
                  <span
                    className={`grid size-7 place-items-center rounded-lg text-xs font-bold ${item.rating === "D" ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200" : "bg-[var(--surface-muted)]"}`}
                  >
                    {item.rating}
                  </span>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{label}</span>
                      <span className="text-[var(--ink-muted)]">
                        {conditionPercent(item.count)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div
                        className={`h-full rounded-full ${tone}`}
                        style={{
                          width: `${Math.max((item.count / maxCondition) * 100, item.count ? 6 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <strong className="metric-number text-right text-sm">
                    {item.count.toLocaleString("en-GB")}
                  </strong>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatBox
              label="A / B"
              value={`${conditionPercent(data.condition[0].count + data.condition[1].count)}%`}
              tone="green"
            />
            <StatBox
              label="C / D properties"
              value={`${data.propertyConditionPoor}%`}
              tone="orange"
            />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Priority summary"
            subtitle="By number of findings"
          />
          <div className="mt-5 grid gap-3">
            {data.priority.map((item) => (
              <div
                key={item.rating}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-8 place-items-center rounded-lg text-sm font-bold ${item.rating === "1" ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200" : item.rating === "2" ? "bg-[var(--orange-soft)] text-[var(--orange)]" : "bg-[var(--surface-muted)]"}`}
                  >
                    P{item.rating}
                  </span>
                  <span className="text-sm">
                    {
                      ["Urgent", "Essential", "Desirable", "Long-term"][
                        Number(item.rating) - 1
                      ]
                    }
                  </span>
                </div>
                <strong className="metric-number">{item.count}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            <Warning size={18} />
            {data.urgent} urgent findings require action
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Planned requirement"
            subtitle="Distinct element allowances by horizon"
          />
          <div className="mt-6 grid grid-cols-3 items-end gap-3">
            {data.horizons.slice(1, 4).map((item) => {
              const max = Math.max(
                ...data.horizons.map((entry) => entry.cost),
                1,
              );
              return (
                <div key={item.horizon} className="grid gap-2 text-center">
                  <div className="flex h-36 items-end justify-center">
                    <div
                      className="w-full max-w-16 rounded-t-lg bg-[var(--brand)]"
                      style={{
                        height: `${Math.max((item.cost / max) * 100, item.cost ? 10 : 2)}%`,
                      }}
                    />
                  </div>
                  <strong className="text-xs">
                    {item.cost
                      ? `£${Math.round(item.cost / 1000)}k`
                      : "Not recorded"}
                  </strong>
                  <span className="text-[11px] leading-4 text-[var(--ink-muted)]">
                    {item.horizon.replace(" years", " yrs")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid gap-2 rounded-xl bg-[var(--blue-soft)] p-3 text-sm">
            <span>
              {data.annualRequirement
                ? `Average annual requirement: £${Math.round(data.annualRequirement).toLocaleString("en-GB")}`
                : "Average annual requirement unavailable"}
            </span>
            <span>
              {data.conditionIndex === null
                ? "Condition Index unavailable"
                : `Condition Index ${data.conditionIndex.toFixed(2)} · analytical comparison only`}
            </span>
          </div>
        </Card>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr_1fr]">
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Condition by component"
            subtitle="A/B good or satisfactory versus C/D requiring attention"
          />
          <div className="mt-5 grid gap-3">
            {data.componentCondition.map((item) => (
              <div
                key={item.element}
                className="grid grid-cols-[minmax(110px,1fr)_2fr_42px] items-center gap-3 text-xs"
              >
                <span className="truncate">{item.element}</span>
                <div className="flex h-5 overflow-hidden rounded-md bg-red-100 dark:bg-red-950/40">
                  <div
                    className="grid place-items-center bg-[var(--leaf)] text-[10px] font-semibold text-white"
                    style={{ width: `${item.good}%` }}
                  >
                    {item.good >= 18 ? `${item.good}%` : ""}
                  </div>
                  <div
                    className="grid place-items-center bg-[var(--danger)] text-[10px] font-semibold text-white"
                    style={{ width: `${item.poor}%` }}
                  >
                    {item.poor >= 18 ? `${item.poor}%` : ""}
                  </div>
                </div>
                <span className="text-right text-[var(--ink-muted)]">
                  {item.poor}%
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Top 10 defects"
            subtitle="Most repeated findings"
          />
          <div className="mt-4 divide-y divide-[var(--line)]">
            {data.defects.slice(0, 10).map((item, index) => (
              <div
                key={item.defect}
                className="grid grid-cols-[24px_1fr_40px] gap-3 py-2 text-sm"
              >
                <span className="text-[var(--ink-muted)]">{index + 1}</span>
                <span className="truncate">{item.defect}</span>
                <strong className="metric-number text-right">
                  {item.count}
                </strong>
              </div>
            ))}
            {!data.defects.length ? (
              <p className="py-8 text-sm text-[var(--ink-muted)]">
                No findings recorded.
              </p>
            ) : null}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <PanelTitle
            title="Data quality"
            subtitle="Confidence in the planning dataset"
          />
          <div className="mt-5 grid gap-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Required fields</span>
                <strong>{data.dataCompleteness}%</strong>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--leaf)]"
                  style={{ width: `${data.dataCompleteness}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Evidence photos" value={data.photos} />
              <StatBox
                label="In progress"
                value={data.inProgress}
                tone="orange"
              />
            </div>
            <Link
              href="/records"
              className="text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Open the flat fact table →
            </Link>
          </div>
        </Card>
      </section>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-5 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Latest saved records in the selected scope.
            </p>
          </div>
          <Link
            href="/records"
            className="text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            View all records
          </Link>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-4 py-3">Building / property</th>
                <th className="px-4 py-3">Flat</th>
                <th className="px-4 py-3">Element</th>
                <th className="px-4 py-3">Defect</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Priority</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((record) => (
                <tr
                  key={record.id}
                  className="border-t border-[var(--line)] transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <td className="px-6 py-4 text-[var(--ink-muted)]">
                    {formatDate(record.surveyDate)}
                  </td>
                  <td className="px-4 py-4">
                    {record.building}
                    <span className="block text-xs text-[var(--ink-muted)]">
                      {record.property}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold">{record.unit}</td>
                  <td className="px-4 py-4">{record.element}</td>
                  <td className="max-w-xs truncate px-4 py-4">
                    {record.defect}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      tone={
                        record.condition === "D"
                          ? "red"
                          : record.condition === "C"
                            ? "orange"
                            : record.condition === "A"
                              ? "green"
                              : "blue"
                      }
                    >
                      {record.condition}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      tone={
                        record.priority === "1"
                          ? "red"
                          : record.priority === "2"
                            ? "orange"
                            : "neutral"
                      }
                    >
                      P{record.priority}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.recent.length ? (
            <div className="p-12 text-center text-sm text-[var(--ink-muted)]">
              No records match these filters.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{subtitle}</p>
    </div>
  );
}
function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "orange";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${tone === "green" ? "border-green-200 bg-[var(--leaf-soft)]" : tone === "orange" ? "border-orange-200 bg-[var(--orange-soft)]" : "border-[var(--line)]"}`}
    >
      <p className="text-xs text-[var(--ink-muted)]">{label}</p>
      <strong className="metric-number mt-2 block text-2xl">{value}</strong>
    </div>
  );
}
