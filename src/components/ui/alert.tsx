import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type AlertTone = "info" | "success" | "warning" | "error";

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<AlertTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-success-200 bg-success-50 text-success-800",
  warning: "border-warning-200 bg-warning-50 text-warning-800",
  error: "border-error-200 bg-error-50 text-error-800",
};

/** Avvisi ed errori interrompono lo screen reader; informazioni e successi no. */
const toneRole: Record<AlertTone, "alert" | "status"> = {
  info: "status",
  success: "status",
  warning: "alert",
  error: "alert",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: AlertProps) {
  return (
    <div
      role={toneRole[tone]}
      className={cx(
        "rounded-control border p-4 text-base",
        toneClasses[tone],
        className,
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
