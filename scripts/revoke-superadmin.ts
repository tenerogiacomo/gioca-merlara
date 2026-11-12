/**
 * Toglie il ruolo superadmin a un utente, cercato per numero di telefono.
 * Uso: npm run admin:revoke -- <numero> --confirm <riferimento progetto>
 * I salvataggi in Gestione sono bloccati subito; le pagine restano visibili fino al prossimo
 * rinnovo dell'accesso (al massimo la durata del token, circa un'ora).
 */
import {
  createAdminClient,
  phoneArgument,
  requireConfirmation,
  revokeSuperadmin,
} from "./lib/admin";

async function run() {
  const args = process.argv.slice(2);
  requireConfirmation(args);
  const user = await revokeSuperadmin(createAdminClient(), phoneArgument(args));
  console.log(`Ruolo superadmin tolto all'utente ${user.id}.`);
}

run().catch(fail);

function fail(error: unknown): never {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
