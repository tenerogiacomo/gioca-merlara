import "server-only";
import { Temporal } from "temporal-polyfill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminBooking } from "./csv";

export const HISTORY_PAGE_SIZE = 50;
/** Righe per richiesta: il massimo restituito dall'API di Supabase. */
const BATCH = 1000;

const COLUMNS =
  "id, starts_at, ends_at, price_cents, status, cancel_reason, cancelled_at, created_at, autocert_version, autocert_accepted_at, sport_id, user_id, profiles(first_name, last_name)";

/** Periodo dello storico: giorni di Roma, estremi compresi. Senza date, tutto lo storico. */
export type HistoryRange = {
  fromDate: string | null;
  toDate: string | null;
  from: Temporal.Instant | null;
  to: Temporal.Instant | null;
};

function parseDay(value: unknown): Temporal.PlainDate | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" });
  } catch {
    return null;
  }
}

/** Periodo dai parametri `dal` e `al` (AAAA-MM-GG); i valori non validi si ignorano. */
export function historyRange(params: {
  dal?: unknown;
  al?: unknown;
}): HistoryRange {
  const fromDay = parseDay(params.dal);
  const toDay = parseDay(params.al);
  const midnight = (day: Temporal.PlainDate) =>
    day.toZonedDateTime("Europe/Rome").toInstant();
  return {
    fromDate: fromDay?.toString() ?? null,
    toDate: toDay?.toString() ?? null,
    from: fromDay ? midnight(fromDay) : null,
    to: toDay ? midnight(toDay.add({ days: 1 })) : null,
  };
}

type Row = {
  id: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: AdminBooking["status"];
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  autocert_version: string;
  autocert_accepted_at: string;
  sport_id: string;
  user_id: string;
  profiles: { first_name: string; last_name: string } | null;
};

/** Completa le righe con nome dello sport e telefono (letto con la chiave secret). */
async function toAdminBookings(rows: Row[]): Promise<AdminBooking[]> {
  if (rows.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [sports, phones] = await Promise.all([
    supabase.from("sports").select("id, name"),
    createSupabaseServiceClient().rpc("user_phones", { p_ids: userIds }),
  ]);
  if (sports.error) throw sports.error;
  if (phones.error) throw phones.error;
  const sportNames = new Map(sports.data.map((s) => [s.id, s.name]));
  const phoneOf = new Map(phones.data.map((p) => [p.id, p.phone]));
  const instant = (value: string) => Temporal.Instant.from(value);
  return rows.map((row) => ({
    id: row.id,
    startsAt: instant(row.starts_at),
    endsAt: instant(row.ends_at),
    sportName: sportNames.get(row.sport_id) ?? row.sport_id,
    priceCents: row.price_cents,
    firstName: row.profiles?.first_name ?? "",
    lastName: row.profiles?.last_name ?? "",
    phone: phoneOf.get(row.user_id) ?? null,
    status: row.status,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at ? instant(row.cancelled_at) : null,
    createdAt: instant(row.created_at),
    autocertVersion: row.autocert_version,
    autocertAcceptedAt: instant(row.autocert_accepted_at),
  }));
}

/** Prenotazioni non ancora finite (anche annullate), dalla più vicina. Letta come superadmin. */
export async function loadUpcomingBookings(
  now: Temporal.Instant,
): Promise<AdminBooking[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .gt("ends_at", now.toString())
    .order("starts_at")
    .limit(BATCH);
  if (error) throw error;
  return toAdminBookings(data as Row[]);
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Query dello storico (non ancora eseguita): un builder di Supabase si esegue con `await`. */
function historyQuery(
  supabase: ServerClient,
  range: HistoryRange,
  now: Temporal.Instant,
) {
  let query = supabase
    .from("bookings")
    .select(COLUMNS, { count: "exact" })
    .lte("ends_at", now.toString());
  if (range.from) query = query.gte("starts_at", range.from.toString());
  if (range.to) query = query.lt("starts_at", range.to.toString());
  return query.order("starts_at", { ascending: false }).order("id");
}

/** Una pagina dello storico (prenotazioni concluse), dalla più recente. */
export async function loadHistoryPage(
  range: HistoryRange,
  page: number,
  now: Temporal.Instant,
): Promise<{ bookings: AdminBooking[]; total: number }> {
  const offset = (page - 1) * HISTORY_PAGE_SIZE;
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await historyQuery(supabase, range, now).range(
    offset,
    offset + HISTORY_PAGE_SIZE - 1,
  );
  if (error) throw error;
  return { bookings: await toAdminBookings(data as Row[]), total: count ?? 0 };
}

/** Tutto lo storico del periodo, a blocchi: per il CSV e per l'eliminazione. */
export async function loadAllHistory(
  range: HistoryRange,
  now: Temporal.Instant,
): Promise<AdminBooking[]> {
  const rows: Row[] = [];
  const supabase = await createSupabaseServerClient();
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await historyQuery(supabase, range, now).range(
      offset,
      offset + BATCH - 1,
    );
    if (error) throw error;
    rows.push(...(data as Row[]));
    if (data.length < BATCH) break;
  }
  return toAdminBookings(rows);
}

/** Prenotazioni indicate, dalla più vicina: per la conferma di un blocco. */
export async function loadBookingsByIds(
  ids: string[],
): Promise<AdminBooking[]> {
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .in("id", ids)
    .order("starts_at");
  if (error) throw error;
  return toAdminBookings(data as Row[]);
}

/** Solo gli identificativi dello storico del periodo: per l'impronta del CSV. */
export async function loadHistoryIds(
  range: HistoryRange,
  now: Temporal.Instant,
): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const ids: string[] = [];
  for (let offset = 0; ; offset += BATCH) {
    let query = supabase
      .from("bookings")
      .select("id")
      .lte("ends_at", now.toString());
    if (range.from) query = query.gte("starts_at", range.from.toString());
    if (range.to) query = query.lt("starts_at", range.to.toString());
    const { data, error } = await query
      .order("id")
      .range(offset, offset + BATCH - 1);
    if (error) throw error;
    ids.push(...data.map((row) => row.id));
    if (data.length < BATCH) return ids;
  }
}

const longDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Es. "dal 1 gennaio 2021 al 31 gennaio 2021", "di tutto lo storico". */
export function describeRange(range: HistoryRange): string {
  const day = (value: string) =>
    longDate.format(
      Temporal.PlainDate.from(value).toPlainDateTime().toZonedDateTime("UTC")
        .epochMilliseconds,
    );
  if (range.fromDate && range.toDate)
    return `dal ${day(range.fromDate)} al ${day(range.toDate)}`;
  if (range.fromDate) return `dal ${day(range.fromDate)}`;
  if (range.toDate) return `fino al ${day(range.toDate)}`;
  return "di tutto lo storico";
}
