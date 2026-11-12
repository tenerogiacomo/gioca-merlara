import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type ButtonVariant = "primary" | "secondary" | "text" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Azione in corso: il pulsante si disabilita e mostra `pendingLabel`. */
  pending?: boolean;
  pendingLabel?: string;
  /** Occupa tutta la larghezza (azione principale di un form su smartphone). */
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-card hover:bg-primary-strong active:bg-primary-strong",
  secondary:
    "border border-primary bg-surface text-primary hover:bg-blue-50 active:bg-blue-50",
  text: "text-primary hover:underline",
  danger:
    "bg-error-600 text-white shadow-card hover:bg-error-700 active:bg-error-700",
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-base leading-tight font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Link isolato (fuori da una frase): testo blu, area toccabile di 44 px (DESIGN.md §4). */
export const linkClassName =
  "inline-flex min-h-11 items-center font-semibold text-primary hover:underline";

/** Classi del pulsante, per dare lo stesso aspetto a un link (es. `<Link>` di Next.js). */
export function buttonClassName({
  variant = "primary",
  fullWidth = false,
}: { variant?: ButtonVariant; fullWidth?: boolean } = {}): string {
  return cx(baseClasses, variantClasses[variant], fullWidth && "w-full");
}

export function Button({
  variant = "primary",
  pending = false,
  pendingLabel,
  fullWidth = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cx(
        baseClasses,
        "disabled:border-transparent disabled:bg-neutral-200 disabled:text-neutral-500 disabled:no-underline disabled:shadow-none",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
