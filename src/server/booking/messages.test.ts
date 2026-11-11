import { describe, expect, test } from "vitest";
import { bookingErrorMessage } from "./messages";

describe("bookingErrorMessage", () => {
  test.each([
    "booked",
    "blocked",
    "past",
    "beyond_horizon",
    "outside_opening_hours",
    "not_aligned",
    "invalid_duration",
    "unknown_sport",
    "unpriced",
    "mixed_free_paid",
    "not_accepted",
  ] as const)("%s ha un messaggio che dice cosa fare", (code) => {
    expect(bookingErrorMessage(code)).toMatch(/scegli|devi/i);
  });
});
