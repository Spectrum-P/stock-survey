export function PageHeader({ title, description, eyebrow, actions, action }: { title: string; description?: string; eyebrow?: string; actions?: React.ReactNode; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 border-b-2 border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}<h1 className="text-3xl font-semibold text-[var(--ink)] sm:text-4xl">{title}</h1>{description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:text-base">{description}</p> : null}</div>
    {actions || action ? <div className="flex flex-wrap gap-2">{actions ?? action}</div> : null}
  </header>;
}
