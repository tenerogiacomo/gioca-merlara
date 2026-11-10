import { useId, type SelectHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  options: readonly string[];
};

/** Elenco a discesa con etichetta sopra, stesso aspetto dei campi (DESIGN.md §7). */
export function SelectField({
  label,
  options,
  className,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-base leading-tight font-semibold">
        {label}
      </label>
      <select
        {...props}
        id={id}
        className="min-h-11 rounded-control border border-field-border bg-surface px-3 text-base focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
