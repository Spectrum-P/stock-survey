import type { Icon } from "@/components/ui/icons";

export function EmptyState({ icon: IconComponent, title, description, action, secondaryAction, eyebrow = "Nothing here yet", tips }: { icon: Icon; title: string; description: string; action?: React.ReactNode; secondaryAction?: React.ReactNode; eyebrow?: string; tips?: string[] }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
    <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--brand)]"><IconComponent size={28} weight="duotone" /></div>
    <p className="eyebrow text-[var(--brand)]">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--ink-muted)]">{description}</p>{tips?.length ? <div className="mt-5 grid max-w-md gap-2 text-left text-xs text-[var(--ink-muted)]">{tips.map((tip) => <div key={tip} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">{tip}</div>)}</div> : null}{action || secondaryAction ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}{secondaryAction}</div> : null}
  </div>;
}
