import { expect, test } from "@playwright/test";

test("la pagina iniziale presenta la struttura e invita ad accedere", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Gioca Merlara" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "NEOS APS" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Stemma del Comune di Merlara" }),
  ).toBeVisible();
  await expect(
    page.getByText("In collaborazione con il Comune di Merlara"),
  ).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/accedi/);
});
