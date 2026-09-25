import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuro, formatNumber } from "@/lib/format-locale";

export type PublisherRow = {
  id: string;
  name: string;
  username: string;
  slug: string;
  code: string | null;
  isVerified: boolean;
  isPublic: boolean;
  isSuspended: boolean;
  shareBps: number;
  overridden: boolean;
  revenueCents: number;
  openCents: number;
  conversions?: number;
};

/** Gemeinsame Tabelle für Creator- und Partner-Profile (ACP). */
export async function PublisherTable({ rows, locale, basePath, kind }: { rows: PublisherRow[]; locale: string; basePath: string; kind: "creator" | "partner" }) {
  const t = await getTranslations("admin.pc");
  return (
    <DataTable
      caption={kind === "creator" ? t("creators") : t("partners")}
      rows={rows}
      rowKey={(r) => r.id}
      rowHref={(r) => `${basePath}/${r.id}`}
      empty={<EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyText")} />}
      columns={[
        {
          key: "name",
          header: t("colName"),
          width: "minmax(0,1.8fr)",
          cell: (r) => (
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{r.name}</span>
              <span className="block truncate text-xs text-ink-faint">
                @{r.username} · /{r.slug}
                {r.code ? ` · ${r.code}` : ""}
              </span>
            </span>
          ),
        },
        {
          key: "level",
          header: t("colLevel"),
          width: "140px",
          hideOnMobile: true,
          cell: (r) => <StatusBadge tone={r.isVerified ? "success" : "neutral"} label={r.isVerified ? t("verified") : t("unverified")} />,
        },
        {
          key: "share",
          header: t("colShare"),
          width: "110px",
          align: "right",
          hideOnMobile: true,
          cell: (r) => (
            <span className="tabular-nums">
              {(r.shareBps / 100).toLocaleString(locale)} %{r.overridden && <span className="meta ml-1">({t("override")})</span>}
            </span>
          ),
        },
        ...(kind === "partner"
          ? [{ key: "conv", header: t("colConversions"), width: "100px", align: "right" as const, hideOnMobile: true, cell: (r: PublisherRow) => formatNumber(r.conversions ?? 0, locale) }]
          : []),
        { key: "revenue", header: t("colRevenue"), width: "110px", align: "right", hideOnMobile: true, cell: (r) => formatEuro(r.revenueCents, locale) },
        { key: "open", header: t("colOpen"), width: "110px", align: "right", cell: (r) => <span className={r.openCents > 0 ? "text-ink" : "text-ink-faint"}>{formatEuro(r.openCents, locale)}</span> },
        {
          key: "status",
          header: t("colStatus"),
          width: "120px",
          hideOnMobile: true,
          cell: (r) =>
            r.isSuspended ? (
              <StatusBadge tone="danger" label={t("suspended")} />
            ) : r.isPublic ? (
              <StatusBadge tone="success" label={t("public")} />
            ) : (
              <StatusBadge tone="neutral" label={t("hidden")} />
            ),
        },
        {
          key: "manage",
          header: "",
          width: "90px",
          align: "right",
          cell: (r) => (
            <Link href={`${basePath}/${r.id}`} className="relative text-xs font-semibold text-violet-bright">
              {t("manage")}
            </Link>
          ),
        },
      ]}
    />
  );
}
