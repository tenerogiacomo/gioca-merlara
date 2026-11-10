import { describe, expect, test } from "vitest";
import { maskPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  test.each([
    ["333 123 4567", "393331234567"],
    ["333-123-4567", "393331234567"],
    ["+39 333 1234567", "393331234567"],
    ["0039 333 1234567", "393331234567"],
    ["(333) 123.4567", "393331234567"],
    ["0429 85000", "39042985000"],
    ["+41 79 123 45 67", "41791234567"],
    ["+44 7911 123456", "447911123456"],
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

describe("maskPhone", () => {
  test("mostra prefisso e ultime cifre", () => {
    expect(maskPhone("393331234567")).toBe("+39 ••• ••• 567");
    expect(maskPhone("41791234567")).toBe("+41 ••• ••• 567");
  });
});
