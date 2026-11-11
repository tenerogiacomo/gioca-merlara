"use server";

import { redirect } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { checkBookingRequest } from "@/domain/booking-request";
import { AUTOCERT_VERSION } from "@/content/autocertificazione";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireProfile } from "@/server/auth";
import { loadSlotContext } from "@/server/booking/calendar";
import { bookingErrorMessage } from "@/server/booking/messages";

export type BookingFormState = { error?: string } | undefined;

function parseInstant(value: string): Temporal.Instant | null {
  try {
    return Temporal.Instant.from(value);
  } catch {
    return null;
  }
}

/** Prenota: verifica sessione, profilo e regole di dominio, poi salva con la chiave secret. */
export async function bookAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const startsAtText = String(formData.get("startsAt") ?? "");
  const { user } = await requireProfile(
    `/prenota/${encodeURIComponent(startsAtText)}`,
  );

  if (formData.get("autocert") !== "on")
    return { error: bookingErrorMessage("not_accepted") };
  const startsAt = parseInstant(startsAtText);
  if (!startsAt) return { error: bookingErrorMessage("outside_opening_hours") };

  const { context } = await loadSlotContext();
  const quote = checkBookingRequest({
    ...context,
    startsAt,
    sportId: String(formData.get("sportId") ?? ""),
    slotCount: Number(formData.get("slotCount")),
  });
  if (!quote.ok) return { error: bookingErrorMessage(quote.error) };

  const { data, error } = await createSupabaseServiceClient()
    .from("bookings")
    .insert({
      user_id: user.id,
      sport_id: String(formData.get("sportId")),
      starts_at: quote.value.startsAt.toString(),
      ends_at: quote.value.endsAt.toString(),
      price_cents: quote.value.priceCents,
      autocert_version: AUTOCERT_VERSION,
      autocert_accepted_at: Temporal.Now.instant().toString(),
    })
    .select("id")
    .single();
  // 23P01: un'altra prenotazione si sovrappone (salvata nel frattempo).
  if (error?.code === "23P01") return { error: bookingErrorMessage("booked") };
  if (error)
    return { error: "Non siamo riusciti a salvare la prenotazione: riprova." };

  redirect(`/prenotazioni?nuova=${data.id}`);
}
