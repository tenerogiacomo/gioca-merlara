import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import { formatPeriod } from "./format";

const at = (value: string) => Temporal.Instant.from(value);

describe("formatPeriod", () => {
  test("nello stesso giorno", () => {
    expect(
      formatPeriod(at("2026-11-12T17:30:00Z"), at("2026-11-12T19:30:00Z")),
    ).toBe("giovedì 12 novembre, 18:30–20:30");
  });

  test("fino a mezzanotte", () => {
    expect(
      formatPeriod(at("2026-11-12T17:00:00Z"), at("2026-11-12T23:00:00Z")),
    ).toBe("giovedì 12 novembre, 18:00–24:00");
  });

  test("giornate intere", () => {
    expect(
      formatPeriod(at("2027-07-31T22:00:00Z"), at("2027-08-15T22:00:00Z")),
    ).toBe("da domenica 1 agosto a domenica 15 agosto, giornate intere");
  });

  test("su più giorni con orari", () => {
    expect(
      formatPeriod(at("2026-11-12T17:30:00Z"), at("2026-11-14T09:00:00Z")),
    ).toBe("da giovedì 12 novembre, 18:30 a sabato 14 novembre, 10:00");
  });
});
