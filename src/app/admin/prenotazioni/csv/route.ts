import { Temporal } from "temporal-polyfill";
import { requireSuperadmin } from "@/server/auth";
import { historyRange, loadAllHistory } from "@/server/admin/bookings";
import { bookingsToCsv, fingerprint } from "@/server/admin/csv";

/**
 * CSV dello storico del periodo (D5b), solo per il superadmin. Il ruolo si rilegge dal server
 * di Supabase, come nei salvataggi: il file contiene dati personali. Per gli altri, 404.
 */
export async function GET(request: Request) {
  await requireSuperadmin({ fresh: true });

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
