import { Temporal } from "temporal-polyfill";
import { HORIZON_DAYS, SLOT_MINUTES } from "./config";
import { err, ok, type Result } from "./result";
import { computeSlots, type SlotContext } from "./slots";
import { toRome } from "./time";
import type { Slot } from "./types";

export type BookingRequestError =
  | "unknown_sport"
  | "invalid_duration"
  | "not_aligned"
  | "past"
  | "beyond_horizon"
  | "outside_opening_hours"
  | "blocked"
  | "booked"
  | "unpriced"
  | "mixed_free_paid";

export type BookingQuote = {
  slots: Slot[];
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  /** Somma dei prezzi degli slot per lo sport scelto. */
  priceCents: number;
};

/** Errore che impedisce di prenotare un singolo slot per uno sport, se c'è. */
function slotProblem(slot: Slot, sportId: string): BookingRequestError | null {
  if (slot.status === "past") return "past";
  if (slot.status === "blocked") return "blocked";
  if (slot.status === "booked") return "booked";
  if (slot.prices[sportId] === undefined) return "unpriced";
  return null;
}

/**
 * Verifica lato server di una richiesta di prenotazione: inizio, numero di slot consecutivi e sport.
 * Restituisce slot, fine e prezzo totale, oppure il motivo per cui non si può prenotare.
 * Una prenotazione non unisce slot gratuiti e a pagamento: le fasce gratuite si prenotano a sé.
 */
export function checkBookingRequest(
  request: SlotContext & {
    startsAt: Temporal.Instant;
    sportId: string;
    slotCount: number;
  },
): Result<BookingQuote, BookingRequestError> {
  if (!request.sports.some((sport) => sport.id === request.sportId))
    return err("unknown_sport");
  if (!Number.isInteger(request.slotCount) || request.slotCount < 1) {
    return err("invalid_duration");
  }

  const local = toRome(request.startsAt);
  const minutes = local.hour * 60 + local.minute;
  const isAligned =
    minutes % SLOT_MINUTES === 0 &&
    local.second === 0 &&
    local.millisecond === 0 &&
    local.microsecond === 0 &&
    local.nanosecond === 0;
  if (!isAligned) return err("not_aligned");

  if (Temporal.Instant.compare(request.now, request.startsAt) >= 0)
    return err("past");

  const today = toRome(request.now).toPlainDate();
  const lastDay = today.add({ days: HORIZON_DAYS - 1 });
  if (Temporal.PlainDate.compare(local.toPlainDate(), lastDay) > 0)
    return err("beyond_horizon");

  const all = computeSlots(request);
  // Nel giorno del ritorno all'ora solare la seconda occorrenza dell'ora ripetuta
  // non è uno slot (D6 di S2): risulta fuori orario.
  const first = all.findIndex((slot) => slot.startsAt.equals(request.startsAt));
  if (first < 0) return err("outside_opening_hours");

  const slots: Slot[] = [];
  for (let i = 0; i < request.slotCount; i++) {
    const slot = all[first + i];
    const previous = slots.at(-1);
    // Gli slot devono essere consecutivi: ognuno inizia quando finisce il precedente.
    if (!slot || (previous && !previous.endsAt.equals(slot.startsAt))) {
      return err(i > 0 && !slot ? "beyond_horizon" : "outside_opening_hours");
    }
    const problem = slotProblem(slot, request.sportId);
    if (problem) return err(problem);
    slots.push(slot);
  }

  const prices = slots.map((slot) => slot.prices[request.sportId]);
  const freeSlots = prices.filter((price) => price === 0).length;
  if (freeSlots > 0 && freeSlots < prices.length) return err("mixed_free_paid");

  return ok({
    slots,
    startsAt: slots[0].startsAt,
    endsAt: slots.at(-1)!.endsAt,
    priceCents: prices.reduce((sum, price) => sum + price, 0),
  });
}

/**
 * Durate prenotabili a partire da uno slot per uno sport: da 1 slot fino al primo ostacolo
 * (slot non libero, senza prezzo, chiusura, cambio tra gratuito e a pagamento).
 */
export function availableDurations(
  request: SlotContext & { startsAt: Temporal.Instant; sportId: string },
): Array<{ slotCount: number; endsAt: Temporal.Instant; priceCents: number }> {
  const durations: Array<{
    slotCount: number;
    endsAt: Temporal.Instant;
    priceCents: number;
  }> = [];
  for (let slotCount = 1; ; slotCount++) {
    const quote = checkBookingRequest({ ...request, slotCount });
    if (!quote.ok) return durations;
    durations.push({
      slotCount,
      endsAt: quote.value.endsAt,
      priceCents: quote.value.priceCents,
    });
  }
}
