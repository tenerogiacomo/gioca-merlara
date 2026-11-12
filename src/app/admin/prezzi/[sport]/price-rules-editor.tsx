"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { cx } from "@/lib/cx";
import { savePriceRulesAction } from "../../actions";
import { FormFeedback } from "../../form-feedback";

export type EditableRule = {
  weekdays: number[];
  from: string;
  to: string;
  price: string;
};

const DAYS: Array<[number, string, string]> = [
  [1, "L", "Lunedì"],
  [2, "M", "Martedì"],
  [3, "M", "Mercoledì"],
  [4, "G", "Giovedì"],
  [5, "V", "Venerdì"],
  [6, "S", "Sabato"],
  [7, "D", "Domenica"],
];

export function PriceRulesEditor({
  sportId,
  sportName,
  initial,
  timeOptions,
}: {
  sportId: string;
  sportName: string;
  initial: EditableRule[];
  timeOptions: string[];
}) {
  const [rules, setRules] = useState(initial);
  const [state, action, pending] = useActionState(
    savePriceRulesAction.bind(null, sportId),
    undefined,
  );

  const change = (index: number, patch: Partial<EditableRule>) =>
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />
      {rules.length === 0 && (
        <p className="text-text-muted">
          Nessuna fascia: {sportName} non è prenotabile.
        </p>
      )}
      {rules.map((rule, index) => (
        <fieldset
          key={index}
          className={cx(
            "flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card",
            state?.errorIndex === index && "ring-2 ring-error-600",
          )}
        >
          <legend className="sr-only">Fascia {index + 1}</legend>
          <p
            className="font-display text-xl font-semibold text-primary"
            aria-hidden
          >
            Fascia {index + 1}
          </p>
          <div
            role="group"
            aria-label={`Giorni della fascia ${index + 1}`}
            className="flex flex-wrap gap-1"
          >
            {DAYS.map(([day, letter, name]) => {
              const checked = rule.weekdays.includes(day);
              return (
                <label
                  key={day}
                  className={cx(
                    "flex size-11 cursor-pointer items-center justify-center rounded-full border text-base font-semibold",
                    checked
                      ? "border-primary bg-accent-soft text-primary"
                      : "border-field-border bg-surface text-text-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    aria-label={name}
                    checked={checked}
                    onChange={() =>
                      change(index, {
                        weekdays: checked
                          ? rule.weekdays.filter((d) => d !== day)
                          : [...rule.weekdays, day].sort(),
                      })
                    }
                  />
                  {letter}
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <SelectField
              label="Dalle"
              options={timeOptions}
              value={rule.from}
              onChange={(event) => change(index, { from: event.target.value })}
              className="flex-1"
            />
            <SelectField
              label="Alle"
              options={timeOptions}
              value={rule.to}
              onChange={(event) => change(index, { to: event.target.value })}
              className="flex-1"
            />
          </div>
          <TextField
            label={`Prezzo dello slot (fascia ${index + 1})`}
            hint="In euro per un'ora di struttura, es. 40 oppure 12,50; 0 per gratis."
            inputMode="decimal"
            value={rule.price}
            onChange={(event) => change(index, { price: event.target.value })}
          />
          <Button
            variant="text"
            className="self-start"
            onClick={() =>
              setRules((current) => current.filter((_, i) => i !== index))
            }
          >
            Rimuovi la fascia {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          setRules((current) => [
            ...current,
            {
              weekdays: [1, 2, 3, 4, 5],
              from: "09:00",
              to: "23:00",
              price: "",
            },
          ])
        }
      >
        Aggiungi fascia
      </Button>
      <FormFeedback state={state} />
      <Button
        type="submit"
        fullWidth
        pending={pending}
        pendingLabel="Salvataggio in corso…"
      >
        Salva i prezzi di {sportName}
      </Button>
    </form>
  );
}
