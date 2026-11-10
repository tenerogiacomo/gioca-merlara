import { Temporal } from "temporal-polyfill";
import { HORIZON_DAYS, SLOT_MINUTES } from "./config";
import { priceFor, slotStartsFor } from "./schedule";
import { formatLocalTime, romeLocalToInstant, toRome } from "./time";
import type {
  Block,
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
  /** Inizi degli slot con una prenotazione attiva. */
  bookedStarts: Temporal.Instant[];
  now: Temporal.Instant;
};

/** Slot dell'orizzonte (da oggi a oggi + 13 giorni, ora di Roma) con stato e prezzi per sport. */
export function computeSlots(context: SlotContext): Slot[] {
  const today = toRome(context.now).toPlainDate();
  const booked = new Set(
    context.bookedStarts.map((instant) => instant.epochMilliseconds),
  );
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
        status: statusOf({ startsAt, endsAt, prices }, context, booked),
        prices,
      });
    }
  }
  return slots;
}

function statusOf(
  slot: Pick<Slot, "startsAt" | "endsAt" | "prices">,
  context: SlotContext,
  booked: Set<number>,
): SlotStatus {
  if (Temporal.Instant.compare(context.now, slot.startsAt) >= 0) return "past";
  const blocked = context.blocks.some(
    (block) =>
      Temporal.Instant.compare(block.startsAt, slot.endsAt) < 0 &&
      Temporal.Instant.compare(slot.startsAt, block.endsAt) < 0,
  );
  if (blocked) return "blocked";
  if (booked.has(slot.startsAt.epochMilliseconds)) return "booked";
  if (Object.keys(slot.prices).length === 0) return "unpriced";
  return "available";
}
