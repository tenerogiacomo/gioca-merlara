import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { publicSupabaseEnv } from "./env";

/** Client per i componenti del browser, con la chiave publishable. */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = publicSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
