import { describe, expect, test } from "vitest";
import { lastNameCode, firstNameCode } from "./codice-fiscale";

describe("codici di nome e cognome", () => {
  test.each([
    ["Rossi", "RSS"],
    ["De Rossi", "DRS"],
    ["D'Angelo", "DNG"],
    ["Fò", "FOX"],
    ["Bò", "BOX"],
    ["Ai", "AIX"],
    ["Rè", "REX"],
    ["Łukasz", "LKS"],
    ["Strauß", "STR"],
    ["Østergaard", "STR"],
  ])("cognome %s → %s", (name, code) => {
    expect(lastNameCode(name)).toBe(code);
  });

  test.each([
    ["Mario", "MRA"],
    ["Gianfranco", "GFR"],
    ["Maria Grazia", "MGR"],
    ["Luca", "LCU"],
    ["Ugo", "GUO"],
    ["Zoë", "ZOE"],
  ])("nome %s → %s", (name, code) => {
    expect(firstNameCode(name)).toBe(code);
  });
});
