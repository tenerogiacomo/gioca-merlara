import type { Metadata } from "next";
import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { formatPrice } from "@/domain/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/server/auth";
import { formatDay, formatRange } from "@/server/booking/format";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "Le mie prenotazioni · Gioca Merlara",
};

const STATUS = {
  active: "",
  cancelled_by_user: "Annullata da te",
  cancelled_by_admin: "Annullata dalla gestione",
} as const;

export default async function MyBookingsPage({
  searchParams,
}: PageProps<"/prenotazioni">) {
  const { user } = await requireProfile("/prenotazioni");
  const { nuova } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [bookings, sports] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, sport_id, starts_at, ends_at, price_cents, status")
      .eq("user_id", user.id)
      .order("starts_at"),
    supabase.from("sports").select("id, name"),
  ]);
  if (bookings.error) throw bookings.error;
  if (sports.error) throw sports.error;

  const names = Object.fromEntries(
    sports.data.map((sport) => [sport.id, sport.name]),
  );
  const now = Temporal.Now.instant();
  const rows = bookings.data.map((row) => ({
    ...row,
    start: Temporal.Instant.from(row.starts_at),
    end: Temporal.Instant.from(row.ends_at),
  }));
  const upcoming = rows.filter(
    (row) =>
      row.status === "active" && Temporal.Instant.compare(row.start, now) > 0,
  );
  const others = rows
    .filter((row) => !upcoming.includes(row))
    .reverse()
    .slice(0, 10);

  const describe = (row: (typeof rows)[number]) =>
    `${formatDay(row.start)}, ${formatRange(row.start, row.end)}`;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Le mie prenotazioni</h1>
      {typeof nuova === "string" &&
        upcoming.some((row) => row.id === nuova) && (
          <Alert tone="success" title="Prenotazione confermata">
            Ti aspettiamo! Ritrovi qui sotto tutti i dettagli.
          </Alert>
        )}

      <h2 className="text-2xl font-semibold">Prossime</h2>
      {upcoming.length === 0 && (
        <p className="text-text-muted">Nessuna prenotazione in programma.</p>
      )}
      <ul className="flex flex-col gap-3">
        {upcoming.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-card"
          >
            <span className="font-semibold first-letter:uppercase">
              {describe(row)}
            </span>
            <span>
              {names[row.sport_id] ?? row.sport_id} ·{" "}
              {formatPrice(row.price_cents)}
            </span>
            <CancelButton id={row.id} label={describe(row)} />
          </li>
        ))}
      </ul>
      <Link href="/prenota" className={buttonClassName({ fullWidth: true })}>
        Nuova prenotazione
      </Link>

      {others.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold">Passate e annullate</h2>
          <ul className="flex flex-col gap-2">
            {others.map((row) => (
              <li
                key={row.id}
                className="flex flex-col rounded-control border border-divider p-3 text-text-muted"
              >
                <span className="first-letter:uppercase">{describe(row)}</span>
                <span>
                  {names[row.sport_id] ?? row.sport_id} ·{" "}
                  {formatPrice(row.price_cents)}
                  {STATUS[row.status] ? ` · ${STATUS[row.status]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
