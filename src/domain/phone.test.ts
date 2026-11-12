import { describe, expect, test } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  test.each([
    ["333 123 4567", "393331234567"],
    ["333-123-4567", "393331234567"],
    ["+39 333 1234567", "393331234567"],
    ["0039 333 1234567", "393331234567"],
    ["(333) 123.4567", "393331234567"],
    ["0429 85000", "39042985000"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toEqual({ ok: true, value: expected });
  });

  test.each([
    [""],
    ["12345"],
    ["333 abc 4567"],
    ["+39 33"],
    ["+1234567890123456"],
    ["++39 333"],
  ])("rifiuta %j", (input) => {
    expect(normalizePhone(input)).toEqual({
      ok: false,
      error: "invalid_phone",
    });
  });
});

test.each([["+41 79 123 45 67"], ["+44 7911 123456"], ["0041 79 123 45 67"]])(
  "rifiuta per ora i numeri esteri: %s",
  (input) => {
    expect(normalizePhone(input)).toEqual({
      ok: false,
      error: "unsupported_country",
    });
  },
);

describe("maskPhone", () => {
  test("mostra prefisso e ultime cifre", () => {
    expect(maskPhone("393331234567")).toBe("+39 ••• ••• 567");
  });
});

describe("formatPhone", () => {
  test("numero italiano con e senza prefisso", () => {
    expect(formatPhone("393331234567")).toBe("+39 333 123 4567");
    expect(formatPhone("393331234567", { national: true })).toBe(
      "333 123 4567",
    );
  });
});
