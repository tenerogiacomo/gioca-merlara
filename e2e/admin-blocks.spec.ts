import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createAdminClient, resetTestData } from "../scripts/lib/admin";
import { ensureProfile, signIn, slotAt } from "./helpers";

test.describe.configure({ mode: "serial" });

const admin = createAdminClient();
let idA: string;
let idB: string;

async function insertBooking(userId: string, startsAt: string, endsAt: string) {
  const { data, error } = await admin
    .from("bookings")
    .insert({
      user_id: userId,
      sport_id: "calcetto",
      starts_at: startsAt,
      ends_at: endsAt,
      price_cents: 5000,
      autocert_version: "test",
      autocert_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

test.beforeAll(async () => {
  idA = (await ensureProfile("USER_A"))!;
  idB = (await ensureProfile("USER_B"))!;
});

// I test di accesso che seguono partono da utenti senza profilo.
test.afterAll(() => resetTestData(admin));

test("per un utente normale blocchi, prenotazioni e CSV non esistono", async ({
  page,
}) => {
  await signIn(page, "USER_B");
  for (const path of [
    "/admin/blocchi",
    "/admin/prenotazioni",
    "/admin/prenotazioni/csv",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("blocco su un orario prenotato: annulla solo dopo la conferma, poi si rimuove", async ({
  page,
  browser,
}) => {
  const slot = slotAt(5, 18);
  await insertBooking(
    idA,
    slot.instant.toString(),
    slot.instant.add({ hours: 1 }).toString(),
  );

  await signIn(page, "SUPERADMIN");
  await page.goto("/admin/blocchi");
  await page.getByLabel("Giorno d'inizio").fill(slot.date);
  await page.getByLabel("Dalle").selectOption("17:30");
  await page.getByLabel("Giorno di fine").fill(slot.date);
  await page.getByLabel("Alle", { exact: true }).selectOption("19:00");
  await page.getByLabel("Motivo (facoltativo)").fill("Manutenzione impianto");
  await page.getByRole("button", { name: "Blocca", exact: true }).click();

  await expect(
    page.getByText("Ci sono prenotazioni in questo periodo"),
  ).toBeVisible();
  await expect(
    page.getByText(/18:00–19:00 · Mario Rossi · Calcetto/),
  ).toBeVisible();

  // Prima della conferma la prenotazione è ancora attiva e lo slot occupato.
  const calendar = await browser.newPage();
  await calendar.goto(`/prenota?giorno=${slot.date}`);
  await expect(calendar.getByText(/18:00–19:00 · Occupato/)).toBeVisible();

  await page
    .getByRole("button", { name: "Blocca e annulla 1 prenotazione" })
    .click();
  await expect(page.getByText(/Blocco salvato/)).toBeVisible();
  await expect(
    page.getByText(/È stata annullata 1 prenotazione/),
  ).toBeVisible();

  await calendar.reload();
  for (const hour of ["17:00–18:00", "18:00–19:00"]) {
    await expect(calendar.getByText(`${hour} · Non disponibile`)).toBeVisible();
  }
  await expect(calendar.getByText(/19:00–20:00 · Libero/)).toBeVisible();

  const userA = await browser.newContext();
  const userPage = await userA.newPage();
  await signIn(userPage, "USER_A");
  await userPage.goto("/prenotazioni");
  await expect(
    userPage.getByText(/Annullata dalla gestione: Manutenzione impianto/),
  ).toBeVisible();
  await userA.close();

  await page.reload();
  await page
    .getByRole("button", { name: /Rimuovi il blocco di .*17:30–19:00/ })
    .click();
  await page.getByRole("button", { name: "Sì, rimuovi" }).click();
  await expect(page.getByText("Nessun blocco in programma.")).toBeVisible();
  await calendar.reload();
  await expect(calendar.getByText(/18:00–19:00 · Libero/)).toBeVisible();
  await calendar.close();
});

test("annullo d'ufficio dall'elenco con il motivo", async ({ page }) => {
  const slot = slotAt(6, 20);
  await insertBooking(
    idB,
    slot.instant.toString(),
    slot.instant.add({ hours: 2 }).toString(),
  );
  await signIn(page, "SUPERADMIN");
  await page.goto("/admin/prenotazioni");
  const item = page.getByRole("listitem").filter({ hasText: "20:00–22:00" });
  await expect(item).toContainText("Bruno Prova");
  await expect(item).toContainText("Calcetto · 50,00 €");
  await item
    .getByRole("button", { name: /Annulla d'ufficio la prenotazione di/ })
    .click();
  await item.getByLabel("Motivo (facoltativo)").fill("Evento comunale");
  await item.getByRole("button", { name: "Sì, annulla d'ufficio" }).click();
  await expect(item).toContainText("Annullata dalla gestione: Evento comunale");
});

test("storico: CSV obbligatorio e doppia conferma prima di eliminare", async ({
  page,
}) => {
  await insertBooking(idA, "2021-03-05T17:00:00Z", "2021-03-05T18:00:00Z");
  await insertBooking(idB, "2021-03-06T17:00:00Z", "2021-03-06T19:00:00Z");

  await signIn(page, "SUPERADMIN");
  await page.goto("/admin/prenotazioni?dal=2021-03-01&al=2021-03-31");
  await expect(
    page.getByText(
      "2 prenotazioni dei giorni passati dal 1 marzo 2021 al 31 marzo 2021.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Elimina 2 prenotazioni/ }),
  ).toHaveCount(0);

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Scarica il CSV" }).click();
  const download = await downloading;
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain("Giorno;Inizio;Fine;Sport");
  expect(csv).toContain("05/03/2021;18:00;19:00;Calcetto;50,00;Mario;Rossi");
  expect(csv).toContain("06/03/2021;18:00;20:00;Calcetto;50,00;Bruno;Prova");

  await page
    .getByRole("button", {
      name: "Elimina 2 prenotazioni dal 1 marzo 2021 al 31 marzo 2021",
    })
    .click();
  await page.getByLabel("Per confermare scrivi 2").fill("3");
  await page.getByRole("button", { name: "Elimina definitivamente" }).click();
  await expect(
    page.getByText(/Per confermare scrivi il numero delle prenotazioni/),
  ).toBeVisible();

  await page.getByLabel("Per confermare scrivi 2").fill("2");
  await page.getByRole("button", { name: "Elimina definitivamente" }).click();
  await expect(
    page.getByText("Eliminate 2 prenotazioni dallo storico."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "0 prenotazioni dei giorni passati dal 1 marzo 2021 al 31 marzo 2021.",
    ),
  ).toBeVisible();
});
