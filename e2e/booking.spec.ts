import { expect, test } from "@playwright/test";
import { Temporal } from "temporal-polyfill";
import { ensureProfile, signIn, slotAt } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // Gli utenti di prova accedono già nei test di accesso; qui servono entrambi con un profilo.
  await ensureProfile("USER_A");
  await ensureProfile("USER_B");
});

test("senza accesso il calendario mostra gli orari e invita ad accedere", async ({
  page,
}) => {
  await page.goto("/prenota");
  await expect(
    page.getByRole("heading", { name: "Prenota", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Oggi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Domani" })).toBeVisible();
  await expect(page.getByText("Per prenotare")).toBeVisible();
});

test("prenotazione di due ore con autocertificazione obbligatoria", async ({
  page,
}) => {
  await signIn(page, "USER_A");
  await page.goto(slotAt(3, 18).path);
  await expect(
    page.getByRole("heading", { name: "Conferma la prenotazione" }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Calcetto" }).check();
  await page.getByRole("radio", { name: "2 ore, fino alle 20:00" }).check();
  await page.getByRole("button", { name: /^Prenota/ }).click();
  await expect(
    page.getByText("Per prenotare devi accettare l'autocertificazione."),
  ).toBeVisible();

  await page.getByLabel("Ho letto e accetto l'autocertificazione").check();
  await page.getByRole("button", { name: /^Prenota/ }).click();
  await expect(page.getByText("Prenotazione confermata")).toBeVisible();
  const booked = page.getByRole("listitem").filter({ hasText: "18:00–20:00" });
  await expect(booked).toContainText("Calcetto · 100,00 €");
});

test("chi ha un profilo vede nome e sport nel calendario, anche per tutte le ore", async ({
  page,
}) => {
  await signIn(page, "USER_B");
  await page.goto(`/prenota?giorno=${slotAt(3, 18).date}`);
  await expect(
    page.getByText("18:00–19:00 · Occupato · Mario, Calcetto"),
  ).toBeVisible();
  await expect(
    page.getByText("19:00–20:00 · Occupato · Mario, Calcetto"),
  ).toBeVisible();
  await expect(page.getByText(/20:00–21:00 · Libero/)).toBeVisible();
});

test("due prenotazioni simultanee dello stesso orario: ne riesce una sola", async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [pageA, pageB] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  await signIn(pageA, "USER_A");
  await signIn(pageB, "USER_B");
  const { path } = slotAt(4, 19);
  await Promise.all([pageA.goto(path), pageB.goto(path)]);

  for (const page of [pageA, pageB]) {
    await page.getByRole("radio", { name: "Calcetto" }).check();
    await page.getByRole("radio", { name: "1 ora, fino alle 20:00" }).check();
    await page.getByLabel("Ho letto e accetto l'autocertificazione").check();
  }
  await Promise.all(
    [pageA, pageB].map((page) =>
      page.getByRole("button", { name: /^Prenota/ }).click(),
    ),
  );

  const outcomes = await Promise.all(
    [pageA, pageB].map(async (page) => {
      const confirmed = page.getByText("Prenotazione confermata");
      const refused = page.getByText(
        "Qualcuno ha appena prenotato questo orario",
      );
      await expect(confirmed.or(refused)).toBeVisible();
      return (await confirmed.isVisible()) ? "confermata" : "rifiutata";
    }),
  );
  expect(outcomes.sort()).toEqual(["confermata", "rifiutata"]);
  await Promise.all(contexts.map((context) => context.close()));
});

test("annullo: la prenotazione passa tra le annullate e l'orario torna libero", async ({
  page,
}) => {
  await signIn(page, "USER_A");
  await page.goto("/prenotazioni");
  const day = slotAt(3, 18);
  await page
    .getByRole("button", { name: /Annulla la prenotazione di .*18:00–20:00/ })
    .click();
  await page.getByRole("button", { name: "Sì, annulla" }).click();
  await expect(page.getByText("Annullata da te")).toBeVisible();

  await page.goto(`/prenota?giorno=${day.date}`);
  await expect(page.getByText(/18:00–19:00 · Libero/)).toBeVisible();
});

test("un indirizzo malformato viene rifiutato senza errori del server", async ({
  page,
}) => {
  const response = await page.goto("/prenota/%E0%A4%A");
  expect(response?.status()).toBe(400);
});

test("la fascia gratuita non si unisce a quella a pagamento", async ({
  page,
}) => {
  await signIn(page, "USER_A");
  // 14:00 di un giorno feriale tra 7 giorni: 14–15 a pagamento, poi 15–17 gratis (dati di esempio).
  let days = 7;
  while (
    [6, 7].includes(
      Temporal.Now.zonedDateTimeISO("Europe/Rome").toPlainDate().add({ days })
        .dayOfWeek,
    )
  )
    days++;
  await page.goto(slotAt(days, 14).path);
  await page.getByRole("radio", { name: "Calcetto" }).check();
  await expect(page.getByRole("radio", { name: /^1 ora/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^2 ore/ })).toHaveCount(0);
});
