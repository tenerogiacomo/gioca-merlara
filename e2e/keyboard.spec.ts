import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureProfile, signIn, slotAt } from "./helpers";

test.describe.configure({ mode: "serial" });

/** Preme Tab finché il focus arriva su `target`; a ogni passo il focus deve essere visibile. */
async function tabTo(page: Page, target: Locator, maxSteps = 120) {
  for (let step = 0; step < maxSteps; step++) {
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      // Il pannello di sviluppo di Next.js non esiste nel sito pubblicato.
      if (
        !element ||
        element === document.body ||
        element.tagName === "NEXTJS-PORTAL"
      )
        return null;
      const style = getComputedStyle(element);
      return {
        label: (
          element.textContent ||
          element.getAttribute("aria-label") ||
          element.tagName
        )
          .trim()
          .slice(0, 40),
        visible:
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
      };
    });
    if (outline)
      expect(outline.visible, `focus non visibile su "${outline.label}"`).toBe(
        true,
      );
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Elemento non raggiungibile con il tasto Tab");
}

test("prenotazione completa solo con la tastiera, con il focus sempre visibile", async ({
  page,
}) => {
  await ensureProfile("USER_A");
  await signIn(page, "USER_A");
  const slot = slotAt(2, 21);
  await page.goto(`/prenota?giorno=${slot.date}`);

  await tabTo(page, page.getByRole("link", { name: /21:00–22:00 · Libero/ }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Conferma la prenotazione" }),
  ).toBeVisible();

  const calcetto = page.getByRole("radio", { name: "Calcetto" });
  await tabTo(page, calcetto);
  await page.keyboard.press("Space");
  await expect(calcetto).toBeChecked();
  const oneHour = page.getByRole("radio", { name: /^1 ora/ });
  await tabTo(page, oneHour);
  await page.keyboard.press("Space");
  await expect(oneHour).toBeChecked();
  const autocert = page.getByLabel("Ho letto e accetto l'autocertificazione");
  await tabTo(page, autocert);
  await page.keyboard.press("Space");
  await expect(autocert).toBeChecked();
  await tabTo(page, page.getByRole("button", { name: /^Prenota/ }));
  await page.keyboard.press("Enter");

  await expect(page.getByText("Prenotazione confermata")).toBeVisible();
});

test.describe("schermo stretto (360 px)", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  async function expectNoHorizontalScroll(page: Page, paths: string[]) {
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} scorre di lato`).toBeLessThanOrEqual(0);
    }
  }

  test("pagine pubbliche e di chi prenota", async ({ page }) => {
    await expectNoHorizontalScroll(page, ["/", "/accedi", "/prenota"]);
    await signIn(page, "USER_A");
    await expectNoHorizontalScroll(page, [
      "/profilo",
      slotAt(3, 18).path,
      "/prenotazioni",
    ]);
  });

  test("pagine di gestione", async ({ page }) => {
    await signIn(page, "SUPERADMIN");
    await expectNoHorizontalScroll(page, [
      "/admin",
      "/admin/orario",
      "/admin/sport",
      "/admin/prezzi/calcetto",
      "/admin/blocchi",
      "/admin/prenotazioni",
    ]);
  });
});
