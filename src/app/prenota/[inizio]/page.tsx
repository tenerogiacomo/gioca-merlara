import type { Metadata } from "next";
import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { Alert } from "@/components/ui/alert";
import {
  AUTOCERT_PARAGRAPHS,
  AUTOCERT_TITLE,
} from "@/content/autocertificazione";
import { availableDurations } from "@/domain/booking-request";
import { formatPrice } from "@/domain/money";
import { requireProfile } from "@/server/auth";
import { loadSlotContext } from "@/server/booking/calendar";
import { formatDay, formatHours, formatTime } from "@/server/booking/format";
import { BookingForm, type SportOption } from "./booking-form";

export const metadata: Metadata = {
  title: "Conferma la prenotazione · Gioca Merlara",
};

/** Decodifica il parametro; un indirizzo malformato porta a "Orario non disponibile". */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function parseInstant(value: string): Temporal.Instant | null {
  try {
    return Temporal.Instant.from(value);
  } catch {
    return null;
  }
}

export default async function BookingPage({
  params,
}: PageProps<"/prenota/[inizio]">) {
  const { inizio } = await params;
  const raw = safeDecode(inizio);
  await requireProfile(`/prenota/${encodeURIComponent(raw)}`);

  const startsAt = parseInstant(raw);
  const { context, sportNames } = await loadSlotContext();
  const options: SportOption[] = startsAt
    ? context.sports
        .map((sport) => ({
          id: sport.id,
          name: sportNames[sport.id] ?? sport.name,
          durations: availableDurations({
            ...context,
            startsAt,
            sportId: sport.id,
          }).map((item) => ({
            slotCount: item.slotCount,
            label: `${formatHours(item.slotCount)}, fino alle ${formatTime(item.endsAt)}`,
            price: formatPrice(item.priceCents),
          })),
        }))
        .filter((option) => option.durations.length > 0)
    : [];

  if (!startsAt || options.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Orario non disponibile</h1>
        <Alert tone="warning">
          Questo orario non si può più prenotare: forse qualcuno l&apos;ha
          appena preso.
        </Alert>
        <Link
          href="/prenota"
          className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
        >
          Torna al calendario
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Conferma la prenotazione</h1>
      <p className="text-lg first-letter:uppercase">
        {formatDay(startsAt)}, dalle {formatTime(startsAt)}
      </p>
      <BookingForm
        startsAt={startsAt.toString()}
        options={options}
        autocert={{ title: AUTOCERT_TITLE, paragraphs: AUTOCERT_PARAGRAPHS }}
      />
      <Link
        href="/prenota"
        className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
      >
        Torna al calendario
      </Link>
    </section>
  );
}
