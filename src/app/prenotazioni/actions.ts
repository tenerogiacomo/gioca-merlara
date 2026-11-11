"use server";

import { revalidatePath } from "next/cache";
import { Temporal } from "temporal-polyfill";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireProfile } from "@/server/auth";

export type CancelState = { error?: string } | undefined;

/** Annullo dell'utente: solo prenotazioni proprie, attive e non ancora iniziate (D3). */
export async function cancelBookingAction(
  _state: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const { user } = await requireProfile("/prenotazioni");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id))
    return { error: "Prenotazione non trovata." };

  const now = Temporal.Now.instant().toString();
  const { data, error } = await createSupabaseServiceClient()
    .from("bookings")
    .update({ status: "cancelled_by_user", cancelled_at: now })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("starts_at", now)
    .select("id");
  if (error) return { error: "Non siamo riusciti ad annullare: riprova." };
  if (data.length === 0) {
    return {
      error:
        "Questa prenotazione non si può più annullare: è già iniziata o annullata.",
    };
  }
  revalidatePath("/prenotazioni");
  return undefined;
}
