import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Same-origin API calls should carry both the SSR cookie (when available) and
 * the current access token. The bearer token makes requests reliable in
 * mobile/webview clients where document cookies may not be forwarded.
 */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (hasSupabaseConfig) {
    const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
