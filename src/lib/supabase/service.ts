import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicSupabaseEnv } from "./env";

/**
 * Client con la chiave secret: scavalca le regole di accesso del database.
 * Solo server (`server-only` fa fallire la build se finisce nel browser).
 * Si usa per le scritture, dopo aver verificato sessione e regole di dominio.
 */
export function createSupabaseServiceClient() {
  const { url } = publicSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey)
    throw new Error("Manca SUPABASE_SECRET_KEY: vedi .env.example");
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
