"use client";

import { useEffect, useState } from "react";
import { Bell } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/client-api";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const binary = atob((value + padding).replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function PushNotificationToggle() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const available = Boolean(publicKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    setSupported(available);
    if (!available) return;
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setSubscribed(Boolean(subscription))).catch(() => undefined);
  }, [publicKey]);

  if (!supported) return null;

  async function toggle() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await authenticatedFetch("/api/push-subscriptions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setSubscribed(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted" || !publicKey) return;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await authenticatedFetch("/api/push-subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) {
        await subscription.unsubscribe();
        throw new Error("Could not enable report notifications");
      }
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  return <Button variant="ghost" size="icon" onClick={toggle} disabled={busy} aria-label={subscribed ? "Disable report notifications" : "Enable report notifications"} title={subscribed ? "Report notifications enabled" : "Enable report notifications"} className={subscribed ? "text-[var(--brand)]" : undefined}><Bell size={19} /></Button>;
}
