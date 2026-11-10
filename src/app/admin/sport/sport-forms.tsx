"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createSportAction, updateSportAction } from "../actions";
import { FormFeedback } from "../form-feedback";

type Sport = { id: string; name: string; active: boolean; sort_order: number };

export function SportRowForm({ sport }: { sport: Sport }) {
  const [state, action, pending] = useActionState(updateSportAction, undefined);
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card"
    >
      <input type="hidden" name="id" value={sport.id} />
      <TextField
        label="Nome"
        name="name"
        defaultValue={sport.name}
        required
        maxLength={60}
      />
      <TextField
        label="Ordine nell'elenco"
        name="sortOrder"
        type="number"
        inputMode="numeric"
        min={0}
        max={999}
        defaultValue={String(sport.sort_order)}
      />
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          name="active"
          defaultChecked={sport.active}
          className="size-5 accent-blue-700"
        />
        Prenotabile
      </label>
      <FormFeedback state={state} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel="Salvataggio…"
        >
          Salva {sport.name}
        </Button>
        <Link
          href={`/admin/prezzi/${sport.id}`}
          className="font-semibold text-primary hover:underline"
        >
          Prezzi di {sport.name}
        </Link>
      </div>
    </form>
  );
}

export function NewSportForm() {
  const [state, action, pending] = useActionState(createSportAction, undefined);
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card"
    >
      <TextField
        label="Nuovo sport"
        hint="Il nome si potrà cambiare; lo sport si può disattivare ma non cancellare."
        name="name"
        required
        maxLength={60}
      />
      <FormFeedback state={state} />
      <Button type="submit" pending={pending} pendingLabel="Aggiunta in corso…">
        Aggiungi sport
      </Button>
    </form>
  );
}
