"use client";

import { startTransition, useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { BLOCK_END_TIMES, BLOCK_START_TIMES } from "@/domain/block";
import { FormFeedback } from "../form-feedback";
import {
  createBlockAction,
  removeBlockAction,
  type BlockFormState,
} from "./actions";
import { blockFormKey, type BlockFields } from "./form-key";

export function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<BlockFormState, FormData>(
    createBlockAction,
    undefined,
  );
  const [fields, setFields] = useState<BlockFields>({
    fromDate: today,
    fromTime: "09:00",
    toDate: today,
    toTime: "10:00",
    wholeDays: "",
    reason: "",
  });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const set = (name: keyof BlockFields) => (value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

  const key = blockFormKey(fields);
  const confirm =
    state?.confirm && state.confirm.key === key && dismissed !== key
      ? state.confirm
      : null;
  const wholeDays = fields.wholeDays === "on";

  return (
    <form
      // Invio manuale: con `action` React riporterebbe i menu ai valori iniziali dopo ogni
      // risposta, e la conferma partirebbe con orari diversi da quelli mostrati.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(
          event.currentTarget,
          (event.nativeEvent as SubmitEvent).submitter,
        );
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card"
    >
      <h2 className="text-xl font-semibold">Nuovo blocco</h2>
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          name="wholeDays"
          checked={wholeDays}
          onChange={(event) =>
            set("wholeDays")(event.target.checked ? "on" : "")
          }
          className="size-5 accent-blue-700"
        />
        Giornate intere
      </label>
      <div className="flex flex-wrap gap-3">
        <TextField
          label={wholeDays ? "Dal giorno" : "Giorno d'inizio"}
          name="fromDate"
          type="date"
          min={today}
          required
          value={fields.fromDate}
          onChange={(event) => set("fromDate")(event.target.value)}
        />
        {!wholeDays && (
          <SelectField
            label="Dalle"
            name="fromTime"
            options={BLOCK_START_TIMES}
            value={fields.fromTime}
            onChange={(event) => set("fromTime")(event.target.value)}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <TextField
          label={wholeDays ? "Al giorno (compreso)" : "Giorno di fine"}
          name="toDate"
          type="date"
          min={today}
          required
          value={fields.toDate}
          onChange={(event) => set("toDate")(event.target.value)}
        />
        {!wholeDays && (
          <SelectField
            label="Alle"
            name="toTime"
            options={BLOCK_END_TIMES}
            value={fields.toTime}
            onChange={(event) => set("toTime")(event.target.value)}
          />
        )}
      </div>
      <TextField
        label="Motivo (facoltativo)"
        hint="Lo vede chi aveva prenotato, se il blocco annulla la sua prenotazione."
        name="reason"
        maxLength={200}
        value={fields.reason}
        onChange={(event) => set("reason")(event.target.value)}
      />

      {confirm ? (
        <div className="flex flex-col gap-2">
          <Alert tone="warning" title="Ci sono prenotazioni in questo periodo">
            Bloccando {confirm.period} annulli queste prenotazioni:
            <ul className="mt-1 list-disc pl-5">
              {confirm.bookings.map((booking) => (
                <li key={booking}>{booking}</li>
              ))}
            </ul>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              name="confirmedIds"
              value={confirm.ids.join(",")}
              pending={pending}
              pendingLabel="Salvataggio…"
            >
              {confirm.ids.length === 1
                ? "Blocca e annulla 1 prenotazione"
                : `Blocca e annulla ${confirm.ids.length} prenotazioni`}
            </Button>
            <Button variant="secondary" onClick={() => setDismissed(key)}>
              Non bloccare
            </Button>
          </div>
        </div>
      ) : (
        <>
          <FormFeedback state={state?.confirm ? undefined : state} />
          <Button type="submit" pending={pending} pendingLabel="Salvataggio…">
            Blocca
          </Button>
        </>
      )}
    </form>
  );
}

export function RemoveBlockButton({
  id,
  label,
}: {
  id: number;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(removeBlockAction, undefined);

  if (!confirming) {
    return (
      <Button
        variant="text"
        className="self-start px-0"
        onClick={() => setConfirming(true)}
      >
        Rimuovi il blocco di {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <p>
        Gli orari tornano prenotabili. Le prenotazioni annullate restano
        annullate.
      </p>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="danger"
          pending={pending}
          pendingLabel="Rimozione…"
        >
          Sì, rimuovi
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          No, tienilo
        </Button>
      </div>
    </form>
  );
}
