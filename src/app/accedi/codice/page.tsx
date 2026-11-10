import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { maskPhone } from "@/domain/phone";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentUser } from "@/server/auth";
import { readOtpPhone } from "../otp-cookie";
import { CodeForm } from "./code-form";

export const metadata: Metadata = {
  title: "Inserisci il codice · Gioca Merlara",
};

export default async function CodePage({
  searchParams,
}: PageProps<"/accedi/codice">) {
  const { next } = await searchParams;
  const destination = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getCurrentUser()) redirect(destination);

  const phone = await readOtpPhone();
  if (!phone) redirect("/accedi");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Inserisci il codice</h1>
      <CodeForm next={destination} maskedPhone={maskPhone(phone)} />
    </section>
  );
}
