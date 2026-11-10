/**
 * Identificativo di uno sport ricavato dal nome alla creazione (es. "Beach volley" → "beach-volley").
 * Rispetta il vincolo del database `^[a-z0-9-]{1,40}$`; poi non cambia più, anche se il nome cambia.
 */
export function sportIdFromName(name: string): string | null {
  const id = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return id || null;
}
