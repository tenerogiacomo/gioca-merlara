import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentUser } from "@/server/auth";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Accedi · Gioca Merlara" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/accedi">) {
  const { next } = await searchParams;
  const destination = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getCurrentUser()) redirect(destination);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Accedi</h1>
      <p className="text-text-muted">
        Basta il tuo numero di cellulare: niente password da ricordare.
      </p>
      <PhoneForm next={destination} />
    </section>
  );
}
