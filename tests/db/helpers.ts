import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireEnv } from "../../scripts/lib/admin";

export type Client = SupabaseClient<Database>;

function publicClient(): Client {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Client senza sessione, come un visitatore che non ha fatto l'accesso. */
export const anonymousClient = publicClient;

/** Client con la sessione di un utente di prova (numero e OTP fisso da .env.local). */
export async function signedInClient(
  who: "USER_A" | "USER_B" | "SUPERADMIN",
): Promise<Client> {
  const client = publicClient();
  const phone = requireEnv(`TEST_PHONE_${who}`);
  const sent = await client.auth.signInWithOtp({ phone });
  if (sent.error) throw sent.error;
  const verified = await client.auth.verifyOtp({
    phone,
    token: requireEnv(`TEST_OTP_${who}`),
    type: "sms",
  });
  if (verified.error) throw verified.error;
  return client;
}

/** Inizio di slot nel 2030, lontano da qualsiasi dato reale. */
export function futureSlot(hour: number): {
  starts_at: string;
  ends_at: string;
} {
  const start = new Date(Date.UTC(2030, 5, 10, hour));
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}
