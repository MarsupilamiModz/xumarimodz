import { cn } from "@/lib/utils";

/**
 * Seitenkopf für Konto-, Studio- und öffentliche Seiten (ACP: AdminPageHeader).
 * Titel, Unterzeile, Aktionen rechts (höchstens ein Primär-Button).
 * `level="h2"`, wenn das Layout schon eine H1 setzt (Creator-/Partner-/Designer-Studio).
 */
export function PageHeader({
  title,
  description,
  actions,
  level = "h1",
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  level?: "h1" | "h2";
  className?: string;
}) {
  const Heading = level;
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <Heading className={level === "h1" ? "h1-acp" : "text-xl font-semibold text-ink"}>{title}</Heading>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Abschnitt in einer Karte: Titel (15/600), optionale Unterzeile und Aktion, Inhalt darunter. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-raised p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
