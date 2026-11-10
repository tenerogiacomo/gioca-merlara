import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";

async function AccountLink() {
  const user = await getCurrentUser();
  return user ? (
    <div className="flex gap-4">
      {user.isSuperadmin && (
        <Link
          href="/admin"
          className="font-semibold text-primary hover:underline"
        >
          Gestione
        </Link>
      )}
      <Link
        href="/profilo"
        className="font-semibold text-primary hover:underline"
      >
        Il mio profilo
      </Link>
    </div>
  ) : (
    <Link href="/accedi" className="font-semibold text-primary hover:underline">
      Accedi
    </Link>
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
        <Suspense fallback={null}>
          <AccountLink />
        </Suspense>
      </div>
    </header>
  );
}
