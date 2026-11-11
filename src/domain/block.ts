import { Temporal } from "temporal-polyfill";
import { SLOT_MINUTES } from "./config";
import { err, ok, type Result } from "./result";
import { slotStartsFor } from "./schedule";
import {
  formatLocalTime,
  parseLocalTime,
  romeLocalToInstant,
  toRome,
} from "./time";
import type { LocalTime, Period, Weekday, WeeklySchedule } from "./types";

/** Passo dei blocchi: mezz'ora (S7, D1), indipendente dalla durata degli slot. */
export const BLOCK_STEP_MINUTES = 30;

const STEPS_PER_DAY = (24 * 60) / BLOCK_STEP_MINUTES;

/** Orari d'inizio di un blocco: dalle 00:00 alle 23:30. */
export const BLOCK_START_TIMES: LocalTime[] = Array.from(
  { length: STEPS_PER_DAY },
  (_, index) => formatLocalTime(index * BLOCK_STEP_MINUTES),
);

/** Orari di fine di un blocco: dalle 00:30 alle 24:00. */
export const BLOCK_END_TIMES: LocalTime[] = Array.from(
  { length: STEPS_PER_DAY },
  (_, index) => formatLocalTime((index + 1) * BLOCK_STEP_MINUTES),
);

export type BlockInput = {
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  /** Dalla mezzanotte del primo giorno alla mezzanotte dopo l'ultimo: gli orari si ignorano. */
  wholeDays: boolean;
};

export type BlockInputError =
  | "invalid_date"
  | "invalid_time"
  | "nonexistent_time"
  | "end_before_start"
  | "in_past";

function parseDate(value: string): Temporal.PlainDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" });
  } catch {
    return null;
  }
}

/** Minuti dalla mezzanotte se l'ora è a mezz'ore (24:00 compreso), altrimenti `null`. */
function parseStepTime(value: string): number | null {
  const minutes = parseLocalTime(value);
  if (minutes === null || minutes % BLOCK_STEP_MINUTES !== 0) return null;
  return minutes;
}

/** Istante di data e ora di Roma; 24:00 è la mezzanotte del giorno dopo. */
function toInstant(
  date: Temporal.PlainDate,
  minutes: number,
): Temporal.Instant | null {
  if (minutes === 24 * 60) return romeLocalToInstant(date.add({ days: 1 }), 0);
  return romeLocalToInstant(date, minutes);
}

/** Periodo di un blocco dai campi del modulo, nell'ora di Roma. Deve iniziare nel futuro (D2). */
export function parseBlockPeriod(
  input: BlockInput,
  now: Temporal.Instant,
): Result<Period, BlockInputError> {
  const fromDate = parseDate(input.fromDate);
  const toDate = parseDate(input.toDate);
  if (!fromDate || !toDate) return err("invalid_date");

  const fromMinutes = input.wholeDays ? 0 : parseStepTime(input.fromTime);
  const toMinutes = input.wholeDays ? 24 * 60 : parseStepTime(input.toTime);
  if (fromMinutes === null || toMinutes === null || fromMinutes === 24 * 60)
    return err("invalid_time");

  const startsAt = toInstant(fromDate, fromMinutes);
  const endsAt = toInstant(toDate, toMinutes);
  if (!startsAt || !endsAt) return err("nonexistent_time");
  if (Temporal.Instant.compare(startsAt, endsAt) >= 0)
    return err("end_before_start");
  if (Temporal.Instant.compare(startsAt, now) <= 0) return err("in_past");
  return ok({ startsAt, endsAt });
}

/**
 * Vero se almeno un'ora del periodo cade fuori dall'orario settimanale:
 * serve a segnalare le prenotazioni rimaste fuori dopo un cambio d'orario.
 */
export function periodOutsideSchedule(
  schedule: WeeklySchedule,
  period: Period,
): boolean {
  for (
    let start = period.startsAt;
    Temporal.Instant.compare(start, period.endsAt) < 0;
    start = start.add({ minutes: SLOT_MINUTES })
  ) {
    const local = toRome(start);
    const minutes = local.hour * 60 + local.minute;
    if (!slotStartsFor(schedule, local.dayOfWeek as Weekday).includes(minutes))
      return true;
  }
  return false;
}
