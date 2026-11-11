import { Temporal } from "temporal-polyfill";
import { TIME_ZONE } from "./config";
import type { LocalTime } from "./types";

const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/;

/** Minuti dalla mezzanotte, oppure `null` se l'ora non è nel formato `HH:MM`. */
export function parseLocalTime(time: LocalTime): number | null {
  if (!LOCAL_TIME.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatLocalTime(minutes: number): LocalTime {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function toRome(instant: Temporal.Instant): Temporal.ZonedDateTime {
  return instant.toZonedDateTimeISO(TIME_ZONE);
}

/**
 * Istante corrispondente a data e ora locali di Roma.
 * Restituisce `null` se quell'ora non esiste (salto in avanti dell'ora legale);
 * se l'ora si ripete (ritorno all'ora solare) sceglie la prima occorrenza.
 */
export function romeLocalToInstant(
  date: Temporal.PlainDate,
  minutes: number,
): Temporal.Instant | null {
  const zoned = date
    .toPlainDateTime({ hour: Math.floor(minutes / 60), minute: minutes % 60 })
    .toZonedDateTime(TIME_ZONE, { disambiguation: "earlier" });
  const sameWallClock =
    zoned.hour === Math.floor(minutes / 60) && zoned.minute === minutes % 60;
  return sameWallClock ? zoned.toInstant() : null;
}

/** Data `AAAA-MM-GG` valida (niente 30 febbraio), altrimenti `null`. */
export function parsePlainDate(value: unknown): Temporal.PlainDate | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" });
  } catch {
    return null;
  }
}

/** Mezzanotte (ora di Roma) all'inizio del giorno dell'istante. */
export function romeMidnight(instant: Temporal.Instant): Temporal.Instant {
  return toRome(instant).toPlainDate().toZonedDateTime(TIME_ZONE).toInstant();
}
