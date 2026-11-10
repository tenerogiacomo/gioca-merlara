import { Temporal } from "temporal-polyfill";
import type { PriceRule, Sport, WeeklySchedule } from "./types";

/** Istante a partire da data e ora locali di Roma. */
export function rome(isoLocal: string): Temporal.Instant {
  return Temporal.PlainDateTime.from(isoLocal)
    .toZonedDateTime("Europe/Rome", { disambiguation: "earlier" })
    .toInstant();
}

/** Orario continuato 9–23 tutti i giorni (decisione D2). */
export const openNineToEleven: WeeklySchedule = {
  1: [{ opens: "09:00", closes: "23:00" }],
  2: [{ opens: "09:00", closes: "23:00" }],
  3: [{ opens: "09:00", closes: "23:00" }],
  4: [{ opens: "09:00", closes: "23:00" }],
  5: [{ opens: "09:00", closes: "23:00" }],
  6: [{ opens: "09:00", closes: "23:00" }],
  7: [{ opens: "09:00", closes: "23:00" }],
};

export const sports: Sport[] = [
  { id: "calcetto", name: "Calcetto" },
  { id: "tennis", name: "Tennis" },
];

/** Fascia gratuita feriale 15–17, il resto a pagamento con prezzi per sport. */
export const priceRules: PriceRule[] = [
  {
    sportId: "calcetto",
    weekdays: [1, 2, 3, 4, 5],
    from: "09:00",
    to: "15:00",
    priceCents: 4000,
  },
  {
    sportId: "calcetto",
    weekdays: [1, 2, 3, 4, 5],
    from: "15:00",
    to: "17:00",
    priceCents: 0,
  },
  {
    sportId: "calcetto",
    weekdays: [1, 2, 3, 4, 5],
    from: "17:00",
    to: "23:00",
    priceCents: 5000,
  },
  {
    sportId: "calcetto",
    weekdays: [6, 7],
    from: "09:00",
    to: "23:00",
    priceCents: 5000,
  },
  {
    sportId: "tennis",
    weekdays: [1, 2, 3, 4, 5],
    from: "09:00",
    to: "15:00",
    priceCents: 1600,
  },
  {
    sportId: "tennis",
    weekdays: [1, 2, 3, 4, 5],
    from: "15:00",
    to: "17:00",
    priceCents: 0,
  },
  {
    sportId: "tennis",
    weekdays: [1, 2, 3, 4, 5],
    from: "17:00",
    to: "23:00",
    priceCents: 2000,
  },
  {
    sportId: "tennis",
    weekdays: [6, 7],
    from: "09:00",
    to: "21:00",
    priceCents: 2000,
  },
];
