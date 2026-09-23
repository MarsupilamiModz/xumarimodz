import { AlertTriangle, CheckCircle2, Circle, Clock, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "pending" | "neutral";

const toneStyles: Record<StatusTone, { className: string; icon: LucideIcon }> = {
  success: { className: "bg-success-soft text-success", icon: CheckCircle2 },
  warning: { className: "bg-warning-soft text-warning", icon: AlertTriangle },
  danger: { className: "bg-danger-soft text-danger", icon: XCircle },
  info: { className: "bg-violet-soft text-violet-bright", icon: Info },
  pending: { className: "bg-elevated text-ink-muted", icon: Clock },
  neutral: { className: "bg-elevated text-ink-muted", icon: Circle },
};

/**
 * Status immer mit Wort und Icon – nie nur über Farbe.
 * `label` ist der übersetzte Statustext.
 */
export function StatusBadge({
  tone,
  label,
  icon,
  className,
}: {
  tone: StatusTone;
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const style = toneStyles[tone];
  const Icon = icon ?? style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold leading-5",
        style.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
