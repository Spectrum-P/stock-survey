import Link from "next/link";

function href(basePath: string, page: number, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  query.set("page", String(page));
  return `${basePath}?${query.toString()}`;
}

export function Pagination({ basePath, page, pageCount, total, label, params = {} }: { basePath: string; page: number; pageCount: number; total: number; label: string; params?: Record<string, string | undefined> }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-muted)]">
    <span>{total} {label} · Page {page} of {Math.max(1, pageCount)}</span>
    <div className="flex gap-2">
      {page > 1 ? <Link className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:border-[var(--brand)]" href={href(basePath, page - 1, params)}>Previous</Link> : <span className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] px-3 opacity-40">Previous</span>}
      {page < pageCount ? <Link className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 font-semibold text-[var(--ink)] hover:border-[var(--brand)]" href={href(basePath, page + 1, params)}>Next</Link> : <span className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] px-3 opacity-40">Next</span>}
    </div>
  </div>;
}
