"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { resendCodeAction, verifyCodeAction } from "../actions";

const RESEND_AFTER_SECONDS = 60;

export function CodeForm({
  next,
  maskedPhone,
}: {
  next: string;
  maskedPhone: string;
}) {
  const [state, verify, verifying] = useActionState(
    verifyCodeAction,
    undefined,
  );
  const [resendState, resend, resending] = useActionState(
    resendCodeAction,
    undefined,
  );
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted">
        Abbiamo inviato un SMS al numero {maskedPhone}.
      </p>
      <form action={verify} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Codice di 6 cifre"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          error={state?.error}
        />
        <Button
          type="submit"
          fullWidth
          pending={verifying}
          pendingLabel="Verifica in corso…"
        >
          Accedi
        </Button>
      </form>

      {resendState?.notice && (
        <Alert tone="success">{resendState.notice}</Alert>
      )}
      {resendState?.error && <Alert tone="error">{resendState.error}</Alert>}

      <div className="flex flex-col items-start gap-1">
        <form action={resend}>
          <Button
            type="submit"
            variant="text"
            className="px-0"
            disabled={secondsLeft > 0}
            pending={resending}
            pendingLabel="Invio in corso…"
          >
            {secondsLeft > 0
              ? `Invia un nuovo codice tra ${secondsLeft} s`
              : "Invia un nuovo codice"}
          </Button>
        </form>
        <Link href="/accedi" className="text-primary hover:underline">
          Cambia numero
        </Link>
      </div>
    </div>
  );
}
