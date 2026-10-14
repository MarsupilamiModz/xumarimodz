import { Wallet } from "lucide-react";
import type { PayoutStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserCommissionSummary } from "@/lib/analytics/ecosystem";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatDate } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const PAYOUT_TONE: Record<PayoutStatus, StatusTone> = {
  PENDING: "pending",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export default async function CreatorPayoutsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tp = await getTranslations("creatorPages.payouts");
  const user = await requireAuth();
  const summary = await getUserCommissionSummary(user.id).catch(() => ({
    pendingCents: 0,
    pendingCount: 0,
    paidCents: 0,
    paidCount: 0,
    payouts: [],
  }));

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
            {
              key: "amount",
              header: tp("colAmount"),
              width: "minmax(0,1fr)",
              align: "right",
              cell: (p) => <span className="font-medium">{formatMoneyFromCents(p.amountCents, locale)}</span>,
            },
            {
              key: "method",
              header: tp("colMethod"),
              width: "minmax(0,1fr)",
              hideOnMobile: true,
              cell: (p) => <span className="block truncate text-ink-muted">{p.method ?? "—"}</span>,
            },
            {
              key: "status",
              header: tp("colStatus"),
              width: "150px",
              cell: (p) => <StatusBadge tone={PAYOUT_TONE[p.status]} label={tp(`status.${p.status}`)} />,
            },
          ]}
        />
      </section>
    </div>
  );
}
