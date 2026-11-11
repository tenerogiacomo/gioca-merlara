import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { formatPrice } from "@/domain/money";
import { computeSlots } from "@/domain/slots";
import type { Slot } from "@/domain/types";
import { cx } from "@/lib/cx";
import { getCurrentUser } from "@/server/auth";
import { loadSlotContext, type Occupant } from "@/server/booking/calendar";
import {
  formatDay,
  formatRange,
  formatShortDay,
} from "@/server/booking/format";

export const metadata: Metadata = { title: "Prenota · Gioca Merlara" };

function occupantLabel(
  slot: Slot,
  occupants: Occupant[],
  sportNames: Record<string, string>,
) {
  const occupant = occupants.find(
    (item) =>
      item.startsAt.epochMilliseconds < slot.endsAt.epochMilliseconds &&
      slot.startsAt.epochMilliseconds < item.endsAt.epochMilliseconds,
  );
  if (!occupant?.firstName) return "Occupato";
  const sport = occupant.sportId ? sportNames[occupant.sportId] : undefined;
  return `Occupato · ${occupant.firstName}${sport ? `, ${sport}` : ""}`;
}

function pricesLabel(slot: Slot, sportNames: Record<string, string>) {
  return Object.entries(slot.prices)
    .map(
      ([sportId, price]) =>
        `${sportNames[sportId] ?? sportId} ${formatPrice(price)}`,
    )
    .join(" · ");
}

const STATUS_LABEL = {
  blocked: "Non disponibile",
  past: "Passato",
  unpriced: "Non prenotabile",
} as const;

export default async function CalendarPage({
  searchParams,
}: PageProps<"/prenota">) {
  const { giorno } = await searchParams;
  const [{ context, occupants, sportNames }, user] = await Promise.all([
    loadSlotContext(),
    getCurrentUser(),
  ]);
  const slots = computeSlots(context);

  const days = [
    ...new Map(slots.map((slot) => [slot.localDate.toString(), slot])).values(),
  ];
  const selected =
    days.find((slot) => slot.localDate.toString() === giorno) ?? days[0];
  const daySlots = selected
    ? slots.filter((slot) => slot.localDate.equals(selected.localDate))
    : [];

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Prenota</h1>
      {!user && (
        <Alert>
          Per prenotare{" "}
          <Link
            href="/accedi?next=%2Fprenota"
            className="font-semibold underline"
          >
            accedi
          </Link>{" "}
          con il tuo numero di cellulare.
        </Alert>
      )}

      {days.length === 0 ? (
        <p>
          Nelle prossime due settimane la struttura non ha orari prenotabili.
        </p>
      ) : (
        <>
          <nav
            aria-label="Giorni"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            {days.map((day, index) => {
              const date = day.localDate.toString();
              const isSelected = selected?.localDate.toString() === date;
              const label =
                index === 0
                  ? "Oggi"
                  : index === 1
                    ? "Domani"
                    : formatShortDay(day.startsAt);
              return (
                <Link
                  key={date}
                  href={`/prenota?giorno=${date}`}
                  aria-current={isSelected ? "date" : undefined}
                  className={cx(
                    "flex min-h-11 shrink-0 items-center rounded-full border px-4 font-semibold",
                    isSelected
                      ? "border-primary bg-accent text-primary"
                      : "border-divider bg-surface text-text",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {selected && (
            <h2 className="text-2xl font-semibold first-letter:uppercase">
              {formatDay(selected.startsAt)}
            </h2>
          )}

          <ul className="flex flex-col gap-2">
            {daySlots.map((slot) => {
              const time = formatRange(slot.startsAt, slot.endsAt);
              if (slot.status === "available") {
                return (
                  <li key={slot.startsAt.toString()}>
                    <Link
                      href={`/prenota/${encodeURIComponent(slot.startsAt.toString())}`}
                      className="flex flex-col rounded-control bg-surface p-3 shadow-card hover:bg-accent-soft"
                    >
                      <span className="font-semibold text-primary">
                        {time} · Libero
                      </span>
                      <span className="text-sm text-text-muted">
                        {pricesLabel(slot, sportNames)}
                      </span>
                    </Link>
                  </li>
                );
              }
              const label =
                slot.status === "booked"
                  ? occupantLabel(slot, occupants, sportNames)
                  : STATUS_LABEL[slot.status];
              return (
                <li
                  key={slot.startsAt.toString()}
                  className="flex flex-col rounded-control border border-divider p-3 text-text-muted"
                >
                  <span>
                    {time} · {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
