import { defineConfig, devices } from "@playwright/test";

// I test usano i numeri di prova e il progetto Supabase di sviluppo da .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Senza .env.local girano solo i test che non richiedono Supabase.
}

const port = 3000;

export default defineConfig({
  testDir: "./e2e",
  // In sequenza: Supabase impone un'attesa tra due codici per lo stesso numero.
  fullyParallel: false,
  workers: 1,
  // Limiti espliciti: un server bloccato deve far fallire i test, non fermarli per minuti.
  timeout: 60_000,
  globalTimeout: 5 * 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "smartphone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    // Sempre un server nuovo: riusarne uno rimasto aperto ha bloccato i test.
    reuseExistingServer: false,
  },
});
