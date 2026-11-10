const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/** Prezzo in centesimi per l'interfaccia: "Gratis" per lo zero, altrimenti es. "5,00 €". */
export function formatPrice(priceCents: number): string {
  return priceCents === 0 ? "Gratis" : euro.format(priceCents / 100);
}
