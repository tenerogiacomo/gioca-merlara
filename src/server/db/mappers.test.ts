import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  toBlocks,
  toBookedPeriods,
  toDbTime,
  toPriceRules,
  toSports,
  toWeeklySchedule,
} from "./mappers";

describe("conversioni dal database al dominio", () => {
  test("orario: righe per giorno in intervalli ordinati, ore senza secondi", () => {
    const schedule = toWeeklySchedule([
      { id: 2, weekday: 1, opens: "15:00:00", closes: "24:00:00" },
      { id: 1, weekday: 1, opens: "09:00:00", closes: "13:00:00" },
      { id: 3, weekday: 7, opens: "09:00:00", closes: "23:00:00" },
    ]);
    expect(schedule[1]).toEqual([
      { opens: "09:00", closes: "13:00" },
      { opens: "15:00", closes: "24:00" },
    ]);
    expect(schedule[7]).toEqual([{ opens: "09:00", closes: "23:00" }]);
    expect(schedule[3]).toEqual([]);
  });

  test("regole di prezzo", () => {
    expect(
      toPriceRules([
        {
          id: 1,
          sport_id: "tennis",
          weekdays: [1, 2],
          from_time: "15:00:00",
          to_time: "17:00:00",
          price_cents: 0,
        },
      ]),
    ).toEqual([
      {
        sportId: "tennis",
        weekdays: [1, 2],
        from: "15:00",
        to: "17:00",
        priceCents: 0,
      },
    ]);
  });

  test("sport: solo gli attivi, nell'ordine stabilito", () => {
    expect(
      toSports([
        { id: "tennis", name: "Tennis", active: true, sort_order: 2 },
        { id: "golf", name: "Golf", active: false, sort_order: 0 },
        { id: "calcetto", name: "Calcetto", active: true, sort_order: 1 },
      ]),
    ).toEqual([
      { id: "calcetto", name: "Calcetto" },
      { id: "tennis", name: "Tennis" },
    ]);
  });

  test("blocchi e slot occupati come istanti", () => {
    const [block] = toBlocks([
      {
        starts_at: "2026-11-12T08:00:00+00:00",
        ends_at: "2026-11-12T10:00:00+00:00",
      },
    ]);
    expect(
      block.startsAt.equals(Temporal.Instant.from("2026-11-12T08:00:00Z")),
    ).toBe(true);
    const [booked] = toBookedPeriods([
      {
        starts_at: "2026-11-12T17:00:00+00:00",
        ends_at: "2026-11-12T19:00:00+00:00",
        sport_id: "calcetto",
        first_name: "Marco",
      },
    ]);
    expect(
      booked.endsAt.equals(Temporal.Instant.from("2026-11-12T19:00:00Z")),
    ).toBe(true);
  });
});

describe("conversioni dal dominio al database", () => {
  test("ora locale", () => {
    expect(toDbTime("09:00")).toBe("09:00:00");
    expect(toDbTime("24:00")).toBe("24:00:00");
  });
});
