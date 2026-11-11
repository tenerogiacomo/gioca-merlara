import { Temporal } from "temporal-polyfill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { historyRange, loadAllHistory } from "@/server/admin/bookings";
import { bookingsToCsv, fingerprint } from "@/server/admin/csv";

const notFound = () => new Response("Pagina non trovata", { status: 404 });

/**
 * CSV dello storico del periodo (D5b), solo per il superadmin. Il ruolo si rilegge dal server
 * di Supabase, come nei salvataggi: il file contiene dati personali.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isSuperadmin) return notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (
    error ||
    data.user?.id !== user.id ||
    data.user.app_metadata?.role !== "superadmin"
  )
    return notFound();

  const params = new URL(request.url).searchParams;
  const range = historyRange({
    dal: params.get("dal") ?? undefined,
    al: params.get("al") ?? undefined,
  });
  const now = Temporal.Now.instant();
  const bookings = await loadAllHistory(range, now);
  const name = `prenotazioni_${range.fromDate ?? "inizio"}_${range.toDate ?? "oggi"}_${fingerprint(bookings.map((b) => b.id))}.csv`;

  return new Response(bookingsToCsv(bookings, now), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
