import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  bookingsToCsv,
  csvCell,
  fingerprint,
  statusLabel,
  type AdminBooking,
} from "./csv";

const now = Temporal.Instant.from("2026-11-11T10:00:00Z");

const booking: AdminBooking = {
  id: "11111111-1111-4111-8111-111111111111",
  startsAt: Temporal.Instant.from("2026-11-02T17:00:00Z"),
  endsAt: Temporal.Instant.from("2026-11-02T19:00:00Z"),
  sportName: "Calcetto",
  priceCents: 4000,
  firstName: "Mario",
  lastName: "D'Amico; jr",
  phone: "393331234567",
  status: "cancelled_by_admin",
  cancelReason: '=HYPERLINK("x")',
  cancelledAt: Temporal.Instant.from("2026-11-01T08:05:00Z"),
  createdAt: Temporal.Instant.from("2026-10-30T09:00:00Z"),
  autocertVersion: "v1-bozza",
  autocertAcceptedAt: Temporal.Instant.from("2026-10-30T09:00:00Z"),
};

describe("csvCell", () => {
  test("neutralizza le formule", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+39")).toBe("'+39");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  test("mette tra virgolette separatori, virgolette e a capo", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('di "Mario"')).toBe('"di ""Mario"""');
    expect(csvCell("riga\nnuova")).toBe('"riga\nnuova"');
    expect(csvCell("normale")).toBe("normale");
  });
});

describe("bookingsToCsv", () => {
  test("intestazione, BOM e una riga nell'ora di Roma", () => {
    const csv = bookingsToCsv([booking], now);
    expect(csv.startsWith("﻿Giorno;Inizio;Fine;Sport;")).toBe(true);
    const [, row] = csv.trim().split("\r\n");
    expect(row).toBe(
      [
        "02/11/2026",
        "18:00",
        "20:00",
        "Calcetto",
        "40,00",
        "Mario",
        `"D'Amico; jr"`,
        "333 123 4567",
        "Annullata dalla gestione",
        `"'=HYPERLINK(""x"")"`,
        "01/11/2026 09:05",
        "30/10/2026 10:00",
        "v1-bozza",
        "30/10/2026 10:00",
        booking.id,
      ].join(";"),
    );
  });
});

describe("statusLabel", () => {
  test("attiva, conclusa e annullate", () => {
    const active = { ...booking, status: "active" as const };
    expect(statusLabel(active, now)).toBe("Conclusa");
    expect(statusLabel({ ...active, endsAt: now.add({ hours: 1 }) }, now)).toBe(
      "Attiva",
    );
    expect(statusLabel({ ...booking, status: "cancelled_by_user" }, now)).toBe(
      "Annullata dall'utente",
    );
  });
});

describe("fingerprint", () => {
  test("non dipende dall'ordine e cambia con l'insieme", () => {
    expect(fingerprint(["b", "a"])).toBe(fingerprint(["a", "b"]));
    expect(fingerprint(["a"])).not.toBe(fingerprint(["a", "b"]));
  });
});
