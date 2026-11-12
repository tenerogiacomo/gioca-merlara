import Image from "next/image";
import Link from "next/link";
import { linkClassName } from "@/components/ui/button";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";

async function AccountLinks() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/accedi" className={linkClassName}>
        Accedi
      </Link>
    );
  }
  return (
    <>
      <Link href="/prenotazioni" className={linkClassName}>
        Prenotazioni
      </Link>
      {user.isSuperadmin && (
        <Link href="/admin" className={linkClassName}>
          Gestione
        </Link>
      )}
      <Link href="/profilo" className={linkClassName}>
        Profilo
      </Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-surface shadow-card">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Gioca Merlara, pagina iniziale">
          <Image
            src="/brand/neos-on-light.png"
            alt="NEOS APS"
            width={80}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <nav
          aria-label="Principale"
          className="flex flex-wrap justify-end gap-x-4 gap-y-1"
        >
          <Link href="/prenota" className={linkClassName}>
            Prenota
          </Link>
          <Suspense fallback={null}>
            <AccountLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
