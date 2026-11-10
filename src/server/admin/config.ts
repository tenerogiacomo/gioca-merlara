import "server-only";
import { Temporal } from "temporal-polyfill";
import { slotStartsFor } from "@/domain/schedule";
import { toRome } from "@/domain/time";
import type { PriceRule, Weekday, WeeklySchedule } from "@/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPriceRules, toWeeklySchedule } from "@/server/db/mappers";
import type { Database } from "@/types/database";

export type SportRow = Database["public"]["Tables"]["sports"]["Row"];

/** Configurazione corrente, letta con la sessione del superadmin. */
export async function loadConfig(): Promise<{
  schedule: WeeklySchedule;
  sports: SportRow[];
  rules: PriceRule[];
}> {
  const supabase = await createSupabaseServerClient();
  const [intervals, sports, rules] = await Promise.all([
    supabase.from("opening_intervals").select("*"),
    supabase.from("sports").select("*").order("sort_order").order("name"),
    supabase.from("price_rules").select("*").order("from_time"),
  ]);
  for (const result of [intervals, sports, rules])
    if (result.error) throw result.error;
  return {
    schedule: toWeeklySchedule(intervals.data!),
    sports: sports.data!,
    rules: toPriceRules(rules.data!),
  };
}

const dateTime = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** Prenotazioni future attive che con il nuovo orario cadrebbero fuori apertura (D5: solo avviso). */
export async function futureBookingsOutside(
  schedule: WeeklySchedule,
): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("starts_at")
    .eq("status", "active")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data
    .filter(({ starts_at }) => {
      const local = toRome(Temporal.Instant.from(starts_at));
      const minutes = local.hour * 60 + local.minute;
      return !slotStartsFor(schedule, local.dayOfWeek as Weekday).includes(
        minutes,
      );
    })
    .map(({ starts_at }) => dateTime.format(new Date(starts_at)));
}
