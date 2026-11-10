/**
 * Dati di esempio per lo sviluppo: orario 9–23 tutti i giorni, tre sport e prezzi FINTI.
 * Sostituisce orario e prezzi (ripetibile, senza duplicati). Se esistono già prezzi
 * si ferma, a meno di `--force`, per non cancellare una configurazione reale.
 * I valori reali li configura il superadmin (step S5).
 * Uso: npm run db:seed -- --confirm <riferimento progetto> [--force]
 */
import {
  createAdminClient,
  requireConfirmation,
  requireDevelopmentProject,
} from "./lib/admin";

const admin = createAdminClient();

const weekdays = [1, 2, 3, 4, 5];
const weekend = [6, 7];

// Prezzi di esempio in centesimi, NON reali: servono solo a provare il calendario.
const examplePrices = {
  calcetto: { weekday: 4000, evening: 5000, weekend: 5000 },
  tennis: { weekday: 1600, evening: 2000, weekend: 2000 },
  basket: { weekday: 2500, evening: 3000, weekend: 3000 },
};

async function run() {
  const args = process.argv.slice(2);
  requireDevelopmentProject();
  requireConfirmation(args);
  const existing = await admin
    .from("price_rules")
    .select("id", { count: "exact", head: true });
  if (existing.error) throw existing.error;
  if ((existing.count ?? 0) > 0 && !args.includes("--force")) {
    throw new Error(
      `Ci sono già ${existing.count} regole di prezzo: aggiungi --force per sostituirle con quelle di esempio`,
    );
  }
  const sports = await admin.from("sports").upsert([
    { id: "calcetto", name: "Calcetto", active: true, sort_order: 1 },
    { id: "tennis", name: "Tennis", active: true, sort_order: 2 },
    { id: "basket", name: "Basket", active: true, sort_order: 3 },
  ]);
  if (sports.error) throw sports.error;

  const clearedHours = await admin
    .from("opening_intervals")
    .delete()
    .gte("id", 0);
  if (clearedHours.error) throw clearedHours.error;
  const hours = await admin.from("opening_intervals").insert(
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      opens: "09:00",
      closes: "23:00",
    })),
  );
  if (hours.error) throw hours.error;

  const clearedPrices = await admin.from("price_rules").delete().gte("id", 0);
  if (clearedPrices.error) throw clearedPrices.error;
  const rules = Object.entries(examplePrices).flatMap(([sportId, price]) => [
    {
      sport_id: sportId,
      weekdays,
      from_time: "09:00",
      to_time: "15:00",
      price_cents: price.weekday,
    },
    // Fascia gratuita feriale (indicativa, da confermare).
    {
      sport_id: sportId,
      weekdays,
      from_time: "15:00",
      to_time: "17:00",
      price_cents: 0,
    },
    {
      sport_id: sportId,
      weekdays,
      from_time: "17:00",
      to_time: "23:00",
      price_cents: price.evening,
    },
    {
      sport_id: sportId,
      weekdays: weekend,
      from_time: "09:00",
      to_time: "23:00",
      price_cents: price.weekend,
    },
  ]);
  const prices = await admin.from("price_rules").insert(rules);
  if (prices.error) throw prices.error;

  console.log("Dati di esempio caricati: orario 9–23, 3 sport, prezzi FINTI.");
}

run().catch(fail);

function fail(error: unknown): never {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
