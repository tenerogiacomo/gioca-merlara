import type { Temporal } from "temporal-polyfill";

const TIME_ZONE = "Europe/Rome";

const dayFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const shortDayFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const toDate = (instant: Temporal.Instant) =>
  new Date(instant.epochMilliseconds);

/** Es. "giovedì 12 novembre". */
export const formatDay = (instant: Temporal.Instant) =>
  dayFormat.format(toDate(instant));
/** Es. "gio 12". */
export const formatShortDay = (instant: Temporal.Instant) =>
  shortDayFormat.format(toDate(instant));
/** Es. "18:00". */
export const formatTime = (instant: Temporal.Instant) =>
  timeFormat.format(toDate(instant));
/** Es. "18:00–20:00". */
export const formatRange = (from: Temporal.Instant, to: Temporal.Instant) =>
  `${formatTime(from)}–${formatTime(to)}`;
/** Es. "1 ora", "3 ore". */
export const formatHours = (count: number) =>
  count === 1 ? "1 ora" : `${count} ore`;

/**
 * Periodo di un blocco, es. "giovedì 12 novembre, 18:30–20:30",
 * "da sabato 1 agosto a sabato 15 agosto, giornate intere" oppure
 * "da giovedì 12 novembre, 18:30 a sabato 14 novembre, 10:00".
 */
export function formatPeriod(
  from: Temporal.Instant,
  to: Temporal.Instant,
): string {
  const start = from.toZonedDateTimeISO(TIME_ZONE);
  const end = to.toZonedDateTimeISO(TIME_ZONE);
  const endsAtMidnight = end.hour === 0 && end.minute === 0;
  // La mezzanotte finale appartiene al giorno prima ("fino alle 24:00").
  const lastDay = endsAtMidnight
    ? end.subtract({ days: 1 }).toPlainDate()
    : end.toPlainDate();
  const lastDayInstant = endsAtMidnight ? to.subtract({ hours: 1 }) : to;
  const endTime = endsAtMidnight ? "24:00" : formatTime(to);

  if (lastDay.equals(start.toPlainDate())) {
    return `${formatDay(from)}, ${formatTime(from)}–${endTime}`;
  }
  if (start.hour === 0 && start.minute === 0 && endsAtMidnight) {
    return `da ${formatDay(from)} a ${formatDay(lastDayInstant)}, giornate intere`;
  }
  return `da ${formatDay(from)}, ${formatTime(from)} a ${formatDay(lastDayInstant)}, ${endTime}`;
}
