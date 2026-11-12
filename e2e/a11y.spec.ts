import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  ensureProfile,
  requestCode,
  signIn,
  slotAt,
  testUser,
} from "./helpers";

test.describe.configure({ mode: "serial" });

/** Violazioni gravi o critiche delle regole WCAG 2.2 AA sulla pagina aperta. */
async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((node) => node.target.join(" ")).slice(0, 5),
    }));
}

async function expectAccessible(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(await seriousViolations(page), path).toEqual([]);
}

test("pagine pubbliche", async ({ page }) => {
  for (const path of ["/", "/accedi", "/prenota", "/pagina-inesistente"]) {
    await expectAccessible(page, path);
  }
  // Con un messaggio d'errore (colori dei messaggi).
  await page.goto("/accedi");
  await page.getByLabel("Numero di cellulare").fill("12");
  await page.getByRole("button", { name: "Inviami il codice" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await seriousViolations(page), "/accedi con errore").toEqual([]);
  await requestCode(page, testUser("USER_B").national);
  expect(await seriousViolations(page), "/accedi/codice").toEqual([]);
});

test("completamento del profilo", async ({ page }) => {
  await signIn(page, "USER_B");
  await expectAccessible(page, "/profilo/completa");
});

test("pagine di chi ha un profilo", async ({ page }) => {
  await ensureProfile("USER_A");
  await signIn(page, "USER_A");
  for (const path of [
    "/profilo",
    "/prenota",
    slotAt(3, 18).path,
    "/prenotazioni",
  ]) {
    await expectAccessible(page, path);
  }
  // Conferma senza autocertificazione: messaggio d'errore.
  await page.goto(slotAt(3, 18).path);
  await page.getByRole("radio", { name: "Calcetto" }).check();
  await page.getByRole("button", { name: /^Prenota/ }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await seriousViolations(page), "prenotazione con errore").toEqual([]);
});

test("pagine di gestione", async ({ page }) => {
  await signIn(page, "SUPERADMIN");
  for (const path of [
    "/admin",
    "/admin/orario",
    "/admin/sport",
    "/admin/prezzi/calcetto",
    "/admin/blocchi",
    "/admin/prenotazioni",
    // Messaggi di avviso e di conferma dello storico.
    "/admin/prenotazioni?aggiornato=1&eliminate=2",
  ]) {
    await expectAccessible(page, path);
  }
});
