import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAdminClient,
  requireDevelopmentProject,
  resetTestData,
  snapshotConfig,
} from "../scripts/lib/admin";

// Fuori da test-results, che Playwright svuota all'avvio.
const SNAPSHOT_DIR = join(tmpdir(), "gioca-merlara-e2e");
export const SNAPSHOT_FILE = join(SNAPSHOT_DIR, "config-snapshot.json");

/** Riparte da zero per gli utenti di prova e fotografa la configurazione, ripristinata alla fine. */
export default async function globalSetup() {
  if (!process.env.SUPABASE_SECRET_KEY) return;
  requireDevelopmentProject();
  const admin = createAdminClient();
  await resetTestData(admin);
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(await snapshotConfig(admin)));
}
