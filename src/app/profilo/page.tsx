import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supportEmail } from "@/lib/support";
import { requireProfile } from "@/server/auth";
import { signOutAction } from "./actions";

export const metadata: Metadata = { title: "Il tuo profilo · Gioca Merlara" };

const dateFormat = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default async function ProfilePage() {
  const { user, profile } = await requireProfile("/profilo");
  const email = supportEmail();
  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    "Correzione del profilo Gioca Merlara",
  )}&body=${encodeURIComponent(
    `Ciao, sono ${profile.first_name} ${profile.last_name}. Vorrei correggere questi dati del mio profilo:\n\n`,
  )}`;

  const rows = [
    ["Nome", profile.first_name],
    ["Cognome", profile.last_name],
    [
      "Data di nascita",
      dateFormat.format(new Date(`${profile.birth_date}T00:00:00Z`)),
    ],
    ["Codice fiscale", profile.tax_code],
    ["Cellulare", user.phone ? `+${user.phone}` : "—"],
  ];

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Il tuo profilo</h1>
      <dl className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <Alert>
        I dati non si possono modificare da qui. Per correggerli scrivi a{" "}
        <a href={mailto} className="font-semibold underline">
          {email}
        </a>
        .
      </Alert>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary" fullWidth>
          Esci
        </Button>
      </form>
    </section>
  );
}
