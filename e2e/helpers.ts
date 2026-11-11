import { expect, type Page } from "@playwright/test";
import { Temporal } from "temporal-polyfill";
import { createAdminClient, findUserByPhone } from "../scripts/lib/admin";

export function testUser(who: "USER_A" | "USER_B" | "SUPERADMIN") {
  const phone = process.env[`TEST_PHONE_${who}`];
  const otp = process.env[`TEST_OTP_${who}`];
  if (!phone || !otp)
    throw new Error(
      `Mancano TEST_PHONE_${who} o TEST_OTP_${who} in .env.local`,
    );
  // Come lo scriverebbe una persona: numero italiano senza prefisso, con gli spazi.
  const national = phone
    .replace(/^39/, "")
    .replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
  return { national, otp };
}

export async function requestCode(page: Page, national: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto("/accedi");
    await page.getByLabel("Numero di cellulare").fill(national);
    await page.getByRole("button", { name: "Inviami il codice" }).click();
    const heading = page.getByRole("heading", { name: "Inserisci il codice" });
    const tooMany = page.getByText("Hai chiesto troppi codici");
    await expect(heading.or(tooMany)).toBeVisible();
    if (await heading.isVisible()) return;
    // Supabase impone qualche secondo tra due codici per lo stesso numero.
    await page.waitForTimeout(10_000);
  }
  throw new Error("Codice non inviato: troppi tentativi");
}

export async function signIn(
  page: Page,
  who: "USER_A" | "USER_B" | "SUPERADMIN",
) {
  const user = testUser(who);
  await requestCode(page, user.national);
  await enterCode(page, user.otp);
  await expect(
    page.getByRole("heading", { name: "Inserisci il codice" }),
  ).toBeHidden();
}

export async function enterCode(page: Page, code: string) {
  await page.getByLabel("Codice di 6 cifre").fill(code);
  await page.getByRole("button", { name: "Accedi" }).click();
}

export async function fillProfile(
  page: Page,
  profile: {
    firstName: string;
    lastName: string;
    birthDate: string;
    taxCode: string;
  },
) {
  await page.getByLabel("Nome", { exact: true }).fill(profile.firstName);
  await page.getByLabel("Cognome").fill(profile.lastName);
  await page.getByLabel("Data di nascita").fill(profile.birthDate);
  await page.getByLabel("Codice fiscale").fill(profile.taxCode);
  await page.getByRole("button", { name: "Salva il profilo" }).click();
}

/** Inizio di uno slot tra `days` giorni alle `hour` (ora di Roma), come lo usa l'indirizzo. */
export function slotAt(days: number, hour: number) {
  const date = Temporal.Now.zonedDateTimeISO("Europe/Rome")
    .toPlainDate()
    .add({ days });
  const instant = date
    .toZonedDateTime({ timeZone: "Europe/Rome", plainTime: { hour } })
    .toInstant();
  return {
    date: date.toString(),
    instant,
    path: `/prenota/${encodeURIComponent(instant.toString())}`,
  };
}

export const PROFILES = {
  USER_A: {
    first_name: "Mario",
    last_name: "Rossi",
    birth_date: "1985-12-10",
    tax_code: "RSSMRA85T10A562S",
  },
  USER_B: {
    first_name: "Bruno",
    last_name: "Prova",
    birth_date: "1990-01-01",
    tax_code: "PRVBRN90A01A001B",
  },
} as const;

/** Profilo dell'utente di prova, se manca (i dati di prova si azzerano a inizio e fine test). */
export async function ensureProfile(who: keyof typeof PROFILES) {
  const admin = createAdminClient();
  const user = await findUserByPhone(admin, process.env[`TEST_PHONE_${who}`]!);
  if (!user) return null;
  const existing = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing.data) {
    const result = await admin
      .from("profiles")
      .insert({ id: user.id, ...PROFILES[who] });
    if (result.error) throw result.error;
  }
  return user.id;
}
