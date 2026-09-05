import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/lib/supabase/config";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (client) return client;
  const { url, anonKey } = requireSupabaseConfig();
  client = createBrowserClient(url, anonKey);
  return client;
}
