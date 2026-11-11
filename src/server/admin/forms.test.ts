import { describe, expect, test } from "vitest";
import {
  describeUncovered,
  parsePriceRulesInput,
  parseReason,
  parseScheduleInput,
  priceIssueMessage,
  scheduleIssueMessage,
} from "./forms";

describe("parseScheduleInput", () => {
  test("da JSON del form all'orario settimanale", () => {
    const result = parseScheduleInput(
      JSON.stringify([
        { weekday: 1, opens: "09:00", closes: "13:00" },
        { weekday: 1, opens: "15:00", closes: "23:00" },
        { weekday: 7, opens: "09:00", closes: "24:00" },
      ]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[1]).toHaveLength(2);
      expect(result.value[3]).toEqual([]);
      expect(result.value[7]).toEqual([{ opens: "09:00", closes: "24:00" }]);
    }
  });

  test.each([
    ["non json"],
    ['[{"weekday": 9, "opens": "09:00", "closes": "10:00"}]'],
    ['{"a": 1}'],
  ])("rifiuta %j", (input) => {
    expect(parseScheduleInput(input).ok).toBe(false);
  });
});

describe("parsePriceRulesInput", () => {
  test("converte giorni, orari e prezzi in euro", () => {
    const result = parsePriceRulesInput(
      JSON.stringify([
        {
          weekdays: [1, 2, 3, 4, 5],
          from: "15:00",
          to: "17:00",
          price: "gratis",
        },
        { weekdays: [6, 7], from: "09:00", to: "23:00", price: "50,00" },
      ]),
      "calcetto",
    );
    expect(result).toEqual({
      ok: true,
      value: [
        {
          sportId: "calcetto",
          weekdays: [1, 2, 3, 4, 5],
          from: "15:00",
          to: "17:00",
          priceCents: 0,
        },
        {
          sportId: "calcetto",
          weekdays: [6, 7],
          from: "09:00",
          to: "23:00",
          priceCents: 5000,
        },
      ],
    });
  });

  test("segnala il prezzo non valido della fascia giusta", () => {
    const result = parsePriceRulesInput(
      JSON.stringify([
        { weekdays: [1], from: "09:00", to: "10:00", price: "10" },
        { weekdays: [1], from: "10:00", to: "11:00", price: "dieci" },
      ]),
      "tennis",
    );
    expect(result).toEqual({
      ok: false,
      error: { index: 1, message: expect.stringContaining("prezzo") },
    });
  });
});

describe("messaggi", () => {
  test("problema dell'orario con il nome del giorno", () => {
    expect(
      scheduleIssueMessage({ weekday: 3, index: 1, code: "overlap" }),
    ).toMatch(/^Mercoledì/);
  });

  test("ogni problema delle fasce ha un messaggio", () => {
    for (const code of [
      "unknown_sport",
      "no_weekdays",
      "invalid_weekday",
      "invalid_time",
      "not_aligned",
      "empty_or_inverted",
      "invalid_price",
      "overlap",
      "mixed_free_paid",
    ] as const) {
      expect(priceIssueMessage(code).length).toBeGreaterThan(15);
    }
  });
});

describe("describeUncovered", () => {
  test("raggruppa gli orari scoperti consecutivi per giorno", () => {
    expect(
      describeUncovered([
        { weekday: 6, localTime: "21:00" },
        { weekday: 6, localTime: "22:00" },
        { weekday: 7, localTime: "09:00" },
        { weekday: 7, localTime: "21:00" },
      ]),
    ).toEqual([
      "Sabato 21:00–23:00",
      "Domenica 09:00–10:00",
      "Domenica 21:00–22:00",
    ]);
  });
});

describe("parseReason", () => {
  test("vuoto, valido e non valido", () => {
    expect(parseReason("  ")).toEqual({ ok: true, value: null });
    expect(parseReason(" Manutenzione ")).toEqual({
      ok: true,
      value: "Manutenzione",
    });
    expect(parseReason("a".repeat(201)).ok).toBe(false);
    expect(parseReason("riga\nnuova").ok).toBe(false);
    expect(parseReason(undefined)).toEqual({ ok: true, value: null });
  });
});
