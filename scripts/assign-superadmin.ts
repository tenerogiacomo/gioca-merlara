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
  const confirmIndex = args.indexOf("--confirm");
  const positional = args.filter(
    (_, index) => index !== confirmIndex && index !== confirmIndex + 1,
  );
  if (positional.length > 1)
    throw new Error("Indica al massimo un numero di telefono");
  const phone = positional[0] ?? requireEnv("TEST_PHONE_SUPERADMIN");
  if (!/^\d{8,15}$/.test(phone)) {
    throw new Error(
      `Numero non valido: ${phone}. Usa solo cifre con il prefisso, es. 393331234567`,
    );
  }
  const user = await assignSuperadmin(createAdminClient(), phone);
  console.log(`Ruolo superadmin assegnato all'utente ${user.id}.`);
}

run().catch(fail);

function fail(error: unknown): never {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
