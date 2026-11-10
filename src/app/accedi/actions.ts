"use server";

import { redirect } from "next/navigation";
import { normalizePhone } from "@/domain/phone";
import { safeNextPath } from "@/lib/safe-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/server/messages";
import { forgetOtpPhone, readOtpPhone, rememberOtpPhone } from "./otp-cookie";

export type FormState =
  { error?: string; notice?: string; phone?: string } | undefined;

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

async function sendOtp(phone: string): Promise<string | undefined> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  return error ? authErrorMessage(error) : undefined;
}

/** Prima schermata: invia il codice al numero indicato. */
export async function sendCodeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = field(formData, "phone");
  const phone = normalizePhone(input);
  if (!phone.ok) {
    return {
      phone: input,
      error:
        phone.error === "unsupported_country"
          ? "Per ora si accede solo con un numero di cellulare italiano."
          : "Il numero non sembra valido: controlla di averlo scritto tutto.",
    };
  }
  const error = await sendOtp(phone.value);
  if (error) return { phone: input, error };

  await rememberOtpPhone(phone.value);
  const next = safeNextPath(field(formData, "next"));
  redirect(`/accedi/codice?next=${encodeURIComponent(next)}`);
}

/** Seconda schermata: verifica il codice e apre la sessione. */
export async function verifyCodeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const phone = await readOtpPhone();
  if (!phone) redirect("/accedi");

  const token = field(formData, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token))
    return { error: "Il codice è di 6 cifre: controlla l'SMS." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) return { error: authErrorMessage(error) };

  await forgetOtpPhone();
  redirect(safeNextPath(field(formData, "next")));
}

/** Seconda schermata: invia un nuovo codice allo stesso numero. */
export async function resendCodeAction(): Promise<FormState> {
  const phone = await readOtpPhone();
  if (!phone) redirect("/accedi");
  const error = await sendOtp(phone);
  return error ? { error } : { notice: "Ti abbiamo inviato un nuovo codice." };
}
