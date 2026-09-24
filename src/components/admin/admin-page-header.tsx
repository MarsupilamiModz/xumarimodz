import Link from "next/link";
import { getLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";

/**
 * Kopfbereich für ACP-Seiten: Breadcrumb „ACP / Bereich“, H1 (28/36 700), Unterzeile, Aktionen rechts.
 * `section` ist der Breadcrumb-Eintrag (Standard: Titel); `parent` fügt eine Zwischenebene ein.
 */
export async function AdminPageHeader({
  title,
  description,
  actions,
  section,
  parent,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  section?: string;
  parent?: { label: string; href: string };
}) {
  const locale = await getLocale();
  return (
    <div className="mb-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-faint">
          <li>
            <Link href={`/${locale}/admin`} className="hover:text-ink">
              ACP
            </Link>
          </li>
          {parent && (
            <>
              <li aria-hidden className="flex"><ChevronRight className="h-3 w-3" /></li>
              <li>
                <Link href={parent.href} className="hover:text-ink">
                  {parent.label}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden className="flex"><ChevronRight className="h-3 w-3" /></li>
          <li aria-current="page" className="text-ink-muted">
            {section ?? title}
          </li>
        </ol>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="h1-acp">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
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
