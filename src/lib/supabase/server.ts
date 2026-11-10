import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { publicSupabaseEnv } from "./env";

/**
 * Client con la sessione dell'utente (cookie), per le letture nei Server Components
 * e nelle server actions. Le regole di accesso del database si applicano.
 * Con Cache Components va usato dentro un confine `<Suspense>`.
 */
export async function createSupabaseServerClient() {
  const { url, publishableKey } = publicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Nei Server Components i cookie non sono scrivibili: la sessione la aggiorna il proxy.
        }
      },
    },
  });
}
