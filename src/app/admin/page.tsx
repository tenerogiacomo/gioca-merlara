import { linkClassName } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { findUncoveredSlots } from "@/domain/schedule";
import { WEEKDAYS } from "@/domain/types";
import { requireSuperadmin } from "@/server/auth";
import { loadConfig } from "@/server/admin/config";
import { WEEKDAY_NAMES, describeUncovered } from "@/server/admin/forms";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: "Gestione · Gioca Merlara" };

export default async function AdminPage() {
  await requireSuperadmin();
  const { schedule, sports, rules } = await loadConfig();
  const active = sports.filter((sport) => sport.active);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Gestione</h1>
      <AdminNav />

      <div className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-xl font-semibold">Orario</h2>
        <ul className="text-base">
          {WEEKDAYS.map((day) => (
            <li key={day}>
              <span className="font-semibold">{WEEKDAY_NAMES[day]}</span>:{" "}
              {schedule[day].length === 0
                ? "chiuso"
                : schedule[day].map((i) => `${i.opens}–${i.closes}`).join(", ")}
            </li>
          ))}
        </ul>
        <Link href="/admin/orario" className={linkClassName}>
          Modifica l&apos;orario
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-xl font-semibold">Sport attivi</h2>
        {active.length === 0 && (
          <p>Nessuno sport attivo: il calendario non è prenotabile.</p>
        )}
        {active.map((sport) => {
          const uncovered = describeUncovered(
            findUncoveredSlots(schedule, rules, sport.id),
          );
          return (
            <div key={sport.id} className="flex flex-col gap-1">
              <Link
                href={`/admin/prezzi/${sport.id}`}
                className={linkClassName}
              >
                {sport.name}: prezzi
              </Link>
              {uncovered.length > 0 && (
                <Alert tone="warning">
                  Non prenotabile in questi orari, perché senza prezzo:{" "}
                  {uncovered.join(", ")}.
                </Alert>
              )}
            </div>
          );
        })}
        <Link href="/admin/sport" className={linkClassName}>
          Gestisci gli sport
        </Link>
      </div>
    </section>
  );
}
