"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "./actions";

export function CancelButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    cancelBookingAction,
    undefined,
  );

  if (!confirming) {
    return (
      <Button
        variant="text"
        className="self-start px-0"
        onClick={() => setConfirming(true)}
      >
        Annulla la prenotazione di {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <p>Vuoi davvero annullare? Se puoi, avvisa almeno 24 ore prima.</p>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="danger"
          pending={pending}
          pendingLabel="Annullamento…"
        >
          Sì, annulla
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          No, tienila
        </Button>
      </div>
    </form>
  );
}
