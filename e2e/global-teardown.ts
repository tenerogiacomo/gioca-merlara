import { existsSync, readFileSync, rmSync } from "node:fs";
import {
  createAdminClient,
  resetTestData,
  restoreConfig,
} from "../scripts/lib/admin";
import { SNAPSHOT_FILE } from "./global-setup";

/** Cancella i dati di prova e ripristina orario, sport e prezzi com'erano prima dei test. */
export default async function globalTeardown() {
  if (!existsSync(SNAPSHOT_FILE)) return;
  const admin = createAdminClient();
  await resetTestData(admin);
  await restoreConfig(admin, JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")));
  rmSync(SNAPSHOT_FILE);
}
