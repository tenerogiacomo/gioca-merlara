import "server-only";
import { Temporal } from "temporal-polyfill";
import type { BlockInputError } from "@/domain/block";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function blockInputMessage(code: BlockInputError): string {
  switch (code) {
    case "invalid_date":
      return "Scegli date valide.";
    case "invalid_time":
      return "Scegli orari a mezz'ore.";
    case "nonexistent_time":
      return "Quell'ora non esiste per il passaggio all'ora legale: scegline un'altra.";
    case "end_before_start":
      return "La fine del blocco deve venire dopo l'inizio.";
    case "in_past":
      return "Il blocco deve iniziare nel futuro.";
  }
}

export type BlockRow = {
  id: number;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  reason: string | null;
};

/** Blocchi in corso o futuri, dal più vicino. Letti come superadmin (il motivo è riservato). */
export async function loadCurrentBlocks(
  now: Temporal.Instant,
): Promise<BlockRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blocks")
    .select("id, starts_at, ends_at, reason")
    .gt("ends_at", now.toString())
    .order("starts_at");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    startsAt: Temporal.Instant.from(row.starts_at),
    endsAt: Temporal.Instant.from(row.ends_at),
    reason: row.reason,
  }));
}

/** Fine dell'ultima prenotazione già iniziata che si sovrappone al periodo (per il messaggio di D2). */
export async function startedBookingEnd(
  startsAt: Temporal.Instant,
  endsAt: Temporal.Instant,
  now: Temporal.Instant,
): Promise<Temporal.Instant | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("ends_at")
    .eq("status", "active")
    .lte("starts_at", now.toString())
    .gt("ends_at", startsAt.toString())
    .lt("starts_at", endsAt.toString())
    .order("ends_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data[0] ? Temporal.Instant.from(data[0].ends_at) : null;
}
