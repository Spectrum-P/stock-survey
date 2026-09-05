import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient(accessToken?: string) {
  const { url, anonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always update cookies. Route handlers perform refreshes.
        }
      }
    }
  });
}

export function createSupabaseAdminClient() {
  const { url } = requireSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createServerClient(url, serviceKey, { cookies: { getAll: () => [], setAll: () => undefined } });
}
