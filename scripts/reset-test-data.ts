/**
 * Cancella prenotazioni e profili dei soli 3 utenti di prova (TEST_PHONE_*).
 * Uso: npm run db:reset-test -- --confirm <riferimento progetto>
 */
import {
  createAdminClient,
  requireConfirmation,
  resetTestData,
} from "./lib/admin";

async function run() {
  requireConfirmation(process.argv.slice(2));
  const count = await resetTestData(createAdminClient());
  console.log(`Dati di prova ripuliti per ${count} utenti.`);
}

run().catch(fail);

function fail(error: unknown): never {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
