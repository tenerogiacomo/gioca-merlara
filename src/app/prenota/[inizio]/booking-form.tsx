"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { bookAction } from "../actions";

export type SportOption = {
  id: string;
  name: string;
  durations: Array<{ slotCount: number; label: string; price: string }>;
};

export function BookingForm({
  startsAt,
  options,
  autocert,
}: {
  startsAt: string;
  options: SportOption[];
  autocert: { title: string; paragraphs: string[] };
}) {
  const [state, action, pending] = useActionState(bookAction, undefined);
  const [sportId, setSportId] = useState(options[0]?.id ?? "");
  const [slotCount, setSlotCount] = useState(1);
  const sport = options.find((option) => option.id === sportId);
  const duration = sport?.durations.find(
    (item) => item.slotCount === slotCount,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="startsAt" value={startsAt} />
      {/* Valori scelti inviati da campi nascosti: dopo un invio rifiutato React azzera il modulo,
          e i pulsanti di scelta tornerebbero vuoti. */}
      <input type="hidden" name="sportId" value={sportId} />
      <input type="hidden" name="slotCount" value={slotCount} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-semibold">Sport</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={cx(
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control border p-3",
              option.id === sportId
                ? "border-primary bg-accent-soft"
                : "border-field-border bg-surface",
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                value={option.id}
                checked={option.id === sportId}
                onChange={() => {
                  setSportId(option.id);
                  setSlotCount(1);
                }}
                className="size-5 accent-blue-700"
              />
              {option.name}
            </span>
            <span className="text-sm text-text-muted">
              da {option.durations[0].price}
            </span>
          </label>
        ))}
      </fieldset>

      {sport && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-semibold">Durata</legend>
          {sport.durations.map((item) => (
            <label
              key={item.slotCount}
              className={cx(
                "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control border p-3",
                item.slotCount === slotCount
                  ? "border-primary bg-accent-soft"
                  : "border-field-border bg-surface",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  value={item.slotCount}
                  checked={item.slotCount === slotCount}
                  onChange={() => setSlotCount(item.slotCount)}
                  className="size-5 accent-blue-700"
                />
                {item.label}
              </span>
              <span className="font-semibold">{item.price}</span>
            </label>
          ))}
        </fieldset>
      )}

      <section className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-xl font-semibold">{autocert.title}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base">
          {autocert.paragraphs.map((paragraph) => (
            <li key={paragraph}>{paragraph}</li>
          ))}
        </ol>
        <label className="mt-2 flex min-h-11 items-center gap-3 font-semibold">
          <input
            type="checkbox"
            name="autocert"
            className="size-5 accent-blue-700"
          />
          Ho letto e accetto l&apos;autocertificazione
        </label>
      </section>

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Button
        type="submit"
        fullWidth
        pending={pending}
        pendingLabel="Prenotazione in corso…"
      >
        {duration ? `Prenota · ${duration.price}` : "Prenota"}
      </Button>
      <p className="text-sm text-text-muted">
        Il pagamento online arriverà più avanti: per ora la prenotazione è
        confermata subito.
      </p>
    </form>
  );
}
