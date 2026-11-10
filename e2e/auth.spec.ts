import { expect, test } from "@playwright/test";
import { enterCode, fillProfile, requestCode, testUser } from "./helpers";

const mario = {
  firstName: "Mario",
  lastName: "Rossi",
  birthDate: "1985-12-10",
  taxCode: "rssmra85t10a562s",
};

function seventeenYearsAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 17);
  return date.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test("una pagina riservata porta all'accesso", async ({ page }) => {
  await page.goto("/profilo");
  await expect(page).toHaveURL(/\/accedi\?next=%2Fprofilo/);
});

test("un numero non valido viene segnalato", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByLabel("Numero di cellulare").fill("123");
  await page.getByRole("button", { name: "Inviami il codice" }).click();
  await expect(page.getByText("Il numero non sembra valido")).toBeVisible();
});

test("per ora si accede solo con un numero italiano", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByLabel("Numero di cellulare").fill("+41 79 123 45 67");
  await page.getByRole("button", { name: "Inviami il codice" }).click();
  await expect(
    page.getByText("solo con un numero di cellulare italiano"),
  ).toBeVisible();
});

test("accesso, profilo rifiutato, profilo salvato e uscita", async ({
  page,
}) => {
  const user = testUser("USER_A");
  await requestCode(page, user.national);
  await expect(page.getByText(/\+39 ••• ••• \d{3}/)).toBeVisible();

  await enterCode(page, "000000");
  await expect(
    page.getByText("Il codice non è corretto o è scaduto"),
  ).toBeVisible();

  await enterCode(page, user.otp);
  await expect(page).toHaveURL(/\/profilo\/completa/);

  await fillProfile(page, { ...mario, birthDate: seventeenYearsAgo() });
  await expect(page.getByText("riservata ai maggiorenni")).toBeVisible();

  await fillProfile(page, { ...mario, taxCode: "RSSMRA85T10A562T" });
  await expect(page.getByText("Il codice fiscale non è valido")).toBeVisible();

  await fillProfile(page, { ...mario, birthDate: "1985-12-11" });
  await expect(
    page.getByText("non corrisponde alla data di nascita"),
  ).toBeVisible();

  await fillProfile(page, mario);
  await expect(page).toHaveURL(/\/profilo$/);
  await expect(page.getByText("RSSMRA85T10A562S")).toBeVisible();
  await expect(page.getByText("10 dicembre 1985")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "neosaps@proton.me" }),
  ).toHaveAttribute("href", /^mailto:neosaps@proton\.me\?subject=/);

  // Il profilo è in sola lettura: la pagina di completamento rimanda al profilo.
  await page.goto("/profilo/completa");
  await expect(page).toHaveURL(/\/profilo$/);

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Accedi" }),
  ).toBeVisible();
});

test("lo stesso codice fiscale non apre un secondo profilo", async ({
  page,
}) => {
  const user = testUser("USER_B");
  await requestCode(page, user.national);
  await enterCode(page, user.otp);
  await expect(page).toHaveURL(/\/profilo\/completa/);
  await fillProfile(page, mario);
  await expect(
    page.getByText("Esiste già un profilo con questo codice fiscale"),
  ).toBeVisible();
  await expect(page.getByText("neosaps@proton.me")).toBeVisible();
});
