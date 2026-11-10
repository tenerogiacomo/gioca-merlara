import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { formatPriceInput } from "@/domain/money";
import { findUncoveredSlots } from "@/domain/schedule";
import { requireSuperadmin } from "@/server/auth";
import { loadConfig } from "@/server/admin/config";
import { TIME_OPTIONS, describeUncovered } from "@/server/admin/forms";
import { AdminNav } from "../../admin-nav";
import { PriceRulesEditor } from "./price-rules-editor";

export const metadata: Metadata = {
  title: "Prezzi · Gestione · Gioca Merlara",
};

export default async function PricesPage({
  params,
}: PageProps<"/admin/prezzi/[sport]">) {
  await requireSuperadmin();
  const { sport: sportId } = await params;
  const { schedule, sports, rules } = await loadConfig();
  const sport = sports.find((candidate) => candidate.id === sportId);
  if (!sport) notFound();

  const own = rules.filter((rule) => rule.sportId === sport.id);
  const uncovered = describeUncovered(
    findUncoveredSlots(schedule, own, sport.id),
  );

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Prezzi: {sport.name}</h1>
      <AdminNav />
      <p className="text-text-muted">
        Il prezzo è per lo slot intero, non a persona. Una fascia gratuita deve
        esserlo per tutti gli sport. Le prenotazioni già fatte mantengono il
        loro prezzo.
      </p>
      {uncovered.length > 0 && (
        <Alert tone="warning" title="Orari senza prezzo">
          In questi orari aperti {sport.name} non è prenotabile:{" "}
          {uncovered.join(", ")}.
        </Alert>
      )}
      <PriceRulesEditor
        sportId={sport.id}
        sportName={sport.name}
        timeOptions={TIME_OPTIONS}
        initial={own.map((rule) => ({
          weekdays: rule.weekdays,
          from: rule.from,
          to: rule.to,
          price: formatPriceInput(rule.priceCents),
        }))}
      />
    </section>
  );
}
