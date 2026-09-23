import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Leerer Zustand für Listen, Suchergebnisse, Warenkorb usw.
 * Höchstens eine Aktion übergeben (ein Primär-Button pro Bereich).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-elevated text-ink-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
