import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Gemeinsames Layout für 403, 404, Wartung und Fehlerseiten.
 * `actions`: höchstens ein Primär-Button, weitere als outline/ghost.
 */
export function ErrorScreen({
  icon: Icon,
  label,
  title,
  description,
  actions,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("page-container flex min-h-[60vh] items-center py-14 md:py-20", className)}>
      <div className="max-w-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-elevated text-ink-muted">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <p className="meta mt-6 font-semibold uppercase tracking-wide tabular-nums">{label}</p>
        <h1 className="h1-display mt-2">
          {title}
        </h1>
        <p className="mt-3 text-base text-ink-muted">{description}</p>
        {children}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
