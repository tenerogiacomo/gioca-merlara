import { describe, expect, test } from "vitest";
import {
  findUncoveredSlots,
  validatePriceRules,
  validateSchedule,
} from "./schedule";
import { openNineToEleven, priceRules, sports } from "./fixtures.test-utils";
import type { WeeklySchedule } from "./types";

const closedAllWeek: WeeklySchedule = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
};

describe("validateSchedule", () => {
  test("accetta l'orario continuato 9–23", () => {
    expect(validateSchedule(openNineToEleven)).toEqual([]);
  });

  test("accetta più intervalli nello stesso giorno e giorni chiusi", () => {
    expect(
      validateSchedule({
        ...closedAllWeek,
        1: [
          { opens: "09:00", closes: "13:00" },
          { opens: "15:00", closes: "23:00" },
        ],
      }),
    ).toEqual([]);
  });

  test("accetta la chiusura a mezzanotte", () => {
    expect(
      validateSchedule({
        ...closedAllWeek,
        5: [{ opens: "18:00", closes: "24:00" }],
      }),
    ).toEqual([]);
  });

  test.each([
    ["orario non valido", { opens: "9:00", closes: "23:00" }, "invalid_time"],
    ["orario fuori scala", { opens: "09:00", closes: "25:00" }, "invalid_time"],
    [
      "non allineato allo slot",
      { opens: "09:30", closes: "23:00" },
      "not_aligned",
    ],
    ["invertito", { opens: "23:00", closes: "09:00" }, "empty_or_inverted"],
    ["vuoto", { opens: "09:00", closes: "09:00" }, "empty_or_inverted"],
  ])("segnala intervallo %s", (_, interval, code) => {
    expect(validateSchedule({ ...closedAllWeek, 3: [interval] })).toEqual([
      { weekday: 3, index: 0, code },
    ]);
  });

  test("segnala intervalli sovrapposti", () => {
    expect(
      validateSchedule({
        ...closedAllWeek,
        2: [
          { opens: "09:00", closes: "14:00" },
          { opens: "13:00", closes: "18:00" },
        ],
      }),
    ).toEqual([{ weekday: 2, index: 1, code: "overlap" }]);
  });
});

describe("validatePriceRules", () => {
  test("accetta le regole di esempio", () => {
    expect(validatePriceRules(priceRules, sports)).toEqual([]);
  });

  test("ammette regole sovrapposte tra sport diversi", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "calcetto",
            weekdays: [1],
            from: "09:00",
            to: "12:00",
            priceCents: 100,
          },
          {
            sportId: "tennis",
            weekdays: [1],
            from: "09:00",
            to: "12:00",
            priceCents: 100,
          },
        ],
        sports,
      ),
    ).toEqual([]);
  });

  test("segnala regole sovrapposte per lo stesso sport in un giorno comune", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "tennis",
            weekdays: [1, 2],
            from: "09:00",
            to: "12:00",
            priceCents: 100,
          },
          {
            sportId: "tennis",
            weekdays: [2, 3],
            from: "11:00",
            to: "14:00",
            priceCents: 100,
          },
        ],
        sports,
      ),
    ).toEqual([{ index: 1, code: "overlap" }]);
  });

  test.each([
    ["sport sconosciuto", { sportId: "golf" }, "unknown_sport"],
    ["nessun giorno", { weekdays: [] }, "no_weekdays"],
    ["giorno non valido", { weekdays: [8] }, "invalid_weekday"],
    ["orario non valido", { from: "ab:cd" }, "invalid_time"],
    ["non allineata", { from: "09:15" }, "not_aligned"],
    ["invertita", { from: "12:00", to: "10:00" }, "empty_or_inverted"],
    ["prezzo negativo", { priceCents: -1 }, "invalid_price"],
    ["prezzo non intero", { priceCents: 1.5 }, "invalid_price"],
  ])("segnala regola con %s", (_, override, code) => {
    const rule = {
      sportId: "tennis",
      weekdays: [1],
      from: "09:00",
      to: "12:00",
      priceCents: 100,
      ...override,
    };
    expect(validatePriceRules([rule as never], sports)).toEqual([
      { index: 0, code },
    ]);
  });
});

describe("validatePriceRules: fasce gratuite", () => {
  test("rifiuta una fascia gratuita per uno sport e a pagamento per un altro nello stesso orario", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "calcetto",
            weekdays: [1],
            from: "15:00",
            to: "17:00",
            priceCents: 0,
          },
          {
            sportId: "tennis",
            weekdays: [1, 2],
            from: "16:00",
            to: "18:00",
            priceCents: 1500,
          },
        ],
        sports,
      ),
    ).toEqual([{ index: 1, code: "mixed_free_paid" }]);
  });

  test("ammette la stessa fascia gratuita per tutti gli sport", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "calcetto",
            weekdays: [1],
            from: "15:00",
            to: "17:00",
            priceCents: 0,
          },
          {
            sportId: "tennis",
            weekdays: [1],
            from: "15:00",
            to: "17:00",
            priceCents: 0,
          },
        ],
        sports,
      ),
    ).toEqual([]);
  });

  test("ammette prezzi diversi a pagamento nello stesso orario", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "calcetto",
            weekdays: [1],
            from: "17:00",
            to: "19:00",
            priceCents: 5000,
          },
          {
            sportId: "tennis",
            weekdays: [1],
            from: "17:00",
            to: "19:00",
            priceCents: 2000,
          },
        ],
        sports,
      ),
    ).toEqual([]);
  });

  test("ammette gratis e a pagamento in giorni diversi", () => {
    expect(
      validatePriceRules(
        [
          {
            sportId: "calcetto",
            weekdays: [1],
            from: "15:00",
            to: "17:00",
            priceCents: 0,
          },
          {
            sportId: "tennis",
            weekdays: [6],
            from: "15:00",
            to: "17:00",
            priceCents: 2000,
          },
        ],
        sports,
      ),
    ).toEqual([]);
  });
});

describe("findUncoveredSlots", () => {
  test("nessun orario scoperto con le regole di esempio per il calcetto", () => {
    expect(
      findUncoveredSlots(openNineToEleven, priceRules, "calcetto"),
    ).toEqual([]);
  });

  test("il tennis nel fine settimana è scoperto dalle 21 alle 23", () => {
    expect(findUncoveredSlots(openNineToEleven, priceRules, "tennis")).toEqual([
      { weekday: 6, localTime: "21:00" },
      { weekday: 6, localTime: "22:00" },
      { weekday: 7, localTime: "21:00" },
      { weekday: 7, localTime: "22:00" },
    ]);
  });
});
