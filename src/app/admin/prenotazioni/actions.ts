"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { isUuid } from "@/lib/ids";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireSuperadmin } from "@/server/auth";
import { historyRange, loadHistoryIds } from "@/server/admin/bookings";
import { fingerprint } from "@/server/admin/csv";
import { parseReason, REASON_ERROR } from "@/server/admin/forms";

export type AdminCancelState = { error?: string } | undefined;

/** Annullo d'ufficio (D6): prenotazione attiva non ancora iniziata, con motivo facoltativo. */
export async function cancelByAdminAction(
  _state: AdminCancelState,
  formData: FormData,
): Promise<AdminCancelState> {
  await requireSuperadmin({ fresh: true });
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Prenotazione non trovata." };
  const reason = parseReason(formData.get("reason"));
  if (!reason.ok) return { error: REASON_ERROR };

  const now = Temporal.Now.instant().toString();
  const { data, error } = await createSupabaseServiceClient()
    .from("bookings")
    .update({
      status: "cancelled_by_admin",
      cancelled_at: now,
      cancel_reason: reason.value,
    })
    .eq("id", id)
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
  revalidatePath("/admin", "layout");
  revalidatePath("/prenota");
  return undefined;
}

export type DeleteHistoryState = { error?: string } | undefined;

/** Lo storico è cambiato dopo il download: si ricarica la pagina con la nuova impronta. */
function outdated(range: {
  fromDate: string | null;
  toDate: string | null;
}): never {
  const params = new URLSearchParams({ aggiornato: "1" });
  if (range.fromDate) params.set("dal", range.fromDate);
  if (range.toDate) params.set("al", range.toDate);
  redirect(`/admin/prenotazioni?${params}#storico`);
}

/**
 * Eliminazione dallo storico (D5b): solo le prenotazioni del CSV scaricato (stessa impronta)
 * e solo con il numero esatto scritto per conferma. Il database ricontrolla l'elenco.
 */
export async function deleteHistoryAction(
  _state: DeleteHistoryState,
  formData: FormData,
): Promise<DeleteHistoryState> {
  await requireSuperadmin({ fresh: true });
  const range = historyRange({
    dal: formData.get("dal") || undefined,
    al: formData.get("al") || undefined,
  });
  const now = Temporal.Now.instant();
  const ids = await loadHistoryIds(range, now);

  if (ids.length === 0)
    return { error: "Non ci sono prenotazioni da eliminare." };
  if (fingerprint(ids) !== String(formData.get("fingerprint") ?? ""))
    outdated(range);
  if (String(formData.get("typedCount") ?? "").trim() !== String(ids.length)) {
    return {
      error: `Per confermare scrivi il numero delle prenotazioni da eliminare: ${ids.length}.`,
    };
  }

  const { data, error } = await createSupabaseServiceClient().rpc(
    "delete_bookings",
    {
      p_from: range.from?.toString() ?? (null as unknown as string),
      p_to: range.to?.toString() ?? (null as unknown as string),
      p_ids: ids,
    },
  );
  if (error?.message.includes("export_outdated")) outdated(range);
  if (error) return { error: "Non siamo riusciti a eliminare: riprova." };

  revalidatePath("/admin", "layout");
  const params = new URLSearchParams({ eliminate: String(data) });
  if (range.fromDate) params.set("dal", range.fromDate);
  if (range.toDate) params.set("al", range.toDate);
  redirect(`/admin/prenotazioni?${params}#storico`);
}
