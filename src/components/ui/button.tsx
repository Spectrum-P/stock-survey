import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export function Button({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,transform] disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "min-h-9 px-3 text-sm", size === "md" && "min-h-11 px-4 text-sm", size === "lg" && "min-h-12 px-5 text-base", size === "icon" && "size-10 p-0 text-sm",
    variant === "primary" && "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
    variant === "secondary" && "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]",
    variant === "success" && "bg-[var(--leaf)] text-white hover:brightness-90",
    variant === "warning" && "bg-[var(--orange)] text-white hover:brightness-90",
    variant === "danger" && "bg-[var(--danger)] text-white hover:brightness-90",
    variant === "ghost" && "bg-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
    className
  )} {...props} />;
}
