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
        "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-base leading-tight font-semibold",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
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
