/** Einheitliche Kopfzeile für ACP-Seiten (H1 28px bold). */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="h1-acp">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Fehlerhinweis, wenn Daten für einen ACP-Bereich nicht geladen werden konnten. */
export function AdminLoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}
