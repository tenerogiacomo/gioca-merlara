import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  /** Cosa è successo e cosa fare (DESIGN.md §7). */
  error?: string;
};

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-base leading-tight font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "min-h-11 rounded-control border bg-surface px-3 text-base",
          "focus:outline-2 focus:outline-offset-0 focus:outline-primary",
          error
            ? "border-error-600 focus:border-error-600"
            : "border-field-border focus:border-primary",
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
