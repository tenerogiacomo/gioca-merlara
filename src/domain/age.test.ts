import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import { checkAdult, todayInRome } from "./age";

const d = (iso: string) => Temporal.PlainDate.from(iso);

describe("checkAdult", () => {
  test("18 anni compiuti oggi: maggiorenne", () => {
    expect(
      checkAdult({ birthDate: d("2008-11-10"), today: d("2026-11-10") }),
    ).toEqual({ ok: true, value: undefined });
  });

  test("17 anni e 364 giorni: minorenne", () => {
    expect(
      checkAdult({ birthDate: d("2008-11-11"), today: d("2026-11-10") }),
    ).toEqual({ ok: false, error: "underage" });
  });

  test("nato il 29 febbraio: maggiorenne il 1° marzo negli anni non bisestili", () => {
    expect(
      checkAdult({ birthDate: d("2008-02-29"), today: d("2026-02-28") }).ok,
    ).toBe(false);
    expect(
      checkAdult({ birthDate: d("2008-02-29"), today: d("2026-03-01") }).ok,
    ).toBe(true);
  });

  test("data di nascita nel futuro: non valida", () => {
    expect(
      checkAdult({ birthDate: d("2027-01-01"), today: d("2026-11-10") }),
    ).toEqual({ ok: false, error: "invalid_birth_date" });
  });
});

describe("todayInRome", () => {
  test("usa la data di Roma, non quella UTC", () => {
    // 23:30 UTC del 9 novembre = 00:30 del 10 novembre a Roma.
    expect(
      todayInRome(Temporal.Instant.from("2026-11-09T23:30:00Z")).toString(),
    ).toBe("2026-11-10");
  });
});
