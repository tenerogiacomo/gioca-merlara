import { describe, expect, test } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  test.each([
    ["/profilo", "/profilo"],
    ["/prenota?giorno=2026-11-12", "/prenota?giorno=2026-11-12"],
    ["/%2Fesempio.it", "/%2Fesempio.it"],
    ["/profilo#dati", "/profilo"],
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
    ["/\t/esempio.it"],
    ["/\n/esempio.it"],
    ["/\t\\esempio.it"],
    ["/accedi/../accedi"],
    ["/%2e%2e/accedi"],
  ])("rifiuta %j e usa il profilo", (input) => {
    expect(safeNextPath(input)).toBe("/profilo");
  });
});
