import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Seitenzahlen mit Auslassungen, z. B. 1 … 4 5 6 … 20 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const itemClass =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm tabular-nums transition-colors duration-fast";

/**
 * Pagination als echte Links (funktioniert ohne JavaScript, crawlbar).
 * `hrefFor` baut die URL für eine Seite.
 */
export function Pagination({
  page,
  pages,
  hrefFor,
  className,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  const t = useTranslations("common");
  if (pages <= 1) return null;

  return (
    <nav aria-label={t("pagination")} className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(itemClass, "gap-1 text-ink hover:bg-hover")} aria-label={t("previousPage")}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Link>
      ) : (
        <span className={cn(itemClass, "gap-1 text-ink-faint")} aria-hidden>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </span>
      )}

      {pageWindow(page, pages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={cn(itemClass, "px-1 text-ink-faint")} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-label={t("pageN", { page: p })}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              itemClass,
              p === page ? "bg-violet-soft font-semibold text-violet-bright" : "text-ink-muted hover:bg-hover hover:text-ink"
            )}
          >
            {p}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(itemClass, "gap-1 text-ink hover:bg-hover")} aria-label={t("nextPage")}>
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(itemClass, "gap-1 text-ink-faint")} aria-hidden>
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
