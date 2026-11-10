import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AdminClient = SupabaseClient<Database>;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Manca ${name}: vedi .env.example`);
  return value;
}

/** Client con la chiave secret, per script e test. Mai nel codice dell'app servito al browser. */
export function createAdminClient(): AdminClient {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Riferimento del progetto (es. `hhyf…`) ricavato dall'URL. */
export function projectRef(): string {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

/**
 * Gli script che cancellano o sovrascrivono dati girano solo su un progetto dichiarato di sviluppo
 * (`SUPABASE_PROJECT_ENV=development` in .env.local). Il progetto di produzione non deve averla.
 */
export function requireDevelopmentProject(): void {
  if (process.env.SUPABASE_PROJECT_ENV !== "development") {
    throw new Error(
      "Rifiutato: questo script cancella dati e gira solo con SUPABASE_PROJECT_ENV=development",
    );
  }
}

/**
 * Gli script che modificano dati chiedono anche `--confirm <riferimento del progetto>`,
 * per rendere esplicito su quale progetto si sta agendo.
 */
export function requireConfirmation(argv: string[]): void {
  const index = argv.indexOf("--confirm");
  const given = index >= 0 ? argv[index + 1] : undefined;
  if (given !== projectRef()) {
    throw new Error(
      `Per procedere aggiungi: --confirm ${projectRef()} (riferimento del progetto di destinazione)`,
    );
  }
}

export async function findUserByPhone(
  admin: AdminClient,
  phone: string,
): Promise<User | null> {
  const normalized = phone.replace(/\D/g, "");
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.phone === normalized);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

/** Assegna il ruolo superadmin in `app_metadata`, che l'utente non può modificare. Ripetibile. */
export async function assignSuperadmin(
  admin: AdminClient,
  phone: string,
): Promise<User> {
  const user = await findUserByPhone(admin, phone);
  if (!user)
    throw new Error(
      `Nessun utente con il numero ${phone}: deve prima accedere una volta`,
    );
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "superadmin" },
  });
  if (error) throw error;
  return data.user;
}

export function testPhones(): string[] {
  return [
    "TEST_PHONE_USER_A",
    "TEST_PHONE_USER_B",
    "TEST_PHONE_SUPERADMIN",
  ].map(requireEnv);
}

/** Cancella prenotazioni e profili dei soli utenti di prova. Gli utenti restano. */
export async function resetTestData(admin: AdminClient): Promise<number> {
  const ids: string[] = [];
  for (const phone of testPhones()) {
    const user = await findUserByPhone(admin, phone);
    if (user) ids.push(user.id);
  }
  if (ids.length === 0) return 0;
  const bookings = await admin.from("bookings").delete().in("user_id", ids);
  if (bookings.error) throw bookings.error;
  const profiles = await admin.from("profiles").delete().in("id", ids);
  if (profiles.error) throw profiles.error;
  return ids.length;
}
