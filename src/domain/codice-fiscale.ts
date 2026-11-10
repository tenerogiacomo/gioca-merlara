import type { Temporal } from "temporal-polyfill";
import { err, ok, type Result } from "./result";

export type CodiceFiscaleError =
  "format" | "check_character" | "birth_date_mismatch" | "name_mismatch";

/** Cifre che con l'omocodia possono diventare lettere: L=0, M=1, …, V=9. */
const OMOCODIA = "LMNPQRSTUV";
const DIGIT = `[0-9${OMOCODIA}]`;
const FORMAT = new RegExp(
  `^[A-Z]{6}${DIGIT}{2}[ABCDEHLMPRST]${DIGIT}{2}[A-Z]${DIGIT}{3}[A-Z]$`,
);
/** Posizioni (da 0) che contengono cifre, eventualmente sostituite per omocodia. */
const DIGIT_POSITIONS = [6, 7, 9, 10, 12, 13, 14];
const MONTHS = "ABCDEHLMPRST";

/** Valori dei caratteri in posizione dispari (1ª, 3ª, …) per il carattere di controllo. */
const ODD_VALUES: Record<string, number> = {
  0: 1,
  1: 0,
  2: 5,
  3: 7,
  4: 9,
  5: 13,
  6: 15,
  7: 17,
  8: 19,
  9: 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

function evenValue(char: string): number {
  return /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 65;
}

export function normalizeCodiceFiscale(code: string): string {
  return code.replace(/\s/g, "").toUpperCase();
}

function checkCharacter(first15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += i % 2 === 0 ? ODD_VALUES[first15[i]] : evenValue(first15[i]);
  }
  return String.fromCharCode(65 + (sum % 26));
}

/** Sostituisce le lettere di omocodia con le cifre originali. */
function decodeOmocodia(code: string): string {
  const chars = code.split("");
  for (const position of DIGIT_POSITIONS) {
    const index = OMOCODIA.indexOf(chars[position]);
    if (index >= 0) chars[position] = String(index);
  }
  return chars.join("");
}

function lettersOnly(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

const isVowel = (char: string) => "AEIOU".includes(char);

function splitLetters(name: string) {
  const letters = lettersOnly(name).split("");
  return {
    consonants: letters.filter((char) => !isVowel(char)),
    vowels: letters.filter(isVowel),
  };
}

const pad = (letters: string[]) => letters.join("").padEnd(3, "X").slice(0, 3);

/** Le tre lettere del cognome nel codice fiscale. */
export function lastNameCode(lastName: string): string {
  const { consonants, vowels } = splitLetters(lastName);
  return pad([...consonants, ...vowels]);
}

/** Le tre lettere del nome nel codice fiscale (con quattro o più consonanti: 1ª, 3ª e 4ª). */
export function firstNameCode(firstName: string): string {
  const { consonants, vowels } = splitLetters(firstName);
  if (consonants.length >= 4)
    return [consonants[0], consonants[2], consonants[3]].join("");
  return pad([...consonants, ...vowels]);
}

/**
 * Verifica formato, carattere di controllo e coerenza con data di nascita, nome e cognome.
 * Il sesso non è richiesto: il giorno è accettato sia per uomo sia per donna (+40).
 * In caso di successo restituisce il codice normalizzato.
 */
export function validateCodiceFiscale({
  code,
  firstName,
  lastName,
  birthDate,
}: {
  code: string;
  firstName: string;
  lastName: string;
  birthDate: Temporal.PlainDate;
}): Result<string, CodiceFiscaleError> {
  const normalized = normalizeCodiceFiscale(code);
  if (!FORMAT.test(normalized)) return err("format");
  if (checkCharacter(normalized.slice(0, 15)) !== normalized[15])
    return err("check_character");

  const decoded = decodeOmocodia(normalized);
  const year = Number(decoded.slice(6, 8));
  const month = MONTHS.indexOf(decoded[8]) + 1;
  const day = Number(decoded.slice(9, 11));
  const sameDate =
    year === birthDate.year % 100 &&
    month === birthDate.month &&
    (day === birthDate.day || day === birthDate.day + 40);
  if (!sameDate) return err("birth_date_mismatch");

  const sameName =
    normalized.slice(0, 3) === lastNameCode(lastName) &&
    normalized.slice(3, 6) === firstNameCode(firstName);
  if (!sameName) return err("name_mismatch");

  return ok(normalized);
}
