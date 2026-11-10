import { err, ok, type Result } from "./result";

const SEPARATORS = /[\s\-.()/]/g;

/**
 * Prefissi ammessi. Al lancio solo l'Italia: il profilo richiede comunque il codice fiscale,
 * e limitare i paesi riduce l'abuso degli SMS verso numeri esteri a pagamento.
 */
export const ALLOWED_COUNTRY_CODES = ["39"] as const;

/**
 * Normalizza un numero di telefono nel formato usato da Supabase Auth: cifre con il prefisso
 * internazionale, senza `+`. Senza prefisso (`+` o `00`) il numero è considerato italiano.
 */
export function normalizePhone(
  input: string,
): Result<string, "invalid_phone" | "unsupported_country"> {
  const compact = input.replace(SEPARATORS, "");
  let international: string;
  if (/^\+\d+$/.test(compact)) international = compact.slice(1);
  else if (/^00\d+$/.test(compact)) international = compact.slice(2);
  else if (/^\d+$/.test(compact)) {
    // Numero italiano: fissi da 6 a 11 cifre, cellulari da 9 a 10.
    if (compact.length < 6 || compact.length > 11) return err("invalid_phone");
    international = `39${compact}`;
  } else return err("invalid_phone");

  // E.164: al massimo 15 cifre; almeno 8 per un numero reale con prefisso.
  if (international.length < 8 || international.length > 15) {
    return err("invalid_phone");
  }
  if (!ALLOWED_COUNTRY_CODES.some((code) => international.startsWith(code))) {
    return err("unsupported_country");
  }
  return ok(international);
}

/** Numero parzialmente nascosto da mostrare all'utente, es. `+39 ••• ••• 567`. */
export function maskPhone(normalized: string): string {
  const prefix = normalized.startsWith("39") ? "39" : normalized.slice(0, 2);
  return `+${prefix} ••• ••• ${normalized.slice(-3)}`;
}
