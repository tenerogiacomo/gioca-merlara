import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  BLOCK_END_TIMES,
  BLOCK_START_TIMES,
  parseBlockPeriod,
  periodOutsideSchedule,
} from "./block";
import type { WeeklySchedule } from "./types";

const now = Temporal.Instant.from("2026-11-11T10:00:00Z"); // 11:00 a Roma

const input = {
  fromDate: "2026-11-12",
  fromTime: "18:30",
  toDate: "2026-11-12",
  toTime: "20:30",
  wholeDays: false,
};

describe("orari selezionabili", () => {
  test("a mezz'ore: inizio dalle 00:00 alle 23:30, fine dalle 00:30 alle 24:00", () => {
    expect(BLOCK_START_TIMES).toHaveLength(48);
    expect(BLOCK_START_TIMES.at(0)).toBe("00:00");
    expect(BLOCK_START_TIMES.at(-1)).toBe("23:30");
    expect(BLOCK_END_TIMES.at(0)).toBe("00:30");
    expect(BLOCK_END_TIMES.at(-1)).toBe("24:00");
  });
});

describe("parseBlockPeriod", () => {
  test("fascia a mezz'ore nell'ora di Roma", () => {
    const result = parseBlockPeriod(input, now);
    expect(result).toEqual({
      ok: true,
      value: {
        startsAt: Temporal.Instant.from("2026-11-12T17:30:00Z"),
        endsAt: Temporal.Instant.from("2026-11-12T19:30:00Z"),
      },
    });
  });

  test("giornate intere: dalla mezzanotte del primo giorno a quella dopo l'ultimo", () => {
    const result = parseBlockPeriod(
      { ...input, toDate: "2026-11-15", wholeDays: true },
      now,
    );
    expect(result.ok && result.value).toEqual({
      startsAt: Temporal.Instant.from("2026-11-11T23:00:00Z"),
      endsAt: Temporal.Instant.from("2026-11-15T23:00:00Z"),
    });
  });

  test("24:00 è la mezzanotte del giorno dopo", () => {
    const result = parseBlockPeriod({ ...input, toTime: "24:00" }, now);
    expect(result.ok && result.value.endsAt).toEqual(
      Temporal.Instant.from("2026-11-12T23:00:00Z"),
    );
  });

  test("errori: data, ora, ordine e passato", () => {
    expect(parseBlockPeriod({ ...input, fromDate: "2026-02-30" }, now)).toEqual(
      { ok: false, error: "invalid_date" },
    );
    expect(parseBlockPeriod({ ...input, fromTime: "18:15" }, now)).toEqual({
      ok: false,
      error: "invalid_time",
    });
    expect(parseBlockPeriod({ ...input, toTime: "18:30" }, now)).toEqual({
      ok: false,
      error: "end_before_start",
    });
    expect(
      parseBlockPeriod(
        { ...input, fromDate: "2026-11-11", fromTime: "10:30" },
        now,
      ),
    ).toEqual({ ok: false, error: "in_past" });
  });

  test("un'ora che non esiste per il passaggio all'ora legale", () => {
    expect(
      parseBlockPeriod(
        {
          ...input,
          fromDate: "2027-03-28",
          fromTime: "02:30",
          toDate: "2027-03-28",
        },
        now,
      ),
    ).toEqual({ ok: false, error: "nonexistent_time" });
  });

  test("nel ritorno all'ora solare l'ora ripetuta vale la prima volta", () => {
    const result = parseBlockPeriod(
      {
        ...input,
        fromDate: "2027-10-31",
        fromTime: "02:00",
        toDate: "2027-10-31",
        toTime: "03:00",
      },
      now,
    );
    expect(result.ok && result.value).toEqual({
      startsAt: Temporal.Instant.from("2027-10-31T00:00:00Z"),
      endsAt: Temporal.Instant.from("2027-10-31T02:00:00Z"),
    });
  });
});

describe("periodOutsideSchedule", () => {
  const schedule: WeeklySchedule = {
    1: [{ opens: "09:00", closes: "23:00" }],
    2: [{ opens: "09:00", closes: "23:00" }],
    3: [{ opens: "09:00", closes: "23:00" }],
    4: [{ opens: "09:00", closes: "20:00" }],
    5: [],
    6: [],
    7: [],
  };
  const period = (from: string, to: string) => ({
    startsAt: Temporal.Instant.from(from),
    endsAt: Temporal.Instant.from(to),
  });

  test("dentro l'orario", () => {
    // Giovedì 12 novembre 2026, 18–20 a Roma.
    expect(
      periodOutsideSchedule(
        schedule,
        period("2026-11-12T17:00:00Z", "2026-11-12T19:00:00Z"),
      ),
    ).toBe(false);
  });

  test("anche una sola ora fuori orario conta", () => {
    expect(
      periodOutsideSchedule(
        schedule,
        period("2026-11-12T18:00:00Z", "2026-11-12T20:00:00Z"),
      ),
    ).toBe(true);
    expect(
      periodOutsideSchedule(
        schedule,
        period("2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z"),
      ),
    ).toBe(true);
  });
});
