import { describe, expect, test } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  normalizeCodiceFiscale,
  validateCodiceFiscale,
} from "./codice-fiscale";

// Esempi pubblici noti (Mario Rossi, Matteo Moretti di Wikipedia) e codici costruiti con lo stesso algoritmo.
const mario = {
  code: "RSSMRA85T10A562S",
  firstName: "Mario",
  lastName: "Rossi",
  birthDate: Temporal.PlainDate.from("1985-12-10"),
};

describe("normalizeCodiceFiscale", () => {
  test("toglie gli spazi e mette in maiuscolo", () => {
    expect(normalizeCodiceFiscale(" rss mra 85t10 a562s ")).toBe(
      "RSSMRA85T10A562S",
    );
  });
});

describe("validateCodiceFiscale", () => {
  test("accetta un codice valido e coerente", () => {
    expect(validateCodiceFiscale(mario)).toEqual({
      ok: true,
      value: "RSSMRA85T10A562S",
    });
  });

  test("accetta l'esempio di Wikipedia", () => {
    expect(
      validateCodiceFiscale({
        code: "MRTMTT25D09F205Z",
        firstName: "Matteo",
        lastName: "Moretti",
        birthDate: Temporal.PlainDate.from("1925-04-09"),
      }).ok,
    ).toBe(true);
  });

  test("accetta minuscole e spazi", () => {
    expect(
      validateCodiceFiscale({ ...mario, code: "rssmra85t10a562s " }).ok,
    ).toBe(true);
  });

  test("accetta una donna (giorno + 40)", () => {
    expect(
      validateCodiceFiscale({
        code: "BNCLRA90A41F205I",
        firstName: "Laura",
        lastName: "Bianchi",
        birthDate: Temporal.PlainDate.from("1990-01-01"),
      }).ok,
    ).toBe(true);
  });

  test("accetta un codice omocodico", () => {
    // Stesso codice di Mario con le ultime cifre sostituite da lettere (omocodia).
    expect(
      validateCodiceFiscale({ ...mario, code: "RSSMRA85T10A5S2E" }).ok,
    ).toBe(true);
  });

  test.each([
    ["troppo corto", "RSSMRA85T10A562"],
    ["lettera al posto dell'anno non ammessa", "RSSMRAA5T10A562S"],
    ["mese inesistente", "RSSMRA85Z10A562S"],
  ])("rifiuta il formato: %s", (_, code) => {
    expect(validateCodiceFiscale({ ...mario, code })).toEqual({
      ok: false,
      error: "format",
    });
  });

  test("rifiuta un carattere di controllo sbagliato", () => {
    expect(
      validateCodiceFiscale({ ...mario, code: "RSSMRA85T10A562T" }),
    ).toEqual({
      ok: false,
      error: "check_character",
    });
  });

  test("rifiuta una data di nascita diversa", () => {
    expect(
      validateCodiceFiscale({
        ...mario,
        birthDate: Temporal.PlainDate.from("1985-12-11"),
      }),
    ).toEqual({ ok: false, error: "birth_date_mismatch" });
  });

  test("rifiuta nome o cognome incoerenti", () => {
    expect(validateCodiceFiscale({ ...mario, firstName: "Marco" })).toEqual({
      ok: false,
      error: "name_mismatch",
    });
    expect(validateCodiceFiscale({ ...mario, lastName: "Bianchi" })).toEqual({
      ok: false,
      error: "name_mismatch",
    });
  });
});
