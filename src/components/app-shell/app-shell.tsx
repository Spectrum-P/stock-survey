"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Buildings,
  ChartBar,
  ClipboardText,
  FileText,
  ListChecks,
  SignOut,
  X,
  List,
} from "@/components/ui/icons";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { ConnectivityStatus } from "@/components/app-shell/connectivity";
import { ServiceWorkerRegistration } from "@/components/app-shell/service-worker-registration";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { Drawer } from "@/components/ui/drawer";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: ChartBar },
  { href: "/properties", label: "Properties", icon: Buildings },
  { href: "/records", label: "Records", icon: ClipboardText },
  { href: "/reports", label: "Reports", icon: FileText },
  {
    href: "/settings/reference-data",
    label: "Reference data",
    icon: ListChecks,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    try {
      if (hasSupabaseConfig) await createSupabaseBrowserClient().auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
      setSigningOut(false);
    }
  }
  const side = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-[var(--line)] px-5">
        <div className="grid size-10 place-items-center rounded-lg bg-[var(--brand)] text-white">
          <Buildings size={22} />
        </div>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-poppins)] text-sm font-semibold">
            Stock Condition
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Field survey workspace
          </p>
        </div>
        <span className="ml-auto rounded-full bg-[var(--leaf-soft)] px-2 py-1 text-[10px] font-bold text-[var(--leaf)]">
          Ready
        </span>
      </div>
      <nav className="grid gap-1 p-3" aria-label="Primary navigation">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
              )}
            >
              <Icon size={20} />
              {label}
              {active ? (
                <span
                  className="absolute right-3 size-1.5 rounded-full bg-white"
                  aria-hidden
                />
              ) : (
                <span className="ml-auto text-[10px] text-transparent transition-colors group-hover:text-[var(--brand)]">
                  ›
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--line)] p-3">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
        >
          <SignOut size={20} />
          {signingOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh]">
      <ServiceWorkerRegistration />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex">
        {side}
      </aside>
      <Drawer open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          className="absolute right-3 top-4 z-10"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </Button>
        {side}
      </Drawer>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <List size={21} />
            </Button>
            <div className="hidden text-sm text-[var(--ink-muted)] sm:block">
              Field surveys &amp; maintenance planning
            </div>
            <span className="hidden rounded-full bg-[var(--leaf-soft)] px-2 py-1 text-[10px] font-bold text-[var(--leaf)] md:inline-flex">
              Offline-ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectivityStatus />
            <ThemeToggle />
            <div
              className="grid size-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-xs font-bold text-[var(--brand)]"
              aria-label="Account"
            >
              AO
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 pb-24 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                active ? "text-[var(--brand)]" : "text-[var(--ink-muted)]",
              )}
            >
              <Icon size={21} />
              <span className="max-w-16 truncate">{label}</span>
              {active ? (
                <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[var(--brand)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
