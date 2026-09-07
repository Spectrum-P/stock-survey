"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Trash } from "@/components/ui/icons";

export function DeletePropertyButton({ propertyId, propertyName, iconOnly = false }: { propertyId: string; propertyName: string; iconOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(`Archive ${propertyName}? It will be removed from the property list, while its survey history is retained.`)) return;
    setBusy(true);
    const response = await authenticatedFetch(`/api/properties/${propertyId}`, { method: "DELETE" });
    if (!response.ok) { setBusy(false); window.alert((await response.json().catch(() => null))?.error ?? "Could not archive the property."); return; }
    router.push("/properties");
    router.refresh();
  }
  return <Button type="button" size={iconOnly ? "icon" : "md"} variant="danger" onClick={remove} disabled={busy} aria-label={iconOnly ? `Delete ${propertyName}` : undefined} title={iconOnly ? `Delete ${propertyName}` : undefined}><Trash size={18} />{!iconOnly ? (busy ? "Archiving" : "Delete property") : null}</Button>;
}
