import { existsSync, readFileSync, rmSync } from "node:fs";
import { createAdminClient, restoreConfig } from "../scripts/lib/admin";
import { SNAPSHOT_FILE } from "./global-setup";

/** Ripristina orario, sport e prezzi com'erano prima dei test. */
export default async function globalTeardown() {
  if (!existsSync(SNAPSHOT_FILE)) return;
  await restoreConfig(
    createAdminClient(),
    JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")),
  );
  rmSync(SNAPSHOT_FILE);
}
