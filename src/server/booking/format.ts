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
