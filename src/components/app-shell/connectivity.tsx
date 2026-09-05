"use client";

import { CloudCheck, CloudSlash, ArrowsClockwise } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { queuedMutationCount, syncOutbox, syncQueuedMedia } from "@/lib/offline/db";

export function ConnectivityStatus() {
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function refresh() { setOnline(navigator.onLine); setQueued(await queuedMutationCount()); }
    async function handleOnline() { await refresh(); setSyncing(true); await syncOutbox(); await syncQueuedMedia(); setSyncing(false); await refresh(); }
    refresh();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", refresh);
    const interval = window.setInterval(refresh, 8000);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", refresh); window.clearInterval(interval); };
  }, []);

  return <div className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--ink-muted)]" title={queued ? `${queued} changes queued` : online ? "All changes synced" : "Changes will sync when online"}>
    {syncing ? <ArrowsClockwise size={16} className="animate-spin" /> : online ? <CloudCheck size={17} className="text-[var(--leaf)]" /> : <CloudSlash size={17} className="text-[var(--orange)]" />}
    <span className="hidden sm:inline">{syncing ? "Syncing" : online ? queued ? `${queued} offline changes` : "Online" : "Offline"}</span>
  </div>;
}
