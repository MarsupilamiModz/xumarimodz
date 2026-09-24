import { FileText } from "lucide-react";

/** Lesefreundliches Layout für Rechtstexte. Inhalte kommen unverändert als children. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="page-section">
      <div className="max-w-[720px]">
        <h1 className="h1-display">{title}</h1>
        <div className="legal-body mt-8">{children}</div>
      </div>
    </article>
  );
}

/** Klar markierter Platzhalter, solange ein Rechtstext fehlt. */
export function LegalPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-lg border border-dashed border-line-control bg-raised p-6">
      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{text}</p>
      </div>
    </div>
  );
}
