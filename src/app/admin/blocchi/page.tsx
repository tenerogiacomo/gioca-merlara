import type { Metadata } from "next";
import { Temporal } from "temporal-polyfill";
import { toRome } from "@/domain/time";
import { requireSuperadmin } from "@/server/auth";
import { loadCurrentBlocks } from "@/server/admin/blocks";
import { formatPeriod } from "@/server/booking/format";
import { AdminNav } from "../admin-nav";
import { BlockForm, RemoveBlockButton } from "./block-form";

export const metadata: Metadata = {
  title: "Blocchi · Gestione · Gioca Merlara",
};

export default async function BlocksPage() {
  await requireSuperadmin();
  const now = Temporal.Now.instant();
  const blocks = await loadCurrentBlocks(now);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Blocchi</h1>
      <AdminNav />
      <p className="text-text-muted">
        In un periodo bloccato la struttura non si prenota. Un&apos;ora toccata
        anche solo in parte dal blocco risulta chiusa. Se nel periodo ci sono
        prenotazioni, prima di salvare ti chiediamo di confermarne
        l&apos;annullo.
      </p>
      <BlockForm today={toRome(now).toPlainDate().toString()} />

      <h2 className="mt-2 text-2xl font-bold">Blocchi in corso e futuri</h2>
      {blocks.length === 0 && (
        <p className="text-text-muted">Nessun blocco in programma.</p>
      )}
      <ul className="flex flex-col gap-3">
        {blocks.map((block) => {
          const label = formatPeriod(block.startsAt, block.endsAt);
          return (
            <li
              key={block.id}
              className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-card"
            >
              <span className="font-semibold first-letter:uppercase">
                {label}
              </span>
              {block.reason && <span>{block.reason}</span>}
              <RemoveBlockButton id={block.id} label={label} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
