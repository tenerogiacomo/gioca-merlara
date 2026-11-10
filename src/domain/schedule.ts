import { SLOT_MINUTES } from "./config";
import { formatLocalTime, parseLocalTime } from "./time";
import {
  WEEKDAYS,
  type LocalTime,
  type PriceRule,
  type Sport,
  type Weekday,
  type WeeklySchedule,
} from "./types";

export type ScheduleIssue = {
  weekday: Weekday;
  index: number;
  code: "invalid_time" | "not_aligned" | "empty_or_inverted" | "overlap";
};

export type PriceRuleIssue = {
  index: number;
  code:
    | "unknown_sport"
    | "no_weekdays"
    | "invalid_weekday"
    | "invalid_time"
    | "not_aligned"
    | "empty_or_inverted"
    | "invalid_price"
    | "overlap";
};

type Range = { from: number; to: number };

function checkRange(
  from: LocalTime,
  to: LocalTime,
): Range | "invalid_time" | "not_aligned" | "empty_or_inverted" {
  const start = parseLocalTime(from);
  const end = parseLocalTime(to);
  if (start === null || end === null) return "invalid_time";
  if (start % SLOT_MINUTES !== 0 || end % SLOT_MINUTES !== 0)
    return "not_aligned";
  if (end <= start) return "empty_or_inverted";
  return { from: start, to: end };
}

const overlaps = (a: Range, b: Range) => a.from < b.to && b.from < a.to;

/** Problemi dell'orario di apertura; lista vuota se l'orario è valido. */
export function validateSchedule(schedule: WeeklySchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  for (const weekday of WEEKDAYS) {
    const valid: Range[] = [];
    schedule[weekday].forEach((interval, index) => {
      const range = checkRange(interval.opens, interval.closes);
      if (typeof range === "string") {
        issues.push({ weekday, index, code: range });
      } else if (valid.some((other) => overlaps(other, range))) {
        issues.push({ weekday, index, code: "overlap" });
      } else {
        valid.push(range);
      }
    });
  }
  return issues;
}

/** Problemi delle regole di prezzo; lista vuota se le regole sono valide. */
export function validatePriceRules(
  rules: PriceRule[],
  sports: Sport[],
): PriceRuleIssue[] {
  const issues: PriceRuleIssue[] = [];
  const sportIds = new Set(sports.map((sport) => sport.id));
  const valid: Array<{ rule: PriceRule; range: Range }> = [];

  rules.forEach((rule, index) => {
    const issue = (code: PriceRuleIssue["code"]) =>
      issues.push({ index, code });
    if (!sportIds.has(rule.sportId)) return issue("unknown_sport");
    if (rule.weekdays.length === 0) return issue("no_weekdays");
    if (rule.weekdays.some((day) => !WEEKDAYS.includes(day)))
      return issue("invalid_weekday");
    const range = checkRange(rule.from, rule.to);
    if (typeof range === "string") return issue(range);
    if (!Number.isInteger(rule.priceCents) || rule.priceCents < 0)
      return issue("invalid_price");
    const clash = valid.some(
      (other) =>
        other.rule.sportId === rule.sportId &&
        other.rule.weekdays.some((day) => rule.weekdays.includes(day)) &&
        overlaps(other.range, range),
    );
    if (clash) return issue("overlap");
    valid.push({ rule, range });
  });
  return issues;
}

/** Prezzo di uno sport per uno slot che inizia a `startMinutes` in un certo giorno, se una regola lo copre interamente. */
export function priceFor(
  rules: PriceRule[],
  sportId: string,
  weekday: Weekday,
  startMinutes: number,
): number | undefined {
  const endMinutes = startMinutes + SLOT_MINUTES;
  const rule = rules.find((candidate) => {
    if (candidate.sportId !== sportId || !candidate.weekdays.includes(weekday))
      return false;
    const from = parseLocalTime(candidate.from);
    const to = parseLocalTime(candidate.to);
    return (
      from !== null && to !== null && from <= startMinutes && endMinutes <= to
    );
  });
  return rule?.priceCents;
}

/** Inizi degli slot aperti, giorno per giorno, secondo l'orario (ignora intervalli non validi). */
export function slotStartsFor(
  schedule: WeeklySchedule,
  weekday: Weekday,
): number[] {
  const starts: number[] = [];
  for (const interval of schedule[weekday]) {
    const range = checkRange(interval.opens, interval.closes);
    if (typeof range === "string") continue;
    for (
      let minute = range.from;
      minute + SLOT_MINUTES <= range.to;
      minute += SLOT_MINUTES
    ) {
      starts.push(minute);
    }
  }
  // Un orario salvato con intervalli sovrapposti non deve produrre slot doppi.
  return [...new Set(starts)].sort((a, b) => a - b);
}

/** Orari aperti in cui uno sport non ha prezzo, per segnalarli nella configurazione. */
export function findUncoveredSlots(
  schedule: WeeklySchedule,
  rules: PriceRule[],
  sportId: string,
): Array<{ weekday: Weekday; localTime: LocalTime }> {
  return WEEKDAYS.flatMap((weekday) =>
    slotStartsFor(schedule, weekday)
      .filter((start) => priceFor(rules, sportId, weekday, start) === undefined)
      .map((start) => ({ weekday, localTime: formatLocalTime(start) })),
  );
}
