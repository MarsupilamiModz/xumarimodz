import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Spaltenbreite im CSS-Grid, z. B. "minmax(0,2fr)" oder "120px". */
  width?: string;
  /** Wenn gesetzt, ist die Spalte über die URL sortierbar. */
  sortKey?: string;
  align?: "left" | "right";
  /** Auf kleinen Bildschirmen ausblenden. */
  hideOnMobile?: boolean;
};

/**
 * Datentabelle als Grid-Zeilen (Kopf 12px grau, Zeilen 13px, Hover-Fläche, Auswahl hinterlegt).
 * Sortierung serverseitig über `sortHref` (Links statt Client-State). Leerzustand über `empty`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  selectedKey,
  sort,
  sortHref,
  empty,
  caption,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  selectedKey?: string;
  sort?: { key: string; dir: "asc" | "desc" };
  sortHref?: (key: string, dir: "asc" | "desc") => string;
  empty?: React.ReactNode;
  caption: string;
}) {
  const template = columns.map((c) => c.width ?? "minmax(0,1fr)").join(" ");
  const mobileTemplate = columns.filter((c) => !c.hideOnMobile).map((c) => c.width ?? "minmax(0,1fr)").join(" ");
  const gridStyle = { "--cols": template, "--cols-sm": mobileTemplate } as React.CSSProperties;
  const gridClass = "grid items-center gap-3 px-4 [grid-template-columns:var(--cols-sm)] md:[grid-template-columns:var(--cols)]";

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div role="table" aria-label={caption} className="overflow-hidden rounded-lg border border-line bg-raised" style={gridStyle}>
      <div role="rowgroup">
        <div role="row" className={cn(gridClass, "h-9 border-b border-line text-xs font-medium text-ink-faint")}>
          {columns.map((c) => {
            // Ohne Sortierung bzw. ohne sortKey ist keine Spalte aktiv (sonst undefined === undefined).
            const activeDir = sort && c.sortKey && sort.key === c.sortKey ? sort.dir : null;
            const active = activeDir !== null;
            const nextDir = activeDir === "desc" ? "asc" : "desc";
            return (
              <div
                key={c.key}
                role="columnheader"
                aria-sort={active ? (activeDir === "asc" ? "ascending" : "descending") : undefined}
                className={cn(c.align === "right" && "text-right", c.hideOnMobile && "hidden md:block")}
              >
                {c.sortKey && sortHref ? (
                  <Link href={sortHref(c.sortKey, nextDir)} className="inline-flex items-center gap-1 hover:text-ink">
                    {c.header}
                    {active && (activeDir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                  </Link>
                ) : (
                  c.header
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((row) => {
          const key = rowKey(row);
          const href = rowHref?.(row);
          const selected = key === selectedKey;
          return (
            <div
              key={key}
              role="row"
              aria-selected={selectedKey !== undefined ? selected : undefined}
              className={cn(
                gridClass,
                "relative min-h-12 border-b border-line py-2 text-[13px] text-ink transition-colors duration-fast last:border-b-0",
                selected ? "bg-violet-soft" : "hover:bg-row-hover"
              )}
            >
              {columns.map((c, i) => (
                <div
                  key={c.key}
                  role="cell"
                  className={cn("min-w-0", c.align === "right" && "text-right tabular-nums", c.hideOnMobile && "hidden md:block")}
                >
                  {i === 0 && href ? (
                    <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:shadow-[inset_0_0_0_2px_rgb(var(--violet-bright))]">
                      {c.cell(row)}
                    </Link>
                  ) : (
                    c.cell(row)
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
