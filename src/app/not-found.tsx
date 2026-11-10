import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Pagina non trovata</h1>
      <p>La pagina che cerchi non esiste o è stata spostata.</p>
      <Link href="/" className={buttonClassName({ variant: "secondary" })}>
        Torna alla pagina iniziale
      </Link>
    </section>
  );
}
