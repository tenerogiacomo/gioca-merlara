import { describe, expect, test } from "vitest";
import { formatPrice, formatPriceInput, parsePrice } from "./money";

const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

describe("formatPrice", () => {
  test("zero è gratis", () => {
    expect(formatPrice(0)).toBe("Gratis");
  });

  test("importi in euro all'italiana", () => {
    expect(normalizeSpaces(formatPrice(500))).toBe("5,00 €");
    expect(normalizeSpaces(formatPrice(1250))).toBe("12,50 €");
    expect(normalizeSpaces(formatPrice(5))).toBe("0,05 €");
  });
});

describe("parsePrice", () => {
  test.each([
    ["12,50", 1250],
    ["12.5", 1250],
    ["12", 1200],
    [" 7,05 ", 705],
    ["0", 0],
    ["0,00", 0],
    ["gratis", 0],
    ["Gratis", 0],
    ["€ 40", 4000],
    ["40 €", 4000],
  ])("%j → %i centesimi", (input, cents) => {
    expect(parsePrice(input)).toEqual({ ok: true, value: cents });
  });

  test.each([[""], ["-5"], ["12,505"], ["dodici"], ["1.000,00"], ["100000"]])(
    "rifiuta %j",
    (input) => {
      expect(parsePrice(input)).toEqual({ ok: false, error: "invalid_price" });
    },
  );
});

describe("formatPriceInput", () => {
  test("centesimi nel formato da modificare", () => {
    expect(formatPriceInput(1250)).toBe("12,50");
    expect(formatPriceInput(0)).toBe("0");
  });
});
