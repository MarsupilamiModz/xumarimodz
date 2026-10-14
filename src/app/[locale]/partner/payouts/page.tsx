import { requireAuth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet } from "lucide-react";
import { getUserCommissionSummary } from "@/lib/analytics/ecosystem";
import { PageHeader } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format-locale";
import { formatMoneyFromCents } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

const PAYOUT_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export default async function PartnerPayoutsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, tp] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("partnerPages.partnerPayouts"),
  ]);
  const user = await requireAuth();
  const summary = await getUserCommissionSummary(user.id);

  return (
    <div className="space-y-6">
      <PageHeader level="h2" title={t("payouts")} description={tp("description")} className="mb-0" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("pendingPayout")} value={formatMoneyFromCents(summary.pendingCents, locale)} />
        <KpiTile label={t("totalPaid")} value={formatMoneyFromCents(summary.paidCents, locale)} />
      </div>
      <section className="space-y-3">
        <h3 className="section-title">{t("payoutHistory")}</h3>
        <DataTable
          caption={t("payoutHistory")}
          rows={summary.payouts}
          rowKey={(p) => p.id}
          empty={<EmptyState icon={Wallet} title={t("noPayouts")} description={tp("emptyText")} />}
          columns={[
            {
              key: "date",
              header: tp("colDate"),
              width: "120px",
              cell: (p) => <span className="tabular-nums text-ink-muted">{formatDate(p.paidAt ?? p.createdAt, locale)}</span>,
            },
            { key: "amount", header: tp("colAmount"), width: "minmax(0,1fr)", align: "right", cell: (p) => formatMoneyFromCents(p.amountCents, locale) },
            { key: "method", header: tp("colMethod"), hideOnMobile: true, cell: (p) => <span className="text-ink-muted">{p.method ?? "—"}</span> },
            {
              key: "status",
              header: tp("colStatus"),
              width: "150px",
              cell: (p) => <StatusBadge tone={PAYOUT_TONE[p.status] ?? "neutral"} label={tp(`status.${p.status}`)} />,
            },
          ]}
        />
      </section>
    </div>
  );
}
