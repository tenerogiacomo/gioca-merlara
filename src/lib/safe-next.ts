const DEFAULT_PATH = "/profilo";
const ORIGIN = "http://gioca-merlara.invalid";

/**
 * Destinazione dopo l'accesso: solo percorsi interni del sito, mai indirizzi esterni
 * (che permetterebbero di dirottare l'utente su un sito di phishing) né le pagine di accesso.
 * Il percorso viene interpretato come farebbe il browser, che ignora tabulazioni e a capo:
 * se risolve fuori dal sito viene scartato.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next))
    return DEFAULT_PATH;
  let url: URL;
  try {
    url = new URL(next, ORIGIN);
  } catch {
    return DEFAULT_PATH;
  }
  if (url.origin !== ORIGIN) return DEFAULT_PATH;
  const path = url.pathname;
  if (path === "/accedi" || path.startsWith("/accedi/")) return DEFAULT_PATH;
  return `${path}${url.search}`;
}
