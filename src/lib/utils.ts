import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function downloadCsv(filename: string, input: string[][] | Array<Record<string, unknown>>) {
  const rows: unknown[][] = input.length && !Array.isArray(input[0])
    ? [Object.keys(input[0] as Record<string, unknown>), ...input.map((row) => Object.values(row as Record<string, unknown>))]
    : input as string[][];
  const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
