"use server";

import { redirect } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { checkAdult, todayInRome } from "@/domain/age";
import { validateCodiceFiscale } from "@/domain/codice-fiscale";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { supportEmail } from "@/lib/support";
import { getCurrentUser, getProfile } from "@/server/auth";
import { profileErrorMessage, type ProfileError } from "@/server/messages";

type Field = "firstName" | "lastName" | "birthDate" | "taxCode";

export type ProfileFormState =
  | {
      values: Record<Field, string>;
      fieldErrors?: Partial<Record<Field, string>>;
      error?: string;
    }
  | undefined;

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Scrivi il tuo nome.")
    .max(100, "Il nome è troppo lungo: usa al massimo 100 caratteri."),
  lastName: z
    .string()
    .trim()
    .min(1, "Scrivi il tuo cognome.")
    .max(100, "Il cognome è troppo lungo: usa al massimo 100 caratteri."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la data di nascita."),
  taxCode: z.string().trim().min(1, "Scrivi il tuo codice fiscale."),
});

function parseDate(value: string): Temporal.PlainDate | null {
  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" });
  } catch {
    return null;
  }
}

/** Salva il profilo: verifica la sessione e le regole di dominio, poi scrive con la chiave secret. */
export async function saveProfileAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/accedi?next=%2Fprofilo%2Fcompleta");
  // Il profilo è in sola lettura: se esiste già non si sovrascrive.
  if (await getProfile()) redirect("/profilo");

  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    taxCode: String(formData.get("taxCode") ?? ""),
  };
  const fail = (error: ProfileError, field: Field) => ({
    values,
    fieldErrors: { [field]: profileErrorMessage(error, supportEmail()) },
  });

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<Field, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field;
      fieldErrors[field] ??= issue.message;
    }
    return { values, fieldErrors };
  }

  const birthDate = parseDate(parsed.data.birthDate);
  if (!birthDate) return fail("invalid_birth_date", "birthDate");

  const adult = checkAdult({
    birthDate,
    today: todayInRome(Temporal.Now.instant()),
  });
  if (!adult.ok) return fail(adult.error, "birthDate");

  const taxCode = validateCodiceFiscale({
    code: parsed.data.taxCode,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    birthDate,
  });
  if (!taxCode.ok) return fail(taxCode.error, "taxCode");

  const { error } = await createSupabaseServiceClient()
    .from("profiles")
    .insert({
      id: user.id,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      birth_date: birthDate.toString(),
      tax_code: taxCode.value,
    });
  if (error?.code === "23505") {
    // Due salvataggi contemporanei: il secondo trova già il profilo e mostra quello salvato.
    const existing = await createSupabaseServiceClient()
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (existing.data) redirect("/profilo");
    return fail("duplicate_tax_code", "taxCode");
  }
  if (error) {
    return {
      values,
      error:
        "Non siamo riusciti a salvare il profilo: riprova tra qualche istante.",
    };
  }
  redirect("/profilo");
}
