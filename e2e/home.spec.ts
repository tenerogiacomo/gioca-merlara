import { expect, test } from "@playwright/test";

test("la pagina iniziale si apre su smartphone", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Gioca Merlara" }),
  ).toBeVisible();
});
