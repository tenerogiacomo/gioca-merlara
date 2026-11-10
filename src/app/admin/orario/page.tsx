import type { Metadata } from "next";
import { requireSuperadmin } from "@/server/auth";
import { loadConfig } from "@/server/admin/config";
import { TIME_OPTIONS } from "@/server/admin/forms";
import { AdminNav } from "../admin-nav";
import { ScheduleEditor } from "./schedule-editor";

export const metadata: Metadata = {
  title: "Orario · Gestione · Gioca Merlara",
};

export default async function SchedulePage() {
  await requireSuperadmin();
  const { schedule } = await loadConfig();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Orario di apertura</h1>
      <AdminNav />
      <p className="text-text-muted">
        Per ogni giorno indica uno o più intervalli; un giorno senza intervalli
        è chiuso. Le prenotazioni già fatte non cambiano.
      </p>
      <ScheduleEditor initial={schedule} timeOptions={TIME_OPTIONS} />
    </section>
  );
}
