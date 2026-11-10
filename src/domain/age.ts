import { Temporal } from "temporal-polyfill";
import { err, ok, type Result } from "./result";
import { toRome } from "./time";

const ADULT_AGE = 18;

/** Data di oggi a Roma. */
export function todayInRome(now: Temporal.Instant): Temporal.PlainDate {
  return toRome(now).toPlainDate();
}

/** Giorno in cui si compiono `years` anni; chi è nato il 29 febbraio li compie il 1° marzo negli anni non bisestili. */
function birthdayAt(
  birthDate: Temporal.PlainDate,
  years: number,
): Temporal.PlainDate {
  const birthday = birthDate.add({ years });
  const shifted =
    birthDate.month === 2 && birthDate.day === 29 && birthday.day !== 29;
  return shifted ? birthday.add({ days: 1 }) : birthday;
}

export function checkAdult({
  birthDate,
  today,
}: {
  birthDate: Temporal.PlainDate;
  today: Temporal.PlainDate;
}): Result<void, "underage" | "invalid_birth_date"> {
  if (Temporal.PlainDate.compare(birthDate, today) > 0)
    return err("invalid_birth_date");
  const adultFrom = birthdayAt(birthDate, ADULT_AGE);
  return Temporal.PlainDate.compare(today, adultFrom) >= 0
    ? ok(undefined)
    : err("underage");
}
