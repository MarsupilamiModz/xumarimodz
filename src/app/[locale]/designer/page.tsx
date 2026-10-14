import Link from "next/link";
import { ClipboardList, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDesignerDashboard } from "@/actions/designer";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format-locale";
import { formatMoneyFromCents } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

const MOD_TONE: Record<string, StatusTone> = {
  PUBLISHED: "success",
  PENDING: "pending",
  REJECTED: "danger",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
};

function orderTone(status: string): StatusTone {
  if (status === "COMPLETED" || status === "DELIVERED") return "success";
  if (status === "CANCELED" || status === "REFUNDED") return "neutral";
  if (["PENDING", "PAID", "QUOTED", "IN_REVIEW", "ACCEPTED"].includes(status)) return "warning";
  return "pending";
}

export default async function DesignerOverviewPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const [t, tp, tMod, tOrder] = await Promise.all([
    getTranslations("designer"),
    getTranslations("partnerPages.designerOverview"),
    getTranslations("status.mod"),
    getTranslations("partnerPages.orderStatus"),
  ]);
  const result = await getDesignerDashboard();
  const data = result.success
    ? result.data
    : { uploads: [], orders: [], totalEarnings: 0, totalDownloads: 0, profile: null };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} className="mb-0" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("totalDownloads")} value={formatNumber(data.totalDownloads, locale)} />
        <KpiTile label={t("totalEarnings")} value={formatMoneyFromCents(Math.round(data.totalEarnings * 100), locale)} />
        <KpiTile
          label={t("openOrders")}
          value={formatNumber(data.orders.filter((o) => o.status !== "COMPLETED").length, locale)}
        />
        <KpiTile label={t("uploads")} value={formatNumber(data.uploads.length, locale)} href={`/${locale}/designer/uploads`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("uploads")}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/designer/uploads`}>{tp("viewAll")}</Link>
            </Button>
          }
        >
          {data.uploads.length === 0 ? (
            <EmptyState icon={Package} title={tp("emptyUploadsTitle")} description={t("emptyUploads")} />
          ) : (
            <ul className="divide-y divide-line">
              {data.uploads.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/${locale}/designer/assets/${m.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm text-ink hover:text-violet-bright"
                  >
                    <span className="line-clamp-1">{m.title}</span>
                    <StatusBadge tone={MOD_TONE[m.status] ?? "neutral"} label={tMod(m.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("orders")}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/designer/orders`}>{tp("viewAll")}</Link>
            </Button>
          }
        >
          {data.orders.length === 0 ? (
            <EmptyState icon={ClipboardList} title={tp("emptyOrdersTitle")} description={t("emptyOrders")} />
          ) : (
            <ul className="divide-y divide-line">
              {data.orders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/${locale}/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm text-ink hover:text-violet-bright"
                  >
                    <span className="line-clamp-1">{o.title}</span>
                    <StatusBadge tone={orderTone(o.status)} label={tOrder(o.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
