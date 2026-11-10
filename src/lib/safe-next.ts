const DEFAULT_PATH = "/profilo";

/**
 * Destinazione dopo l'accesso: solo percorsi interni del sito, mai indirizzi esterni
 * (che permetterebbero di dirottare l'utente su un sito di phishing) né le pagine di accesso.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return DEFAULT_PATH;
  }
  if (
    next === "/accedi" ||
    next.startsWith("/accedi/") ||
    next.startsWith("/accedi?")
  ) {
    return DEFAULT_PATH;
  }
  return next;
}
