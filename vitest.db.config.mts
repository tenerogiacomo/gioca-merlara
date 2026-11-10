import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Test contro il progetto Supabase di sviluppo: richiedono .env.local e la rete.
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}));
