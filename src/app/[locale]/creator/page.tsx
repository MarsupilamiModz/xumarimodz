import Link from "next/link";
import { Package } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ModStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { getCreatorAnalytics, getUserCommissionSummary } from "@/lib/analytics/ecosystem";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatDate, formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const MOD_STATUS_TONE: Record<ModStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING: "pending",
  PUBLISHED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

export default async function CreatorPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tc = await getTranslations("creator");
  const tp = await getTranslations("creatorPages.overview");
  const ts = await getTranslations("status");
  const user = await requireAuth();

  const [mods, profile, analytics, commission] = await Promise.all([
    prisma.mod.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { game: true, _count: { select: { versions: true } } },
    }),
    prisma.creatorProfile.findUnique({ where: { userId: user.id } }),
    getCreatorAnalytics(user.id).catch(() => null),
    getUserCommissionSummary(user.id).catch(() => ({
      pendingCents: 0,
      pendingCount: 0,
      paidCents: 0,
      paidCount: 0,
      payouts: [],
    })),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader level="h2" title={t("overview")} description={tp("description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={tc("myMods")} value={formatNumber(mods.length, locale)} />
        <KpiTile label={t("downloads")} value={formatNumber(analytics?.totalDownloads ?? 0, locale)} />
        <KpiTile label={t("revenue")} value={formatMoneyFromCents(analytics?.purchaseRevenue ?? 0, locale)} />
        <KpiTile label={t("pendingPayout")} value={formatMoneyFromCents(commission.pendingCents, locale)} />
      </div>

      {profile?.creatorCode && (
        <SectionCard
          title={t("creatorCode")}
          description={tp("codeHint")}
          action={<CopyButton value={profile.creatorCode} label={t("copy")} copiedLabel={t("copied")} />}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="mono-id text-lg text-ink">{profile.creatorCode}</span>
            {profile.isVerified && <StatusBadge tone="success" label={t("verified")} />}
          </div>
        </SectionCard>
      )}

      <section className="space-y-3">
        <h3 className="section-title">{tc("myMods")}</h3>
        <DataTable
          caption={tc("myMods")}
          rows={mods}
          rowKey={(m) => m.id}
          rowHref={(m) => `/${locale}/creator/mods/${m.id}`}
          empty={
            <EmptyState
              icon={Package}
              title={t("noMods")}
              description={tp("emptyText")}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/creator/mods/new`}>{tc("createMod")}</Link>
                </Button>
              }
            />
          }
          columns={[
            {
              key: "mod",
              header: tp("colMod"),
              width: "minmax(0,2fr)",
              cell: (m) => (
                <span className="block min-w-0">
                  <span className="block truncate font-medium text-ink">{m.title}</span>
                  <span className="block truncate text-xs text-ink-faint">{m.game.name}</span>
                </span>
              ),
            },
            {
              key: "versions",
              header: tp("colVersions"),
              width: "100px",
              align: "right",
              hideOnMobile: true,
              cell: (m) => formatNumber(m._count.versions, locale),
            },
            {
              key: "downloads",
              header: tp("colDownloads"),
              width: "110px",
              align: "right",
              hideOnMobile: true,
              cell: (m) => formatNumber(m.downloadCount, locale),
            },
            {
              key: "updated",
              header: tp("colUpdated"),
              width: "110px",
              hideOnMobile: true,
              cell: (m) => <span className="text-ink-muted tabular-nums">{formatDate(m.updatedAt, locale)}</span>,
            },
            {
              key: "status",
              header: tp("colStatus"),
              width: "140px",
              cell: (m) => <StatusBadge tone={MOD_STATUS_TONE[m.status]} label={ts(`mod.${m.status}`)} />,
            },
          ]}
        />
      </section>
    </div>
  );
}
