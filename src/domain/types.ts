import type { Temporal } from "temporal-polyfill";

/**
 * Tipi di dominio. Sono la fonte di verità per lo schema del database (step S3):
 * lo schema si adegua a questi tipi, non il contrario.
 */

/** Giorno della settimana ISO: 1 = lunedì, 7 = domenica. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Ora locale di Roma nel formato `HH:MM`; `24:00` indica la mezzanotte di fine giornata. */
export type LocalTime = string;

export type OpeningInterval = { opens: LocalTime; closes: LocalTime };

/** Orario di apertura: per ogni giorno, zero o più intervalli. */
export type WeeklySchedule = Record<Weekday, OpeningInterval[]>;

export type Sport = { id: string; name: string };

/** Prezzo dello slot intero (non a persona) per uno sport, in certi giorni e in una fascia oraria. */
export type PriceRule = {
  sportId: string;
  weekdays: Weekday[];
  from: LocalTime;
  to: LocalTime;
  /** Centesimi di euro; zero per le fasce gratuite. */
  priceCents: number;
};

/** Intervallo di tempo, fine esclusa. */
export type Period = { startsAt: Temporal.Instant; endsAt: Temporal.Instant };

/** Periodo in cui la struttura non è prenotabile: una fascia o più giorni. */
export type Block = Period;

export type SlotStatus =
  "available" | "booked" | "blocked" | "past" | "unpriced";

export type Slot = {
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  localDate: Temporal.PlainDate;
  localTime: LocalTime;
  status: SlotStatus;
  /** Prezzo in centesimi per ogni sport prenotabile in questo slot. */
  prices: Record<string, number>;
};

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];
