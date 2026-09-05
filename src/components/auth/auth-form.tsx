"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Buildings, Envelope, Lock } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export function AuthForm({ mode, initialError = "" }: { mode: "login" | "signup" | "forgot" | "reset"; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    if (mode === "reset" && password !== confirm) { setError("The passwords do not match"); setLoading(false); return; }
    if (mode === "signup" && fullName.trim().length < 2) { setError("Enter your full name"); setLoading(false); return; }
    if (!hasSupabaseConfig) { setMessage("Demo mode is active. Opening the survey workspace."); window.setTimeout(() => router.push("/dashboard"), 500); setLoading(false); return; }
    const supabase = createSupabaseBrowserClient();
    if (mode === "login") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message); else router.push("/dashboard");
    } else if (mode === "signup") {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
        }
      });
      if (authError) setError(authError.message);
      else if (data.session) router.push("/dashboard");
      else setMessage("Check your email to confirm your account, then return here to sign in.");
    } else if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
      if (authError) setError(authError.message); else setMessage("Check your email for a secure reset link.");
    } else {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) setError(authError.message); else { setMessage("Your password has been updated."); window.setTimeout(() => router.push("/dashboard"), 700); }
    }
    setLoading(false);
  }

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Choose a new password";
  const description = mode === "login" ? "Sign in to continue field surveys and review records." : mode === "signup" ? "Create a secure workspace account for your survey portfolio." : mode === "forgot" ? "We will email a secure link to your account." : "Use at least eight characters for your new password.";
  return <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(360px,520px)_1fr]">
    <main className="flex items-center justify-center bg-[var(--surface)] px-5 py-10 sm:px-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--brand)] text-white"><Buildings size={24} weight="fill" /></span><span><strong className="block font-[family-name:var(--font-poppins)]">Stock Condition</strong><span className="text-xs text-[var(--ink-muted)]">Survey workspace</span></span></Link>
        <h1 className="text-3xl font-semibold">{title}</h1><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
        <form className="mt-8 grid gap-5" onSubmit={submit}>
          {mode !== "reset" ? <Field label="Email address" htmlFor="email" required><div className="relative"><Envelope size={19} className="pointer-events-none absolute left-3 top-3 text-[var(--ink-muted)]" /><Input id="email" type="email" autoComplete="email" className="pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></Field> : null}
          {mode === "signup" ? <Field label="Full name" htmlFor="fullName" required><Input id="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Amina Okafor" required /></Field> : null}
          {mode !== "forgot" ? <Field label={mode === "reset" ? "New password" : "Password"} htmlFor="password" required><div className="relative"><Lock size={19} className="pointer-events-none absolute left-3 top-3 text-[var(--ink-muted)]" /><Input id="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="pl-10" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></Field> : null}
          {mode === "reset" ? <Field label="Confirm new password" htmlFor="confirm" required><Input id="confirm" type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></Field> : null}
          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200" role="alert">{error}</div> : null}
          {message ? <div className="rounded-xl bg-[var(--leaf-soft)] p-3 text-sm font-medium text-[var(--leaf)]" role="status">{message}</div> : null}
          <Button type="submit" size="lg" disabled={loading}>{loading ? "Please wait" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">{mode === "login" ? <><Link className="font-semibold text-[var(--brand)] hover:underline" href="/forgot-password">Forgot your password?</Link><Link className="font-semibold text-[var(--brand)] hover:underline" href="/signup">Create an account</Link></> : <Link className="font-semibold text-[var(--brand)] hover:underline" href="/login">Return to sign in</Link>}</div>
      </div>
    </main>
    <aside className="hidden bg-[var(--brand)] px-16 py-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="max-w-xl"><p className="text-sm font-semibold text-blue-100">Built for field decisions</p><h2 className="mt-5 text-5xl font-semibold leading-[1.08]">Capture once. Plan with confidence.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">Structured condition records connect every inspection to lifecycle planning, evidence and accountable reporting.</p></div>
      <div className="grid max-w-xl grid-cols-3 gap-8 border-t border-white/25 pt-7 text-sm text-blue-100"><div><strong className="block text-2xl text-white">32</strong>survey elements</div><div><strong className="block text-2xl text-white">6</strong>guided stages</div><div><strong className="block text-2xl text-white">1</strong>auditable record</div></div>
    </aside>
  </div>;
}
