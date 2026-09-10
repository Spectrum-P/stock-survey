import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  helper,
  error,
  required,
  hideLabel,
  children,
}: {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <label
        htmlFor={htmlFor}
        className={cn(
          "md:text-sm text-xs font-semibold text-[var(--ink)]",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required ? (
          <span className="ml-1 text-[var(--danger)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {helper && !error ? (
        <p className="text-xs leading-5 text-[var(--ink-muted)]">{helper}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field-control", className)} {...props} />;
}
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`md:text-sm! text-xs! ${cn("field-control", className)}`} {...props}>
      {children}
    </select>
  );
}
export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("field-control min-h-28 resize-y", className)}
      {...props}
    />
  );
}
