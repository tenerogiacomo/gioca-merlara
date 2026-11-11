import "server-only";
import { connection } from "next/server";
import { Temporal } from "temporal-polyfill";
import { HORIZON_DAYS } from "@/domain/config";
import type { SlotContext } from "@/domain/slots";
import { toRome } from "@/domain/time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  toBlocks,
  toBookedPeriods,
  toPriceRules,
  toSports,
  toWeeklySchedule,
} from "@/server/db/mappers";

export type Occupant = {
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  firstName: string | null;
  sportId: string | null;
};

/**
 * Tutto ciò che serve per calcolare il calendario dell'orizzonte, letto con la sessione
 * dell'utente (se c'è): configurazione pubblica, periodi bloccati e periodi occupati.
 * Nomi e sport di chi ha prenotato arrivano solo a chi ha un profilo (regole di S3).
 */
export async function loadSlotContext(): Promise<{
  context: SlotContext;
  occupants: Occupant[];
  sportNames: Record<string, string>;
}> {
  await connection();
  const now = Temporal.Now.instant();
  const from = toRome(now)
    .toPlainDate()
    .toZonedDateTime("Europe/Rome")
    .toInstant();
  const to = from.add({ hours: 24 * (HORIZON_DAYS + 1) });
  const range = { p_from: from.toString(), p_to: to.toString() };

  const supabase = await createSupabaseServerClient();
  const [intervals, sports, rules, blocks, occupied] = await Promise.all([
    supabase.from("opening_intervals").select("*"),
    supabase.from("sports").select("*"),
    supabase.from("price_rules").select("*"),
    supabase.rpc("blocked_periods", range),
    supabase.rpc("occupied_slots", range),
  ]);
  for (const result of [intervals, sports, rules, blocks, occupied]) {
    if (result.error) throw result.error;
  }

  const activeSports = toSports(sports.data!);
  return {
    context: {
      schedule: toWeeklySchedule(intervals.data!),
      sports: activeSports,
      priceRules: toPriceRules(rules.data!),
      blocks: toBlocks(blocks.data!),
      bookedPeriods: toBookedPeriods(occupied.data!),
      now,
    },
    occupants: occupied.data!.map((row) => ({
      startsAt: Temporal.Instant.from(row.starts_at),
      endsAt: Temporal.Instant.from(row.ends_at),
      firstName: row.first_name ?? null,
      sportId: row.sport_id ?? null,
    })),
    sportNames: Object.fromEntries(
      sports.data!.map((sport) => [sport.id, sport.name]),
    ),
  };
}
