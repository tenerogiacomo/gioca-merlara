import {
  createAdminClient,
  requireDevelopmentProject,
  resetTestData,
} from "../scripts/lib/admin";

/** Riparte da zero: nessun profilo né prenotazione per gli utenti di prova. */
export default async function globalSetup() {
  if (!process.env.SUPABASE_SECRET_KEY) return;
  requireDevelopmentProject();
  await resetTestData(createAdminClient());
}
