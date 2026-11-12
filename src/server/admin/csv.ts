import { createHash } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { formatPhone } from "@/domain/phone";
import { toRome } from "@/domain/time";
import type { Database } from "@/types/database";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** Prenotazione come la vede il superadmin: elenco, CSV ed eliminazione. */
export type AdminBooking = {
  id: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  sportName: string;
  priceCents: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: BookingStatus;
  cancelReason: string | null;
  cancelledAt: Temporal.Instant | null;
  createdAt: Temporal.Instant;
  autocertVersion: string;
  autocertAcceptedAt: Temporal.Instant;
};

/** Stato leggibile; una prenotazione attiva già finita è "Conclusa". */
export function statusLabel(
  booking: Pick<AdminBooking, "status" | "endsAt">,
  now: Temporal.Instant,
): string {
  if (booking.status === "cancelled_by_user") return "Annullata dall'utente";
  if (booking.status === "cancelled_by_admin")
    return "Annullata dalla gestione";
  return Temporal.Instant.compare(booking.endsAt, now) <= 0
    ? "Conclusa"
    : "Attiva";
}

const pad = (value: number) => String(value).padStart(2, "0");
const date = (instant: Temporal.Instant) => {
  const local = toRome(instant);
  return `${pad(local.day)}/${pad(local.month)}/${local.year}`;
};
const time = (instant: Temporal.Instant) => {
  const local = toRome(instant);
  return `${pad(local.hour)}:${pad(local.minute)}`;
};
const dateTime = (instant: Temporal.Instant | null) =>
  instant ? `${date(instant)} ${time(instant)}` : "";

/**
 * Una cella CSV: neutralizza le formule (un valore che inizia con = + - @ verrebbe eseguito
 * dai fogli di calcolo) e mette tra virgolette i valori con separatori o a capo.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const HEADER = [
  "Giorno",
  "Inizio",
  "Fine",
  "Sport",
  "Prezzo (€)",
  "Nome",
  "Cognome",
  "Telefono",
  "Stato",
  "Motivo dell'annullo",
  "Annullata il",
  "Prenotata il",
  "Versione autocertificazione",
  "Autocertificazione accettata il",
  "Codice prenotazione",
];

/**
 * CSV riepilogativo per l'archivio prima dell'eliminazione (D5b): separatore `;` e BOM,
 * come lo apre Excel in italiano. Ore nell'ora di Roma.
 */
export function bookingsToCsv(
  bookings: AdminBooking[],
  now: Temporal.Instant,
): string {
  const rows = bookings.map((booking) => [
    date(booking.startsAt),
    time(booking.startsAt),
    time(booking.endsAt),
    booking.sportName,
    (booking.priceCents / 100).toFixed(2).replace(".", ","),
    booking.firstName,
    booking.lastName,
    booking.phone ? formatPhone(booking.phone, { national: true }) : "",
    statusLabel(booking, now),
    booking.cancelReason ?? "",
    dateTime(booking.cancelledAt),
    dateTime(booking.createdAt),
    booking.autocertVersion,
    dateTime(booking.autocertAcceptedAt),
    booking.id,
  ]);
  return (
    "﻿" +
    [HEADER, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}

/** Impronta di un insieme di prenotazioni: lega l'eliminazione al CSV scaricato. */
export function fingerprint(ids: string[]): string {
  return createHash("sha256")
    .update(ids.toSorted().join(","))
    .digest("hex")
    .slice(0, 16);
}
