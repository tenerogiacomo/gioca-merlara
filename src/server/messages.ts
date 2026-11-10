import type { CodiceFiscaleError } from "@/domain/codice-fiscale";

export type ProfileError =
  CodiceFiscaleError | "underage" | "invalid_birth_date" | "duplicate_tax_code";

/** Messaggi d'errore del profilo, in italiano: dicono cosa è successo e cosa fare (DESIGN.md §10). */
export function profileErrorMessage(
  error: ProfileError,
  supportEmail?: string,
): string {
  switch (error) {
    case "format":
    case "check_character":
      return "Il codice fiscale non è valido: controlla di averlo scritto tutto, senza errori di battitura.";
    case "birth_date_mismatch":
      return "Il codice fiscale non corrisponde alla data di nascita: controlla giorno, mese e anno.";
    case "name_mismatch":
      return "Il codice fiscale non corrisponde a nome e cognome: controlla di averli scritti come sul documento.";
    case "underage":
      return "Per ora la prenotazione è riservata ai maggiorenni: chiedi a un adulto di prenotare per te.";
    case "invalid_birth_date":
      return "La data di nascita non è valida: controlla di averla inserita correttamente.";
    case "duplicate_tax_code":
      return `Esiste già un profilo con questo codice fiscale. Se è il tuo, scrivi a ${supportEmail ?? "NEOS APS"}.`;
  }
}

/** Messaggi per gli errori di Supabase Auth durante l'accesso con OTP. */
export function authErrorMessage(error: {
  status?: number;
  code?: string;
}): string {
  if (error.status === 429 || error.code?.startsWith("over_")) {
    return "Hai chiesto troppi codici di seguito: aspetta un minuto e riprova.";
  }
  if (
    error.code === "otp_expired" ||
    error.code === "invalid_credentials" ||
    error.status === 403
  ) {
    return "Il codice non è corretto o è scaduto: controllalo o chiedine uno nuovo.";
  }
  return "Qualcosa non ha funzionato: riprova tra qualche istante.";
}
