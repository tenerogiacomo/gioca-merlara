import type { Metadata } from "next";
import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { periodOutsideSchedule } from "@/domain/block";
import { formatPrice } from "@/domain/money";
import { formatPhone } from "@/domain/phone";
import { toRome } from "@/domain/time";
import type { WeeklySchedule } from "@/domain/types";
import { requireSuperadmin } from "@/server/auth";
import {
  describeRange,
  HISTORY_PAGE_SIZE,
  historyRange,
  loadHistoryIds,
  loadHistoryPage,
  loadUpcomingBookings,
} from "@/server/admin/bookings";
import { loadConfig } from "@/server/admin/config";
import {
  fingerprint,
  statusLabel,
  type AdminBooking,
} from "@/server/admin/csv";
import { formatDay, formatRange } from "@/server/booking/format";
import { AdminNav } from "../admin-nav";
import { AdminCancelButton, DeleteHistory } from "./booking-controls";

export const metadata: Metadata = {
  title: "Prenotazioni · Gestione · Gioca Merlara",
};

function BookingDetails({
  booking,
  now,
  schedule,
}: {
  booking: AdminBooking;
  now: Temporal.Instant;
  schedule?: WeeklySchedule;
}) {
  const status = statusLabel(booking, now);
  const isCancelled = booking.status !== "active";
  const outside =
    schedule && !isCancelled && periodOutsideSchedule(schedule, booking);
  return (
    <>
      <span>
        {booking.sportName} · {formatPrice(booking.priceCents)}
      </span>
      <span>
        {booking.firstName} {booking.lastName}
        {booking.phone && (
          <>
            {" · "}
            <a
              href={`tel:+${booking.phone}`}
              className="font-semibold text-primary hover:underline"
            >
              {formatPhone(booking.phone)}
            </a>
          </>
        )}
      </span>
      {status !== "Attiva" && (
        <span className="text-text-muted">
          {status}
          {booking.cancelReason ? `: ${booking.cancelReason}` : ""}
        </span>
      )}
      {outside && (
        <Alert tone="warning">
          Fuori dall&apos;orario di apertura attuale.
        </Alert>
      )}
    </>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/admin/prenotazioni">) {
  await requireSuperadmin();
  const params = await searchParams;
  const now = Temporal.Now.instant();
  const range = historyRange(params);
  const page = Math.max(1, Math.floor(Number(params.pagina)) || 1);

  const [{ schedule }, upcoming, history, ids] = await Promise.all([
    loadConfig(),
    loadUpcomingBookings(now),
    loadHistoryPage(range, page, now),
    loadHistoryIds(range, now),
  ]);
  const pages = Math.max(1, Math.ceil(history.total / HISTORY_PAGE_SIZE));

  const days = new Map<string, AdminBooking[]>();
  for (const booking of upcoming) {
    const day = toRome(booking.startsAt).toPlainDate().toString();
    days.set(day, [...(days.get(day) ?? []), booking]);
  }

  const query = (extra: Record<string, string>) => {
    const search = new URLSearchParams(extra);
    if (range.fromDate) search.set("dal", range.fromDate);
    if (range.toDate) search.set("al", range.toDate);
    return `?${search}`;
  };
  const deleted = Number(params.eliminate);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Prenotazioni</h1>
      <AdminNav />

      <h2 className="text-2xl font-semibold">Prossime</h2>
      {upcoming.length === 0 && (
        <p className="text-text-muted">Nessuna prenotazione in programma.</p>
      )}
      {[...days.values()].map((bookings) => (
        <div key={bookings[0].id} className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold first-letter:uppercase">
            {formatDay(bookings[0].startsAt)}
          </h3>
          <ul className="flex flex-col gap-3">
            {bookings.map((booking) => {
              const hours = formatRange(booking.startsAt, booking.endsAt);
              const canCancel =
                booking.status === "active" &&
                Temporal.Instant.compare(booking.startsAt, now) > 0;
              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-card"
                >
                  <span className="font-semibold">{hours}</span>
                  <BookingDetails
                    booking={booking}
                    now={now}
                    schedule={schedule}
                  />
                  {canCancel && (
                    <AdminCancelButton
                      id={booking.id}
                      label={`${formatDay(booking.startsAt)}, ${hours}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <h2 id="storico" className="text-2xl font-semibold">
        Storico
      </h2>
      {Number.isInteger(deleted) && deleted > 0 && (
        <Alert tone="success">
          {deleted === 1
            ? "Eliminata 1 prenotazione dallo storico."
            : `Eliminate ${deleted} prenotazioni dallo storico.`}
        </Alert>
      )}
      <form
        method="get"
        action="/admin/prenotazioni#storico"
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label="Dal giorno"
          name="dal"
          type="date"
          defaultValue={range.fromDate ?? ""}
        />
        <TextField
          label="Al giorno"
          name="al"
          type="date"
          defaultValue={range.toDate ?? ""}
        />
        <Button type="submit" variant="secondary">
          Mostra
        </Button>
      </form>
      <p className="text-text-muted">
        {history.total === 1
          ? "1 prenotazione conclusa"
          : `${history.total} prenotazioni concluse`}{" "}
        {describeRange(range)}.
      </p>
      <ul className="flex flex-col gap-2">
        {history.bookings.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-col rounded-control border border-divider p-3"
          >
            <span className="font-semibold first-letter:uppercase">
              {formatDay(booking.startsAt)},{" "}
              {formatRange(booking.startsAt, booking.endsAt)},{" "}
              {toRome(booking.startsAt).year}
            </span>
            <BookingDetails booking={booking} now={now} />
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav
          aria-label="Pagine dello storico"
          className="flex flex-wrap items-center gap-4"
        >
          {page > 1 && (
            <Link
              href={`${query({ pagina: String(page - 1) })}#storico`}
              className="font-semibold text-primary hover:underline"
            >
              Più recenti
            </Link>
          )}
          <span>
            Pagina {page} di {pages}
          </span>
          {page < pages && (
            <Link
              href={`${query({ pagina: String(page + 1) })}#storico`}
              className="font-semibold text-primary hover:underline"
            >
              Meno recenti
            </Link>
          )}
        </nav>
      )}
      {ids.length > 0 && (
        <DeleteHistory
          key={fingerprint(ids)}
          count={ids.length}
          fingerprint={fingerprint(ids)}
          csvHref={`/admin/prenotazioni/csv${query({})}`}
          periodLabel={describeRange(range)}
          dal={range.fromDate}
          al={range.toDate}
        />
      )}
    </section>
  );
}
