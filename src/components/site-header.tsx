import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";

async function AccountLink() {
  const user = await getCurrentUser();
  return user ? (
    <Link
      href="/profilo"
      className="font-semibold text-primary hover:underline"
    >
      Il mio profilo
    </Link>
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
