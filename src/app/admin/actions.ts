"use server";

import { revalidatePath } from "next/cache";
import {
  findUncoveredSlots,
  validatePriceRules,
  validateSchedule,
} from "@/domain/schedule";
import { sportIdFromName } from "@/domain/sport-id";
import { WEEKDAYS } from "@/domain/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireSuperadmin } from "@/server/auth";
import { futureBookingsOutside, loadConfig } from "@/server/admin/config";
import {
  describeUncovered,
  parsePriceRulesInput,
  parseScheduleInput,
  priceIssueMessage,
  scheduleIssueMessage,
} from "@/server/admin/forms";
import { toDbTime } from "@/server/db/mappers";

export type AdminFormState =
  | {
      ok?: string;
      errors?: string[];
      warnings?: string[];
      errorIndex?: number | null;
    }
  | undefined;

const SAVE_FAILED =
  "Non siamo riusciti a salvare: riprova tra qualche istante.";

export async function saveScheduleAction(
  _state: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireSuperadmin();
  const parsed = parseScheduleInput(String(formData.get("schedule") ?? ""));
  if (!parsed.ok)
    return {
      errors: ["Il modulo non è valido: ricarica la pagina e riprova."],
    };

  const issues = validateSchedule(parsed.value);
  if (issues.length > 0) return { errors: issues.map(scheduleIssueMessage) };

  const intervals = WEEKDAYS.flatMap((weekday) =>
    parsed.value[weekday].map((interval) => ({
      weekday,
      opens: toDbTime(interval.opens),
      closes: toDbTime(interval.closes),
    })),
  );
  const { error } = await createSupabaseServiceClient().rpc(
    "replace_opening_intervals",
    {
      p_intervals: intervals,
    },
  );
  if (error) return { errors: [SAVE_FAILED] };

  revalidatePath("/admin", "layout");
  const outside = await futureBookingsOutside(parsed.value);
  return {
    ok: "Orario salvato.",
    warnings:
      outside.length > 0
        ? [
            `Queste prenotazioni restano valide ma sono fuori dal nuovo orario: ${outside.join("; ")}. Potrai annullarle d'ufficio.`,
          ]
        : undefined,
  };
}

export async function createSportAction(
  _state: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireSuperadmin();
  const name = String(formData.get("name") ?? "").trim();
  const id = sportIdFromName(name);
  if (!name || !id || name.length > 60) {
    return { errors: ["Scrivi un nome di sport di massimo 60 caratteri."] };
  }
  const { sports } = await loadConfig();
  if (sports.some((sport) => sport.name.toLowerCase() === name.toLowerCase())) {
    return { errors: [`Esiste già uno sport chiamato "${name}".`] };
  }
  const sortOrder = Math.max(0, ...sports.map((sport) => sport.sort_order)) + 1;
  const { error } = await createSupabaseServiceClient()
    .from("sports")
    .insert({ id, name, active: true, sort_order: sortOrder });
  if (error?.code === "23505")
    return { errors: [`Esiste già uno sport chiamato "${name}".`] };
  if (error) return { errors: [SAVE_FAILED] };
  revalidatePath("/admin", "layout");
  return {
    ok: `${name} aggiunto. Ricordati di impostarne i prezzi: senza prezzi non è prenotabile.`,
  };
}

export async function updateSportAction(
  _state: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));
  const active = formData.get("active") === "on";
  if (!name || name.length > 60)
    return { errors: ["Il nome deve avere da 1 a 60 caratteri."] };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    return { errors: ["L'ordine deve essere un numero intero da 0 a 999."] };
  }
  const { data, error } = await createSupabaseServiceClient()
    .from("sports")
    .update({ name, sort_order: sortOrder, active })
    .eq("id", id)
    .select("id");
  if (error || data.length === 0) return { errors: [SAVE_FAILED] };
  revalidatePath("/admin", "layout");
  return { ok: "Salvato." };
}

export async function savePriceRulesAction(
  sportId: string,
  _state: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireSuperadmin();
  const parsed = parsePriceRulesInput(
    String(formData.get("rules") ?? ""),
    sportId,
  );
  if (!parsed.ok)
    return { errors: [parsed.error.message], errorIndex: parsed.error.index };

  // Le fasce si validano insieme a quelle degli altri sport (regola gratis / a pagamento).
  const config = await loadConfig();
  if (!config.sports.some((sport) => sport.id === sportId)) {
    return { errors: [priceIssueMessage("unknown_sport")] };
  }
  const others = config.rules.filter((rule) => rule.sportId !== sportId);
  const all = [...others, ...parsed.value];
  const sports = config.sports.map((sport) => ({
    id: sport.id,
    name: sport.name,
  }));
  const issue = validatePriceRules(all, sports).find(
    (candidate) => candidate.index >= others.length,
  );
  if (issue) {
    const index = issue.index - others.length;
    return {
      errors: [`Fascia ${index + 1}: ${priceIssueMessage(issue.code)}`],
      errorIndex: index,
    };
  }

  const { error } = await createSupabaseServiceClient().rpc(
    "replace_price_rules",
    {
      p_sport_id: sportId,
      p_rules: parsed.value.map((rule) => ({
        weekdays: rule.weekdays,
        from: toDbTime(rule.from),
        to: toDbTime(rule.to),
        priceCents: rule.priceCents,
      })),
    },
  );
  if (error) return { errors: [SAVE_FAILED] };

  revalidatePath("/admin", "layout");
  const uncovered = describeUncovered(
    findUncoveredSlots(config.schedule, parsed.value, sportId),
  );
  return {
    ok: "Prezzi salvati.",
    warnings:
      uncovered.length > 0
        ? [
            `In questi orari aperti lo sport non è prenotabile perché non ha un prezzo: ${uncovered.join(", ")}.`,
          ]
        : undefined,
  };
}
