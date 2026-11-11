import { describe, expect, test } from "vitest";
import { availableDurations, checkBookingRequest } from "./booking-request";
import {
  openNineToEleven,
  priceRules,
  rome,
  sports,
} from "./fixtures.test-utils";

// Lunedì 9 novembre 2026, 12:30. Martedì 10 occupato dalle 18 alle 19; giovedì 12 bloccato.
const context = {
  schedule: openNineToEleven,
  sports,
  priceRules,
  blocks: [
    { startsAt: rome("2026-11-12T00:00"), endsAt: rome("2026-11-13T00:00") },
  ],
  bookedPeriods: [
    { startsAt: rome("2026-11-10T18:00"), endsAt: rome("2026-11-10T19:00") },
  ],
  now: rome("2026-11-09T12:30"),
};

const request = (at: string, sportId: string, slotCount = 1) =>
  checkBookingRequest({ ...context, startsAt: rome(at), sportId, slotCount });

describe("checkBookingRequest", () => {
  test("accetta uno slot libero e restituisce il prezzo dello sport scelto", () => {
    const result = request("2026-11-10T19:00", "tennis");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.priceCents).toBe(2000);
      expect(result.value.endsAt.equals(rome("2026-11-10T20:00"))).toBe(true);
    }
  });

  test("più ore consecutive: un'unica prenotazione con il prezzo sommato", () => {
    const result = request("2026-11-10T19:00", "calcetto", 3);
    expect(result).toMatchObject({ ok: true, value: { priceCents: 3 * 5000 } });
    if (result.ok) {
      expect(result.value.slots.map((slot) => slot.localTime)).toEqual([
        "19:00",
        "20:00",
        "21:00",
      ]);
      expect(result.value.endsAt.equals(rome("2026-11-10T22:00"))).toBe(true);
    }
  });

  test("più ore nella stessa fascia a pagamento", () => {
    expect(request("2026-11-10T13:00", "tennis", 2)).toMatchObject({
      ok: true,
      value: { priceCents: 2 * 1600 },
    });
  });

  test("ore a pagamento e gratuite non si uniscono, in nessun ordine", () => {
    expect(request("2026-11-10T14:00", "tennis", 2)).toEqual({
      ok: false,
      error: "mixed_free_paid",
    });
    expect(request("2026-11-10T16:00", "tennis", 2)).toEqual({
      ok: false,
      error: "mixed_free_paid",
    });
  });

  test("la fascia gratuita si prenota a sé, anche per due ore", () => {
    expect(request("2026-11-10T15:00", "calcetto", 2)).toMatchObject({
      ok: true,
      value: { priceCents: 0 },
    });
  });

  test.each([
    ["sport sconosciuto", "2026-11-10T19:00", "golf", 1, "unknown_sport"],
    ["inizio non allineato", "2026-11-10T19:30", "tennis", 1, "not_aligned"],
    ["slot già iniziato", "2026-11-09T12:00", "tennis", 1, "past"],
    ["giorno passato", "2026-11-08T12:00", "tennis", 1, "past"],
    ["oltre l'orizzonte", "2026-11-23T10:00", "tennis", 1, "beyond_horizon"],
    ["fuori orario", "2026-11-10T07:00", "tennis", 1, "outside_opening_hours"],
    ["slot bloccato", "2026-11-12T10:00", "tennis", 1, "blocked"],
    ["slot occupato", "2026-11-10T18:00", "calcetto", 1, "booked"],
    [
      "sport senza prezzo in quello slot",
      "2026-11-14T21:00",
      "tennis",
      1,
      "unpriced",
    ],
    ["durata non valida", "2026-11-10T19:00", "tennis", 0, "invalid_duration"],
    ["seconda ora occupata", "2026-11-10T17:00", "calcetto", 2, "booked"],
    [
      "oltre la chiusura",
      "2026-11-10T22:00",
      "calcetto",
      2,
      "outside_opening_hours",
    ],
    [
      "seconda ora senza prezzo per lo sport",
      "2026-11-14T20:00",
      "tennis",
      2,
      "unpriced",
    ],
    [
      "gratis e a pagamento insieme",
      "2026-11-10T14:00",
      "calcetto",
      2,
      "mixed_free_paid",
    ],
  ])("rifiuta: %s", (_, at, sportId, slotCount, error) => {
    expect(request(at, sportId, slotCount)).toEqual({ ok: false, error });
  });
});

describe("availableDurations", () => {
  test("da uno slot libero fino al primo ostacolo, con il prezzo totale", () => {
    expect(
      availableDurations({
        ...context,
        startsAt: rome("2026-11-10T17:00"),
        sportId: "calcetto",
      }),
    ).toEqual([
      { slotCount: 1, endsAt: rome("2026-11-10T18:00"), priceCents: 5000 },
    ]);
  });

  test("si ferma alla chiusura", () => {
    const durations = availableDurations({
      ...context,
      startsAt: rome("2026-11-10T19:00"),
      sportId: "tennis",
    });
    expect(durations.map((d) => [d.slotCount, d.priceCents])).toEqual([
      [1, 2000],
      [2, 4000],
      [3, 6000],
      [4, 8000],
    ]);
  });

  test("non unisce la fascia gratuita a quella a pagamento", () => {
    const durations = availableDurations({
      ...context,
      startsAt: rome("2026-11-10T15:00"),
      sportId: "calcetto",
    });
    expect(durations.map((d) => d.slotCount)).toEqual([1, 2]);
  });

  test("nessuna durata se lo slot d'inizio non è prenotabile", () => {
    expect(
      availableDurations({
        ...context,
        startsAt: rome("2026-11-10T18:00"),
        sportId: "calcetto",
      }),
    ).toEqual([]);
  });
});
