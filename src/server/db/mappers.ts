import { Temporal } from "temporal-polyfill";
import {
  WEEKDAYS,
  type Block,
  type LocalTime,
  type PriceRule,
  type Sport,
  type Weekday,
  type WeeklySchedule,
} from "@/domain/types";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Functions = Database["public"]["Functions"];

/** `HH:MM:SS` del database in `HH:MM` del dominio. */
const fromDbTime = (time: string): LocalTime => time.slice(0, 5);

/** `HH:MM` del dominio in `HH:MM:SS` del database. */
export const toDbTime = (time: LocalTime): string => `${time}:00`;

export function toWeeklySchedule(
  rows: Tables["opening_intervals"]["Row"][],
): WeeklySchedule {
  const schedule = Object.fromEntries(
    WEEKDAYS.map((day) => [day, []]),
  ) as unknown as WeeklySchedule;
  const sorted = [...rows].sort((a, b) => a.opens.localeCompare(b.opens));
  for (const row of sorted) {
    schedule[row.weekday as Weekday].push({
      opens: fromDbTime(row.opens),
      closes: fromDbTime(row.closes),
    });
  }
  return schedule;
}

export function toPriceRules(
  rows: Tables["price_rules"]["Row"][],
): PriceRule[] {
  return rows.map((row) => ({
    sportId: row.sport_id,
    weekdays: row.weekdays as Weekday[],
    from: fromDbTime(row.from_time),
    to: fromDbTime(row.to_time),
    priceCents: row.price_cents,
  }));
}

/** Sport prenotabili, nell'ordine stabilito dal superadmin. */
export function toSports(rows: Tables["sports"]["Row"][]): Sport[] {
  return rows
    .filter((row) => row.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({ id: row.id, name: row.name }));
}

export function toBlocks(
  rows: Functions["blocked_periods"]["Returns"],
): Block[] {
  return rows.map((row) => ({
    startsAt: Temporal.Instant.from(row.starts_at),
    endsAt: Temporal.Instant.from(row.ends_at),
  }));
}

/**
 * Inizi degli slot occupati. Attenzione: i tipi generati dichiarano `sport_id` e `first_name`
 * come stringhe, ma per chi non ha una sessione (o per slot finiti) valgono `null`.
 */
export function toBookedStarts(
  rows: Functions["occupied_slots"]["Returns"],
): Temporal.Instant[] {
  return rows.map((row) => Temporal.Instant.from(row.starts_at));
}
