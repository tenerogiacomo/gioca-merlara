import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/server/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Completa il profilo · Gioca Merlara",
};

export default async function CompleteProfilePage() {
  await requireUser("/profilo/completa");
  if (await getProfile()) redirect("/profilo");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Completa il tuo profilo</h1>
      <p className="text-text-muted">
        Ci servono questi dati per l&apos;autocertificazione di responsabilità
        quando prenoti. Una volta salvati non potrai modificarli da qui, quindi
        controllali bene.
      </p>
      <ProfileForm />
    </section>
  );
}
