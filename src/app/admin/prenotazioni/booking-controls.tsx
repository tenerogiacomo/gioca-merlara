"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { cancelByAdminAction, deleteHistoryAction } from "./actions";

export function AdminCancelButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    cancelByAdminAction,
    undefined,
  );

  if (!confirming) {
    return (
      <Button
        variant="text"
        className="self-start px-0"
        onClick={() => setConfirming(true)}
      >
        Annulla d&apos;ufficio la prenotazione di {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <TextField
        label="Motivo (facoltativo)"
        hint="Lo vede chi aveva prenotato."
        name="reason"
        maxLength={200}
      />
      <p>Ricordati di avvisare chi aveva prenotato.</p>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="danger"
          pending={pending}
          pendingLabel="Annullamento…"
        >
          Sì, annulla d&apos;ufficio
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          No, tienila
        </Button>
      </div>
    </form>
  );
}

/**
 * Eliminazione dallo storico (D5b): prima il CSV, poi due conferme.
 * Il server elimina solo se l'impronta corrisponde al CSV scaricato.
 */
export function DeleteHistory({
  count,
  fingerprint,
  csvHref,
  periodLabel,
  dal,
  al,
}: {
  count: number;
  fingerprint: string;
  csvHref: string;
  periodLabel: string;
  dal: string | null;
  al: string | null;
}) {
  const [step, setStep] = useState<"download" | "first" | "second">("download");
  const [state, action, pending] = useActionState(
    deleteHistoryAction,
    undefined,
  );
  const what = count === 1 ? "1 prenotazione" : `${count} prenotazioni`;

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <h3 className="text-xl font-semibold">Elimina dallo storico</h3>
      <p>
        Scarica il CSV di {what} {periodLabel}: dopo l&apos;eliminazione sarà
        l&apos;unica copia. L&apos;eliminazione è definitiva.
      </p>
      <a
        href={csvHref}
        download
        onClick={() =>
          setStep((current) => (current === "download" ? "first" : current))
        }
        className={buttonClassName({ variant: "secondary" })}
      >
        Scarica il CSV
      </a>
      {step === "first" && (
        <Button
          variant="danger"
          className="self-start"
          onClick={() => setStep("second")}
        >
          Elimina {what} {periodLabel}
        </Button>
      )}
      {step === "second" && (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="fingerprint" value={fingerprint} />
          {dal && <input type="hidden" name="dal" value={dal} />}
          {al && <input type="hidden" name="al" value={al} />}
          <TextField
            label={`Per confermare scrivi ${count}`}
            name="typedCount"
            inputMode="numeric"
            autoComplete="off"
            required
          />
          {state?.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              pending={pending}
              pendingLabel="Eliminazione…"
            >
              Elimina definitivamente
            </Button>
            <Button variant="secondary" onClick={() => setStep("first")}>
              Non eliminare
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
