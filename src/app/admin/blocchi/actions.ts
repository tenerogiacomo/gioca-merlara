"use server";

import { revalidatePath } from "next/cache";
import { Temporal } from "temporal-polyfill";
import { parseBlockPeriod } from "@/domain/block";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireSuperadmin } from "@/server/auth";
import { loadBookingsByIds } from "@/server/admin/bookings";
import { blockInputMessage, startedBookingEnd } from "@/server/admin/blocks";
import { parseReason, REASON_ERROR } from "@/server/admin/forms";
import { blockFormKey } from "./form-key";
import {
  formatDay,
  formatPeriod,
  formatRange,
  formatTime,
} from "@/server/booking/format";

export type BlockFormState =
  | {
      ok?: string;
      warnings?: string[];
      errors?: string[];
      /** Prenotazioni da annullare per salvare il blocco (D3), con la chiave dei campi inviati. */
      confirm?: {
        key: string;
        ids: string[];
        bookings: string[];
        period: string;
      };
    }
  | undefined;

const SAVE_FAILED =
  "Non siamo riusciti a salvare: riprova tra qualche istante.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function createBlockAction(
  _state: BlockFormState,
  formData: FormData,
): Promise<BlockFormState> {
  const user = await requireSuperadmin({ fresh: true });
  const fields = {
    fromDate: String(formData.get("fromDate") ?? ""),
    fromTime: String(formData.get("fromTime") ?? ""),
    toDate: String(formData.get("toDate") ?? ""),
    toTime: String(formData.get("toTime") ?? ""),
    wholeDays: formData.get("wholeDays") === "on" ? "on" : "",
    reason: String(formData.get("reason") ?? ""),
  };
  const now = Temporal.Now.instant();
  const period = parseBlockPeriod(
    { ...fields, wholeDays: fields.wholeDays === "on" },
    now,
  );
  if (!period.ok) return { errors: [blockInputMessage(period.error)] };
  const reason = parseReason(fields.reason);
  if (!reason.ok) return { errors: [REASON_ERROR] };

  const confirmedIds = String(formData.get("confirmedIds") ?? "")
    .split(",")
    .filter(Boolean);
  if (confirmedIds.length > 500 || confirmedIds.some((id) => !UUID.test(id)))
    return { errors: [SAVE_FAILED] };

  const { startsAt, endsAt } = period.value;
  const { data, error } = await createSupabaseServiceClient().rpc(
    "create_block",
    {
      p_starts_at: startsAt.toString(),
      p_ends_at: endsAt.toString(),
      p_reason: reason.value ?? "",
      p_created_by: user.id,
      p_confirmed_ids: confirmedIds,
    },
  );

  if (error?.message.includes("block_hits_started_booking")) {
    const end = await startedBookingEnd(startsAt, endsAt, now);
    return {
      errors: [
        end
          ? `In questo periodo c'è una prenotazione già iniziata: fai iniziare il blocco dalle ${formatTime(end)} di ${formatDay(end)}.`
          : "In questo periodo c'è una prenotazione già iniziata: fai iniziare il blocco dopo la sua fine.",
      ],
    };
  }
  if (error?.message.includes("block_in_past"))
    return { errors: [blockInputMessage("in_past")] };
  if (error || !data) return { errors: [SAVE_FAILED] };

  const result = data as
    | { status: "confirm"; booking_ids: string[] }
    | { status: "created"; cancelled: number };
  const label = formatPeriod(startsAt, endsAt);

  if (result.status === "confirm") {
    const bookings = await loadBookingsByIds(result.booking_ids);
    return {
      confirm: {
        key: blockFormKey(fields),
        ids: result.booking_ids,
        period: label,
        bookings: bookings.map(
          (booking) =>
            `${formatDay(booking.startsAt)}, ${formatRange(booking.startsAt, booking.endsAt)} · ${booking.firstName} ${booking.lastName} · ${booking.sportName}`,
        ),
      },
    };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/prenota");
  return {
    ok: `Blocco salvato: ${label}.`,
    warnings:
      result.cancelled > 0
        ? [
            `${result.cancelled === 1 ? "È stata annullata 1 prenotazione" : `Sono state annullate ${result.cancelled} prenotazioni`}: avvisa chi aveva prenotato. Trovi il telefono nell'elenco delle prenotazioni.`,
          ]
        : undefined,
  };
}

export type RemoveBlockState = { error?: string } | undefined;

/** Rimuove un blocco in corso o futuro (D4): gli orari tornano prenotabili. */
export async function removeBlockAction(
  _state: RemoveBlockState,
  formData: FormData,
): Promise<RemoveBlockState> {
  await requireSuperadmin({ fresh: true });
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: SAVE_FAILED };
  const { data, error } = await createSupabaseServiceClient()
    .from("blocks")
    .delete()
    .eq("id", id)
    .gt("ends_at", Temporal.Now.instant().toString())
    .select("id");
  if (error) return { error: SAVE_FAILED };
  if (data.length === 0)
    return { error: "Questo blocco è già finito o rimosso." };
  revalidatePath("/admin", "layout");
  revalidatePath("/prenota");
  return undefined;
}
