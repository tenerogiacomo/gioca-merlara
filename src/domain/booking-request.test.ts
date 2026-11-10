import { describe, expect, test } from "vitest";
import { checkBookingRequest } from "./booking-request";
import {
  openNineToEleven,
  priceRules,
  rome,
  sports,
} from "./fixtures.test-utils";

const context = {
  schedule: openNineToEleven,
  sports,
  priceRules,
  blocks: [
    { startsAt: rome("2026-11-12T00:00"), endsAt: rome("2026-11-13T00:00") },
  ],
  bookedStarts: [rome("2026-11-10T18:00")],
  now: rome("2026-11-09T12:30"),
};

describe("checkBookingRequest", () => {
  test("accetta uno slot libero e restituisce il prezzo dello sport scelto", () => {
    const result = checkBookingRequest({
      ...context,
      startsAt: rome("2026-11-10T19:00"),
      sportId: "tennis",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.priceCents).toBe(2000);
      expect(result.value.slot.localTime).toBe("19:00");
    }
  });

  test("accetta la fascia gratuita", () => {
    const result = checkBookingRequest({
      ...context,
      startsAt: rome("2026-11-10T15:00"),
      sportId: "calcetto",
    });
    expect(result).toMatchObject({ ok: true, value: { priceCents: 0 } });
  });

  test.each([
    ["sport sconosciuto", "2026-11-10T19:00", "golf", "unknown_sport"],
    ["inizio non allineato", "2026-11-10T19:30", "tennis", "not_aligned"],
    ["slot già iniziato", "2026-11-09T12:00", "tennis", "past"],
    ["giorno passato", "2026-11-08T12:00", "tennis", "past"],
    ["oltre l'orizzonte", "2026-11-23T10:00", "tennis", "beyond_horizon"],
    ["fuori orario", "2026-11-10T07:00", "tennis", "outside_opening_hours"],
    ["slot bloccato", "2026-11-12T10:00", "tennis", "blocked"],
    ["slot occupato", "2026-11-10T18:00", "calcetto", "booked"],
    [
      "sport senza prezzo in quello slot",
      "2026-11-14T21:00",
      "tennis",
      "unpriced",
    ],
  ])("rifiuta: %s", (_, at, sportId, error) => {
    expect(
      checkBookingRequest({ ...context, startsAt: rome(at), sportId }),
    ).toEqual({ ok: false, error });
  });
});
