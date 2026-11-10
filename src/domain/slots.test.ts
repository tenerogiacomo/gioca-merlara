import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import { computeSlots } from "./slots";
import {
  openNineToEleven,
  priceRules,
  rome,
  sports,
} from "./fixtures.test-utils";
import type { PriceRule, Slot, WeeklySchedule } from "./types";

const base = {
  schedule: openNineToEleven,
  sports,
  priceRules,
  blocks: [],
  bookedStarts: [],
};

// Lunedì 9 novembre 2026, ore 8:00 a Roma.
const mondayMorning = rome("2026-11-09T08:00");

function find(slots: Slot[], isoLocal: string) {
  const at = rome(isoLocal);
  return slots.find(
    (slot) => Temporal.Instant.compare(slot.startsAt, at) === 0,
  );
}

describe("computeSlots", () => {
  test("genera 14 slot al giorno per 14 giorni con l'orario 9–23", () => {
    const slots = computeSlots({ ...base, now: mondayMorning });
    expect(slots).toHaveLength(14 * 14);
    expect(slots[0].localDate.toString()).toBe("2026-11-09");
    expect(slots[0].localTime).toBe("09:00");
    expect(slots.at(-1)?.localDate.toString()).toBe("2026-11-22");
    expect(slots.at(-1)?.localTime).toBe("22:00");
  });

  test("ogni slot dura 60 minuti", () => {
    const [slot] = computeSlots({ ...base, now: mondayMorning });
    expect(slot.startsAt.until(slot.endsAt).total("minutes")).toBe(60);
  });

  test("assegna i prezzi per sport secondo giorno e fascia", () => {
    const slots = computeSlots({ ...base, now: mondayMorning });
    expect(find(slots, "2026-11-09T10:00")?.prices).toEqual({
      calcetto: 4000,
      tennis: 1600,
    });
    expect(find(slots, "2026-11-09T15:00")?.prices).toEqual({
      calcetto: 0,
      tennis: 0,
    });
    expect(find(slots, "2026-11-14T15:00")?.prices).toEqual({
      calcetto: 5000,
      tennis: 2000,
    });
  });

  test("uno sport senza regola non ha prezzo; se nessuno sport ha prezzo lo slot non è prenotabile", () => {
    const slots = computeSlots({ ...base, now: mondayMorning });
    expect(find(slots, "2026-11-14T21:00")?.prices).toEqual({ calcetto: 5000 });
    const noRules = computeSlots({
      ...base,
      priceRules: [],
      now: mondayMorning,
    });
    expect(find(noRules, "2026-11-09T10:00")?.status).toBe("unpriced");
  });

  test("uno slot già iniziato o finito è passato; uno futuro è disponibile", () => {
    const slots = computeSlots({ ...base, now: rome("2026-11-09T10:30") });
    expect(find(slots, "2026-11-09T09:00")?.status).toBe("past");
    expect(find(slots, "2026-11-09T10:00")?.status).toBe("past");
    expect(find(slots, "2026-11-09T11:00")?.status).toBe("available");
  });

  test("uno slot che inizia esattamente adesso è passato", () => {
    const slots = computeSlots({ ...base, now: rome("2026-11-09T11:00") });
    expect(find(slots, "2026-11-09T11:00")?.status).toBe("past");
  });

  test("uno slot prenotato è occupato", () => {
    const slots = computeSlots({
      ...base,
      bookedStarts: [rome("2026-11-10T18:00")],
      now: mondayMorning,
    });
    expect(find(slots, "2026-11-10T18:00")?.status).toBe("booked");
    expect(find(slots, "2026-11-10T19:00")?.status).toBe("available");
  });

  test("un blocco su una fascia rende bloccati gli slot che tocca, anche in parte", () => {
    const slots = computeSlots({
      ...base,
      blocks: [
        {
          startsAt: rome("2026-11-11T14:30"),
          endsAt: rome("2026-11-11T16:00"),
        },
      ],
      now: mondayMorning,
    });
    expect(find(slots, "2026-11-11T13:00")?.status).toBe("available");
    expect(find(slots, "2026-11-11T14:00")?.status).toBe("blocked");
    expect(find(slots, "2026-11-11T15:00")?.status).toBe("blocked");
    expect(find(slots, "2026-11-11T16:00")?.status).toBe("available");
  });

  test("un blocco di più giorni blocca tutti gli slot del periodo", () => {
    const slots = computeSlots({
      ...base,
      blocks: [
        {
          startsAt: rome("2026-11-12T00:00"),
          endsAt: rome("2026-11-14T00:00"),
        },
      ],
      now: mondayMorning,
    });
    const blocked = slots.filter((slot) => slot.status === "blocked");
    expect(blocked).toHaveLength(28);
    expect(find(slots, "2026-11-14T09:00")?.status).toBe("available");
  });

  test("priorità degli stati: passato, bloccato, occupato, senza prezzo", () => {
    const slots = computeSlots({
      ...base,
      priceRules: [],
      blocks: [
        {
          startsAt: rome("2026-11-09T09:00"),
          endsAt: rome("2026-11-09T11:00"),
        },
      ],
      bookedStarts: [
        rome("2026-11-09T09:00"),
        rome("2026-11-09T10:00"),
        rome("2026-11-09T11:00"),
      ],
      now: rome("2026-11-09T09:30"),
    });
    expect(find(slots, "2026-11-09T09:00")?.status).toBe("past");
    expect(find(slots, "2026-11-09T10:00")?.status).toBe("blocked");
    expect(find(slots, "2026-11-09T11:00")?.status).toBe("booked");
    expect(find(slots, "2026-11-09T12:00")?.status).toBe("unpriced");
  });

  test("i giorni chiusi non hanno slot", () => {
    const schedule: WeeklySchedule = { ...openNineToEleven, 3: [] };
    const slots = computeSlots({ ...base, schedule, now: mondayMorning });
    expect(slots.filter((slot) => slot.localDate.dayOfWeek === 3)).toEqual([]);
  });

  test("intervalli sovrapposti salvati per errore non producono slot doppi", () => {
    const schedule: WeeklySchedule = {
      ...openNineToEleven,
      1: [
        { opens: "09:00", closes: "12:00" },
        { opens: "11:00", closes: "14:00" },
      ],
    };
    const slots = computeSlots({ ...base, schedule, now: mondayMorning });
    const monday = slots.filter(
      (slot) => slot.localDate.toString() === "2026-11-09",
    );
    expect(monday.map((slot) => slot.localTime)).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
    ]);
  });

  test("più intervalli nello stesso giorno", () => {
    const schedule: WeeklySchedule = {
      ...openNineToEleven,
      1: [
        { opens: "09:00", closes: "11:00" },
        { opens: "15:00", closes: "16:00" },
      ],
    };
    const slots = computeSlots({ ...base, schedule, now: mondayMorning });
    const monday = slots.filter(
      (slot) => slot.localDate.toString() === "2026-11-09",
    );
    expect(monday.map((slot) => slot.localTime)).toEqual([
      "09:00",
      "10:00",
      "15:00",
    ]);
  });

  test("l'orizzonte parte dalla data di oggi a Roma anche a tarda sera", () => {
    // 23:30 di domenica 8 novembre a Roma: in UTC è ancora domenica, ma anche a mezzanotte e mezza conta Roma.
    const slots = computeSlots({ ...base, now: rome("2026-11-09T00:30") });
    expect(slots[0].localDate.toString()).toBe("2026-11-09");
    expect(slots.at(-1)?.localDate.toString()).toBe("2026-11-22");
  });

  describe("cambio dell'ora", () => {
    const nightAndDay: WeeklySchedule = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [{ opens: "00:00", closes: "24:00" }],
    };
    const anySport: PriceRule[] = [
      {
        sportId: "tennis",
        weekdays: [7],
        from: "00:00",
        to: "24:00",
        priceCents: 0,
      },
    ];

    test("ultima domenica di marzo: l'ora 02:00 non esiste e viene saltata", () => {
      const slots = computeSlots({
        ...base,
        schedule: nightAndDay,
        priceRules: anySport,
        now: rome("2026-03-28T12:00"),
      });
      const day = slots.filter(
        (slot) => slot.localDate.toString() === "2026-03-29",
      );
      expect(day).toHaveLength(23);
      expect(day.map((slot) => slot.localTime)).not.toContain("02:00");
      expect(
        day
          .find((slot) => slot.localTime === "01:00")
          ?.endsAt.equals(
            day.find((slot) => slot.localTime === "03:00")!.startsAt,
          ),
      ).toBe(true);
    });

    test("ultima domenica di ottobre: l'ora ripetuta vale una volta, senza sovrapposizioni", () => {
      const slots = computeSlots({
        ...base,
        schedule: nightAndDay,
        priceRules: anySport,
        now: rome("2026-10-24T12:00"),
      });
      const day = slots.filter(
        (slot) => slot.localDate.toString() === "2026-10-25",
      );
      expect(day).toHaveLength(24);
      expect(new Set(day.map((slot) => slot.localTime)).size).toBe(24);
      for (let i = 1; i < day.length; i++) {
        expect(
          Temporal.Instant.compare(day[i - 1].endsAt, day[i].startsAt),
        ).toBeLessThanOrEqual(0);
      }
    });

    test("di giorno il cambio d'ora non cambia nulla", () => {
      const slots = computeSlots({ ...base, now: rome("2026-03-28T12:00") });
      const day = slots.filter(
        (slot) => slot.localDate.toString() === "2026-03-29",
      );
      expect(day.map((slot) => slot.localTime)).toEqual([
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
      ]);
    });
  });
});
