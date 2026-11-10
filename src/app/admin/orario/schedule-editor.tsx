"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { OpeningInterval, Weekday, WeeklySchedule } from "@/domain/types";
import { saveScheduleAction } from "../actions";
import { FormFeedback } from "../form-feedback";

const DAYS: Array<[Weekday, string]> = [
  [1, "Lunedì"],
  [2, "Martedì"],
  [3, "Mercoledì"],
  [4, "Giovedì"],
  [5, "Venerdì"],
  [6, "Sabato"],
  [7, "Domenica"],
];

export function ScheduleEditor({
  initial,
  timeOptions,
}: {
  initial: WeeklySchedule;
  timeOptions: string[];
}) {
  const [schedule, setSchedule] = useState(initial);
  const [state, action, pending] = useActionState(
    saveScheduleAction,
    undefined,
  );

  const update = (day: Weekday, intervals: OpeningInterval[]) =>
    setSchedule((current) => ({ ...current, [day]: intervals }));

  const serialized = JSON.stringify(
    DAYS.flatMap(([day]) =>
      schedule[day].map((interval) => ({ weekday: day, ...interval })),
    ),
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="schedule" value={serialized} />
      {DAYS.map(([day, name]) => (
        <fieldset
          key={day}
          className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card"
        >
          <legend className="sr-only">{name}</legend>
          <p className="text-lg font-semibold" aria-hidden>
            {name}
          </p>
          {schedule[day].length === 0 && (
            <p className="text-text-muted">Chiuso</p>
          )}
          {schedule[day].map((interval, index) => (
            <div key={index} className="flex items-end gap-2">
              <SelectField
                label={`${name}, apertura ${index + 1}`}
                options={timeOptions}
                value={interval.opens}
                onChange={(event) =>
                  update(
                    day,
                    schedule[day].map((item, i) =>
                      i === index
                        ? { ...item, opens: event.target.value }
                        : item,
                    ),
                  )
                }
                className="flex-1"
              />
              <SelectField
                label={`${name}, chiusura ${index + 1}`}
                options={timeOptions}
                value={interval.closes}
                onChange={(event) =>
                  update(
                    day,
                    schedule[day].map((item, i) =>
                      i === index
                        ? { ...item, closes: event.target.value }
                        : item,
                    ),
                  )
                }
                className="flex-1"
              />
              <Button
                variant="text"
                aria-label={`Rimuovi l'intervallo ${index + 1} di ${name}`}
                onClick={() =>
                  update(
                    day,
                    schedule[day].filter((_, i) => i !== index),
                  )
                }
              >
                Rimuovi
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-x-4">
            <Button
              variant="text"
              className="px-0"
              onClick={() =>
                update(day, [
                  ...schedule[day],
                  { opens: "09:00", closes: "23:00" },
                ])
              }
            >
              Aggiungi intervallo
            </Button>
            <Button
              variant="text"
              className="px-0"
              onClick={() =>
                setSchedule(
                  Object.fromEntries(
                    DAYS.map(([other]) => [
                      other,
                      schedule[day].map((item) => ({ ...item })),
                    ]),
                  ) as WeeklySchedule,
                )
              }
            >
              Copia su tutti i giorni
            </Button>
          </div>
        </fieldset>
      ))}
      <FormFeedback state={state} />
      <Button
        type="submit"
        fullWidth
        pending={pending}
        pendingLabel="Salvataggio in corso…"
      >
        Salva l&apos;orario
      </Button>
    </form>
  );
}
