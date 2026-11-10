import type { Metadata } from "next";
import { requireSuperadmin } from "@/server/auth";
import { loadConfig } from "@/server/admin/config";
import { AdminNav } from "../admin-nav";
import { NewSportForm, SportRowForm } from "./sport-forms";

export const metadata: Metadata = { title: "Sport · Gestione · Gioca Merlara" };

export default async function SportsPage() {
  await requireSuperadmin();
  const { sports } = await loadConfig();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Sport e prezzi</h1>
      <AdminNav />
      <p className="text-text-muted">
        Chi prenota sceglie lo sport: il prezzo dipende dallo sport, dal giorno
        e dall&apos;orario. Uno sport non prenotabile non compare nel
        calendario.
      </p>
      {sports.map((sport) => (
        <SportRowForm key={sport.id} sport={sport} />
      ))}
      <NewSportForm />
    </section>
  );
}
