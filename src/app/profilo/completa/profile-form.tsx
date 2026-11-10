"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { saveProfileAction } from "./actions";

export function ProfileForm() {
  const [state, action, pending] = useActionState(saveProfileAction, undefined);
  const values = state?.values;
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <TextField
        label="Nome"
        name="firstName"
        autoComplete="given-name"
        required
        defaultValue={values?.firstName}
        error={errors?.firstName}
      />
      <TextField
        label="Cognome"
        name="lastName"
        autoComplete="family-name"
        required
        defaultValue={values?.lastName}
        error={errors?.lastName}
      />
      <TextField
        label="Data di nascita"
        name="birthDate"
        type="date"
        autoComplete="bday"
        required
        defaultValue={values?.birthDate}
        error={errors?.birthDate}
      />
      <TextField
        label="Codice fiscale"
        hint="16 caratteri, come sulla tessera sanitaria."
        name="taxCode"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={20}
        required
        defaultValue={values?.taxCode}
        error={errors?.taxCode}
      />
      <Button
        type="submit"
        fullWidth
        pending={pending}
        pendingLabel="Salvataggio in corso…"
      >
        Salva il profilo
      </Button>
    </form>
  );
}
