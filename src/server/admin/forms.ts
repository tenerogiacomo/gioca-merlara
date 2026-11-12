import { z } from "zod";
import { SLOT_MINUTES } from "@/domain/config";
import { parsePrice } from "@/domain/money";
import { err, ok, type Result } from "@/domain/result";
import type { PriceRuleIssue, ScheduleIssue } from "@/domain/schedule";
import { formatLocalTime, parseLocalTime } from "@/domain/time";
import {
  WEEKDAYS,
  type LocalTime,
  type PriceRule,
  type Weekday,
  type WeeklySchedule,
} from "@/domain/types";

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato",
  7: "Domenica",
};

/** Orari selezionabili nei form: dalle 00:00 alle 24:00 a passi di uno slot. */
export const TIME_OPTIONS: LocalTime[] = Array.from(
  { length: (24 * 60) / SLOT_MINUTES + 1 },
  (_, index) => formatLocalTime(index * SLOT_MINUTES),
);

const weekday = z.number().int().min(1).max(7);
const time = z.string().regex(/^\d{2}:\d{2}$/);

const scheduleSchema = z
  .array(z.object({ weekday, opens: time, closes: time }))
  .max(100);

const priceRulesSchema = z
  .array(
    z.object({
      weekdays: z.array(weekday).max(7),
      from: time,
      to: time,
      price: z.string(),
    }),
  )
  .max(100);

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

/** Orario inviato dal form (JSON) in orario settimanale; la validazione di dominio viene dopo. */
export function parseScheduleInput(
  input: string,
): Result<WeeklySchedule, "invalid_input"> {
  const parsed = scheduleSchema.safeParse(parseJson(input));
  if (!parsed.success) return err("invalid_input");
  const schedule = Object.fromEntries(
    WEEKDAYS.map((day) => [day, []]),
  ) as unknown as WeeklySchedule;
  for (const item of parsed.data) {
    schedule[item.weekday as Weekday].push({
      opens: item.opens,
      closes: item.closes,
    });
  }
  return ok(schedule);
}

/** Fasce di prezzo inviate dal form (JSON, prezzi in euro) in regole di dominio. */
export function parsePriceRulesInput(
  input: string,
  sportId: string,
):
  | { ok: true; value: PriceRule[] }
  | { ok: false; error: { index: number | null; message: string } } {
  const parsed = priceRulesSchema.safeParse(parseJson(input));
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        index: null,
        message: "Il modulo non è valido: ricarica la pagina e riprova.",
      },
    };
  }
  const rules: PriceRule[] = [];
  for (const [index, item] of parsed.data.entries()) {
    const price = parsePrice(item.price);
    if (!price.ok) {
      return {
        ok: false,
        error: {
          index,
          message:
            "Il prezzo non è valido: scrivi un importo in euro, es. 12,50, oppure 0 per gratis.",
        },
      };
    }
    rules.push({
      sportId,
      weekdays: [...new Set(item.weekdays)].sort() as Weekday[],
      from: item.from,
      to: item.to,
      priceCents: price.value,
    });
  }
  return { ok: true, value: rules };
}

export function scheduleIssueMessage(issue: ScheduleIssue): string {
  const day = WEEKDAY_NAMES[issue.weekday];
  switch (issue.code) {
    case "invalid_time":
    case "not_aligned":
      return `${day}: scegli orari a ore intere.`;
    case "empty_or_inverted":
      return `${day}: la chiusura deve venire dopo l'apertura.`;
    case "overlap":
      return `${day}: due intervalli si sovrappongono.`;
  }
}

export function priceIssueMessage(code: PriceRuleIssue["code"]): string {
  switch (code) {
    case "unknown_sport":
      return "Lo sport non esiste più: ricarica la pagina.";
    case "no_weekdays":
    case "invalid_weekday":
      return "Scegli almeno un giorno della settimana.";
    case "invalid_time":
    case "not_aligned":
      return "Scegli orari a ore intere.";
    case "empty_or_inverted":
      return "L'orario di fine deve venire dopo quello di inizio.";
    case "invalid_price":
      return "Il prezzo non è valido: scrivi un importo in euro, es. 12,50, oppure 0 per gratis.";
    case "overlap":
      return "Questa fascia si sovrappone a un'altra dello stesso sport.";
    case "mixed_free_paid":
      return "Nello stesso giorno e orario un altro sport ha una fascia gratuita (o a pagamento): una fascia deve essere gratuita o a pagamento per tutti gli sport.";
  }
}

/** Orari scoperti raggruppati in intervalli leggibili, es. "Sabato 21:00–23:00". */
export function describeUncovered(
  slots: Array<{ weekday: Weekday; localTime: LocalTime }>,
): string[] {
  const ranges: Array<{ weekday: Weekday; from: number; to: number }> = [];
  for (const slot of slots) {
    const start = parseLocalTime(slot.localTime);
    if (start === null) continue;
    const last = ranges.at(-1);
    if (last && last.weekday === slot.weekday && last.to === start)
      last.to = start + SLOT_MINUTES;
    else
      ranges.push({
        weekday: slot.weekday,
        from: start,
        to: start + SLOT_MINUTES,
      });
  }
  return ranges.map(
    (range) =>
      `${WEEKDAY_NAMES[range.weekday]} ${formatLocalTime(range.from)}–${formatLocalTime(range.to)}`,
  );
}

/** Motivo facoltativo di blocchi e annulli: al massimo 200 caratteri, senza caratteri invisibili. */
export function parseReason(
  value: unknown,
): Result<string | null, "invalid_reason"> {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return ok(null);
  if (text.length > 200 || /\p{C}/u.test(text)) return err("invalid_reason");
  return ok(text);
}

export const REASON_ERROR =
  "Il motivo può avere al massimo 200 caratteri, su una sola riga.";
