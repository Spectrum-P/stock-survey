import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "blue" | "green" | "orange" | "red" }) {
  return <span className={cn(
    "inline-flex min-h-6 items-center rounded-lg px-2 py-0.5 text-xs font-semibold",
    tone === "neutral" && "bg-[var(--surface-muted)] text-[var(--ink-muted)]",
    tone === "blue" && "bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200",
    tone === "green" && "bg-[var(--leaf-soft)] text-[var(--leaf)]",
    tone === "orange" && "bg-[var(--orange-soft)] text-[var(--orange)]",
    tone === "red" && "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200",
    className
  )} {...props} />;
}
