import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  phone: string | null;
  isSuperadmin: boolean;
};

export type Profile = {
  first_name: string;
  last_name: string;
  birth_date: string;
  tax_code: string;
};

/**
 * Data Access Layer: unico punto in cui si legge la sessione. Usa `getClaims()`, che verifica
 * il token (mai `getSession()` lato server). Va chiamato dentro un confine `<Suspense>`.
 * `connection()` rimanda la lettura al momento della richiesta: `getClaims()` confronta la
 * scadenza del token con l'ora corrente, che non può essere valutata in anticipo (Cache Components).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { claims } = data;
  return {
    id: claims.sub,
    phone:
      typeof claims.phone === "string" && claims.phone ? claims.phone : null,
    isSuperadmin: claims.app_metadata?.role === "superadmin",
  };
});

/** Profilo dell'utente corrente, letto con le regole di accesso del database. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, birth_date, tax_code")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

/** Utente con sessione, altrimenti alla pagina di accesso (con ritorno a `next`). */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(next)}`);
  return user;
}

/** Utente con profilo completo, altrimenti al completamento del profilo. */
export async function requireProfile(
  next: string,
): Promise<{ user: CurrentUser; profile: Profile }> {
  const user = await requireUser(next);
  const profile = await getProfile();
  if (!profile) redirect("/profilo/completa");
  return { user, profile };
}

/**
 * Solo il superadmin. Per tutti gli altri, con o senza accesso, la pagina non esiste (404):
 * così l'area di gestione non si rivela.
 * Con `fresh: true` (per i salvataggi) il ruolo si rilegge dal server di Supabase invece che dal
 * token: se il ruolo viene tolto, smette di valere subito e non alla scadenza del token.
 */
export async function requireSuperadmin({
  fresh = false,
}: { fresh?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user?.isSuperadmin) notFound();
  if (fresh) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (
      error ||
      data.user?.id !== user.id ||
      data.user.app_metadata?.role !== "superadmin"
    ) {
      notFound();
    }
  }
  return user;
}
