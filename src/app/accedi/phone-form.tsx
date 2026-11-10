"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { sendCodeAction } from "./actions";

export function PhoneForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendCodeAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Numero di cellulare"
        hint="Ti mandiamo un SMS con un codice di 6 cifre."
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        defaultValue={state?.phone}
        error={state?.error}
      />
      <Button
        type="submit"
        fullWidth
        pending={pending}
        pendingLabel="Invio in corso…"
      >
        Inviami il codice
      </Button>
    </form>
  );
}
