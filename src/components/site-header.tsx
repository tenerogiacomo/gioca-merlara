import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";

const linkClass = "font-semibold text-primary hover:underline";

async function AccountLinks() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/accedi" className={linkClass}>
        Accedi
      </Link>
    );
  }
  return (
    <>
      <Link href="/prenotazioni" className={linkClass}>
        Prenotazioni
      </Link>
      {user.isSuperadmin && (
        <Link href="/admin" className={linkClass}>
          Gestione
        </Link>
      )}
      <Link href="/profilo" className={linkClass}>
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
          <Link href="/prenota" className={linkClass}>
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
