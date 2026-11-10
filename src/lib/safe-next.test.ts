import { describe, expect, test } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  test.each([
    ["/profilo", "/profilo"],
    ["/prenota?giorno=2026-11-12", "/prenota?giorno=2026-11-12"],
  ])("accetta il percorso interno %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  test.each([
    [undefined],
    [""],
    ["https://esempio.it"],
    ["//esempio.it"],
    ["/\\esempio.it"],
    ["profilo"],
    ["/accedi"],
    ["/accedi/codice"],
  ])("rifiuta %j e usa il profilo", (input) => {
    expect(safeNextPath(input)).toBe("/profilo");
  });
});
