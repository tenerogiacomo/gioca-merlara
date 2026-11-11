import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

// Bozza: presentazione breve della struttura. Sarà sostituita dal nuovo design (DESIGN.md §11).
export function LandingIntro() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Gioca Merlara</h1>
        <p className="text-lg">
          La nuova piattaforma polivalente di Merlara è di tutti: calcetto,
          tennis, basket e non solo. Prenoti online e giochi, senza bisogno di
          nessuno sul posto.
        </p>
      </div>
      <ol className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
        <li>
          <span className="font-semibold">1. Accedi</span> con il tuo numero di
          cellulare.
        </li>
        <li>
          <span className="font-semibold">2. Scegli</span> giorno, orario e
          sport.
        </li>
        <li>
          <span className="font-semibold">3. Gioca</span>: apri da solo con il
          codice che ti arriva.
        </li>
      </ol>
      <div className="flex flex-col gap-2">
        <Link href="/prenota" className={buttonClassName({ fullWidth: true })}>
          Vedi gli orari liberi
        </Link>
        <Link
          href="/accedi"
          className={buttonClassName({ variant: "secondary", fullWidth: true })}
        >
          Accedi
        </Link>
      </div>
    </section>
  );
}
