import { describe, expect, test } from "vitest";
import { formatPrice } from "./money";

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
