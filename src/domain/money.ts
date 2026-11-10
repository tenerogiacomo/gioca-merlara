import { err, ok, type Result } from "./result";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/** Prezzo in centesimi per l'interfaccia: "Gratis" per lo zero, altrimenti es. "5,00 €". */
export function formatPrice(priceCents: number): string {
  return priceCents === 0 ? "Gratis" : euro.format(priceCents / 100);
}

/** Prezzo massimo accettato per uno slot, per intercettare errori di battitura. */
const MAX_PRICE_CENTS = 999_99;

/**
 * Prezzo scritto dal superadmin in euro ("12,50", "12.5", "12", "gratis") in centesimi.
 * Al massimo due decimali, niente separatori delle migliaia.
 */
export function parsePrice(input: string): Result<number, "invalid_price"> {
  const text = input.replace(/€/g, "").trim().toLowerCase();
  if (text === "gratis") return ok(0);
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) return err("invalid_price");
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
  return cents > MAX_PRICE_CENTS ? err("invalid_price") : ok(cents);
}

/** Centesimi nel formato mostrato nei campi da modificare ("12,50"; "0" per gratis). */
export function formatPriceInput(priceCents: number): string {
  if (priceCents === 0) return "0";
  return (priceCents / 100).toFixed(2).replace(".", ",");
}
