import { Temporal } from "temporal-polyfill";
import { HORIZON_DAYS, SLOT_MINUTES } from "./config";
import { priceFor, slotStartsFor } from "./schedule";
import { formatLocalTime, romeLocalToInstant, toRome } from "./time";
import type {
  Block,
  Period,
  PriceRule,
  Slot,
  SlotStatus,
  Sport,
  Weekday,
  WeeklySchedule,
} from "./types";

export type SlotContext = {
  schedule: WeeklySchedule;
  sports: Sport[];
  priceRules: PriceRule[];
  blocks: Block[];
  /** Periodi delle prenotazioni attive (anche di più ore). */
  bookedPeriods: Period[];
  now: Temporal.Instant;
};

/** Slot dell'orizzonte (da oggi a oggi + 13 giorni, ora di Roma) con stato e prezzi per sport. */
export function computeSlots(context: SlotContext): Slot[] {
  const today = toRome(context.now).toPlainDate();
  const slots: Slot[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const localDate = today.add({ days: offset });
    const weekday = localDate.dayOfWeek as Weekday;

    for (const startMinutes of slotStartsFor(context.schedule, weekday)) {
      const startsAt = romeLocalToInstant(localDate, startMinutes);
      if (startsAt === null) continue;
      const endsAt = startsAt.add({ minutes: SLOT_MINUTES });

      const prices: Record<string, number> = {};
      for (const sport of context.sports) {
        const price = priceFor(
          context.priceRules,
          sport.id,
          weekday,
          startMinutes,
        );
        if (price !== undefined) prices[sport.id] = price;
      }

      slots.push({
        startsAt,
        endsAt,
        localDate,
        localTime: formatLocalTime(startMinutes),
        status: statusOf({ startsAt, endsAt, prices }, context),
        prices,
      });
    }
  }
  return slots;
}

const overlaps = (a: Period, b: Period) =>
  Temporal.Instant.compare(a.startsAt, b.endsAt) < 0 &&
  Temporal.Instant.compare(b.startsAt, a.endsAt) < 0;

function statusOf(
  slot: Pick<Slot, "startsAt" | "endsAt" | "prices">,
  context: SlotContext,
): SlotStatus {
  if (Temporal.Instant.compare(context.now, slot.startsAt) >= 0) return "past";
  if (context.blocks.some((block) => overlaps(block, slot))) return "blocked";
  if (context.bookedPeriods.some((booking) => overlaps(booking, slot)))
    return "booked";
  if (Object.keys(slot.prices).length === 0) return "unpriced";
  return "available";
}
