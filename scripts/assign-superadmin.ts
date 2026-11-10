/**
 * Assegna il ruolo superadmin a un utente, cercato per numero di telefono.
 * Uso: npm run admin:superadmin -- [numero] --confirm <riferimento progetto>
 * Senza numero usa TEST_PHONE_SUPERADMIN. L'utente deve aver già fatto l'accesso una volta,
 * e il nuovo ruolo vale dal suo accesso successivo.
 */
import {
  assignSuperadmin,
  createAdminClient,
  requireConfirmation,
  requireEnv,
} from "./lib/admin";

async function run() {
  const args = process.argv.slice(2);
  requireConfirmation(args);
  const phone =
    args.find((arg) => /^\+?\d{8,15}$/.test(arg)) ??
    requireEnv("TEST_PHONE_SUPERADMIN");
  const user = await assignSuperadmin(createAdminClient(), phone);
  console.log(`Ruolo superadmin assegnato all'utente ${user.id}.`);
}

run().catch(fail);

function fail(error: unknown): never {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
