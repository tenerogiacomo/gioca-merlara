import { Temporal } from "temporal-polyfill";
import { HORIZON_DAYS, SLOT_MINUTES } from "./config";
import { err, ok, type Result } from "./result";
import { computeSlots, type SlotContext } from "./slots";
import { toRome } from "./time";
import type { Slot } from "./types";

export type BookingRequestError =
  | "unknown_sport"
  | "not_aligned"
  | "past"
  | "beyond_horizon"
  | "outside_opening_hours"
  | "blocked"
  | "booked"
  | "unpriced";

/**
 * Verifica lato server di una richiesta di prenotazione: dato l'inizio e lo sport,
 * restituisce lo slot e il prezzo, oppure il motivo per cui non si può prenotare.
 */
export function checkBookingRequest(
  request: SlotContext & { startsAt: Temporal.Instant; sportId: string },
): Result<{ slot: Slot; priceCents: number }, BookingRequestError> {
  if (!request.sports.some((sport) => sport.id === request.sportId))
    return err("unknown_sport");

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

  // Nel giorno del ritorno all'ora solare la seconda occorrenza dell'ora ripetuta
  // non è uno slot (D6): risulta fuori orario.
  const slot = computeSlots(request).find((candidate) =>
    candidate.startsAt.equals(request.startsAt),
  );
  if (!slot) return err("outside_opening_hours");
  if (slot.status === "past") return err("past");
  if (slot.status === "blocked") return err("blocked");
  if (slot.status === "booked") return err("booked");

  const priceCents = slot.prices[request.sportId];
  if (priceCents === undefined) return err("unpriced");
  return ok({ slot, priceCents });
}
