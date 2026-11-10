import { Alert } from "@/components/ui/alert";
import type { AdminFormState } from "./actions";

/** Esito di un salvataggio: errori, conferma e avvisi. */
export function FormFeedback({ state }: { state: AdminFormState }) {
  if (!state) return null;
  return (
    <div className="flex flex-col gap-2">
      {state.errors?.map((message) => (
        <Alert key={message} tone="error">
          {message}
        </Alert>
      ))}
      {state.ok && <Alert tone="success">{state.ok}</Alert>}
      {state.warnings?.map((message) => (
        <Alert key={message} tone="warning" title="Attenzione">
          {message}
        </Alert>
      ))}
    </div>
  );
}
