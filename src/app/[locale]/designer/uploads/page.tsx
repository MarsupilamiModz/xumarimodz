import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDesignerDashboard } from "@/actions/designer";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const MOD_TONE: Record<string, StatusTone> = {
  PUBLISHED: "success",
  PENDING: "pending",
  REJECTED: "danger",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
};

export default async function DesignerUploadsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const [t, tp, tMod, tEmpty] = await Promise.all([
    getTranslations("designer"),
    getTranslations("partnerPages.designerUploads"),
    getTranslations("status.mod"),
    getTranslations("partnerPages.designerOverview"),
  ]);
  const result = await getDesignerDashboard();
  const uploads = result.success ? result.data.uploads : [];
  const newHref = `/${locale}/designer/new`;

  return (
    <div>
      <PageHeader
        title={t("uploads")}
        description={tp("description")}
        actions={
          <Button size="sm" asChild>
            <Link href={newHref}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("newAsset")}
            </Link>
          </Button>
        }
      />
      <DataTable
        caption={t("uploads")}
        rows={uploads}
        rowKey={(m) => m.id}
        rowHref={(m) => `/${locale}/designer/assets/${m.id}`}
        empty={<EmptyState icon={Package} title={tEmpty("emptyUploadsTitle")} description={t("emptyUploads")} />}
        columns={[
          {
            key: "asset",
            header: tp("colAsset"),
            width: "minmax(0,2fr)",
            cell: (m) => <span className="block truncate font-medium text-ink">{m.title}</span>,
          },
          { key: "game", header: tp("colGame"), hideOnMobile: true, cell: (m) => <span className="block truncate text-ink-muted">{m.game.name}</span> },
          { key: "downloads", header: tp("colDownloads"), width: "100px", align: "right", hideOnMobile: true, cell: (m) => formatNumber(m._count.downloads, locale) },
          { key: "versions", header: tp("colVersions"), width: "90px", align: "right", hideOnMobile: true, cell: (m) => formatNumber(m._count.versions, locale) },
          { key: "status", header: tp("colStatus"), width: "150px", cell: (m) => <StatusBadge tone={MOD_TONE[m.status] ?? "neutral"} label={tMod(m.status)} /> },
          {
            key: "updated",
            header: tp("colUpdated"),
            width: "110px",
            hideOnMobile: true,
            cell: (m) => <span className="tabular-nums text-ink-muted">{formatDate(m.updatedAt, locale)}</span>,
          },
        ]}
      />
    </div>
  );
}
