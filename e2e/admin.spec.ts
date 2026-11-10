import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("senza accesso l'area di gestione non esiste", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Pagina non trovata" }),
  ).toBeVisible();
});

test("per un utente normale l'area di gestione non esiste", async ({
  page,
}) => {
  await signIn(page, "USER_B");
  for (const path of [
    "/admin",
    "/admin/orario",
    "/admin/sport",
    "/admin/prezzi/calcetto",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Gestione" }),
  ).toHaveCount(0);
});

test.describe("superadmin", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "SUPERADMIN");
  });

  test("orario: modifica salvata, intervalli sovrapposti rifiutati", async ({
    page,
  }) => {
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Gestione" })
      .click();
    await expect(page.getByRole("heading", { name: "Gestione" })).toBeVisible();
    await page.getByRole("link", { name: "Modifica l'orario" }).click();

    await page.getByLabel("Lunedì, chiusura 1").selectOption("22:00");
    await page.getByRole("button", { name: "Salva l'orario" }).click();
    await expect(page.getByText("Orario salvato.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Lunedì, chiusura 1")).toHaveValue("22:00");

    await page
      .getByRole("group", { name: "Lunedì" })
      .getByRole("button", { name: "Aggiungi intervallo" })
      .click();
    await page.getByRole("button", { name: "Salva l'orario" }).click();
    await expect(
      page.getByText("Lunedì: due intervalli si sovrappongono."),
    ).toBeVisible();
  });

  test("sport: aggiunta, nome duplicato rifiutato, disattivazione", async ({
    page,
  }) => {
    await page.goto("/admin/sport");
    await page.getByLabel("Nuovo sport").fill("Pallavolo prova");
    await page.getByRole("button", { name: "Aggiungi sport" }).click();
    await expect(page.getByText("Pallavolo prova aggiunto.")).toBeVisible();

    await page.getByLabel("Nuovo sport").fill("pallavolo prova");
    await page.getByRole("button", { name: "Aggiungi sport" }).click();
    await expect(
      page.getByText('Esiste già uno sport chiamato "pallavolo prova".'),
    ).toBeVisible();

    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Salva Pallavolo prova" }),
    });
    await form.getByLabel("Prenotabile").uncheck();
    await form.getByRole("button", { name: "Salva Pallavolo prova" }).click();
    await expect(form.getByText("Salvato.")).toBeVisible();
    await page.reload();
    await expect(
      page
        .locator("form")
        .filter({
          has: page.getByRole("button", { name: "Salva Pallavolo prova" }),
        })
        .getByLabel("Prenotabile"),
    ).not.toBeChecked();
  });

  test("prezzi: importo non valido, gratis e a pagamento misti rifiutati, avviso orari scoperti", async ({
    page,
  }) => {
    await page.goto("/admin/prezzi/calcetto");
    await expect(
      page.getByRole("heading", { name: "Prezzi: Calcetto" }),
    ).toBeVisible();

    await page.getByLabel("Prezzo dello slot (fascia 1)").fill("dieci");
    await page
      .getByRole("button", { name: "Salva i prezzi di Calcetto" })
      .click();
    await expect(page.getByText("Il prezzo non è valido")).toBeVisible();
    await page.reload();

    // La fascia gratuita 15–17 dei dati di esempio vale anche per gli altri sport.
    const freeIndex = await page
      .getByLabel(/Prezzo dello slot/)
      .evaluateAll((inputs) =>
        inputs.findIndex((input) => (input as HTMLInputElement).value === "0"),
      );
    expect(freeIndex).toBeGreaterThanOrEqual(0);
    await page
      .getByLabel(`Prezzo dello slot (fascia ${freeIndex + 1})`)
      .fill("5");
    await page
      .getByRole("button", { name: "Salva i prezzi di Calcetto" })
      .click();
    await expect(
      page.getByText(
        "una fascia deve essere gratuita o a pagamento per tutti gli sport",
      ),
    ).toBeVisible();
    await page.reload();

    const count = await page.getByLabel(/Prezzo dello slot/).count();
    await page
      .getByRole("button", { name: `Rimuovi la fascia ${count}` })
      .click();
    await page
      .getByRole("button", { name: "Salva i prezzi di Calcetto" })
      .click();
    await expect(page.getByText("Prezzi salvati.")).toBeVisible();
    await expect(
      page.getByText(/non è prenotabile perché non ha un prezzo/),
    ).toBeVisible();
  });
});
