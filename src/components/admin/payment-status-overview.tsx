"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { testStripeConnection } from "@/actions/admin/payments";
import type { PaymentSettings } from "@/lib/payments/settings";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format-locale";

type Transaction = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  type: string;
  created: number;
};

// Status einer Stripe-Checkout-Session → Ton des StatusBadge.
const SESSION_TONE: Record<string, StatusTone> = { complete: "success", open: "pending", expired: "neutral" };

export function PaymentStatusOverview({
  settings,
  transactions,
  locale = "en",
  compact = false,
}: {
  settings: PaymentSettings;
  transactions: Transaction[];
  locale?: string;
  compact?: boolean;
}) {
  const t = useTranslations("admin.ui.paymentStatus");
  const tp = useTranslations("admin.panelPaymentStatus");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  const stripeReady = settings.stripeSecretKeySet && settings.stripeWebhookSecretSet;
  const activeProvider = stripeReady ? "Stripe" : t("notConfigured");

  // Stripe liefert Beträge in der Währung der Session (kleinste Einheit).
  const formatAmount = (tx: Transaction) => {
    if (tx.amount == null) return "—";
    const currency = tx.currency?.toUpperCase() ?? "";
    return currency === "EUR" ? formatEuro(tx.amount, locale) : `${formatNumber(tx.amount / 100, locale)} ${currency}`.trim();
  };

  const columns: DataColumn<Transaction>[] = [
    { key: "id", header: tp("colSession"), width: "minmax(0,2fr)", cell: (tx) => <span className="mono-id">{tx.id.slice(0, 24)}…</span> },
    {
      key: "type",
      header: tp("colType"),
      hideOnMobile: true,
      cell: (tx) => <span className="text-ink-muted">{tx.type === "unknown" ? tp("typeUnknown") : tx.type}</span>,
    },
    { key: "amount", header: tp("colAmount"), align: "right", cell: formatAmount },
    {
      key: "status",
      header: tp("colStatus"),
      cell: (tx) =>
        tx.status && SESSION_TONE[tx.status] ? (
          <StatusBadge tone={SESSION_TONE[tx.status]!} label={tp(`sessionStatus.${tx.status}`)} />
        ) : (
          <StatusBadge tone="neutral" label={tx.status ?? "—"} />
        ),
    },
    {
      key: "created",
      header: tp("colCreated"),
      hideOnMobile: true,
      cell: (tx) => <span className="meta tabular-nums">{formatDateTime(tx.created * 1000, locale)}</span>,
    },
  ];

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <SectionCard
        title={t("heading")}
        description={t("hint")}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await testStripeConnection();
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("testStripeConnection")}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile label={t("activeProvider")} value={activeProvider} ok={stripeReady} />
          <StatusTile label={t("stripeSecret")} value={settings.stripeSecretKeySet ? t("configured") : t("missing")} ok={settings.stripeSecretKeySet} />
          <StatusTile label={t("webhookSecret")} value={settings.stripeWebhookSecretSet ? t("configured") : t("missing")} ok={settings.stripeWebhookSecretSet} />
          <StatusTile label={t("currency")} value={settings.currency} ok />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone={stripeReady ? "success" : "warning"} label={stripeReady ? t("stripeReady") : t("stripeIncomplete")} />
          <StatusBadge tone="info" label={t("paypalViaEnv")} />
          <StatusBadge tone="info" label={t("applePayGooglePay")} />
        </div>
      </SectionCard>

      {!compact && (
        <section className="space-y-3">
          <h2 className="section-title">{t("recentCheckouts")}</h2>
          <DataTable
            caption={t("recentCheckouts")}
            columns={columns}
            rows={transactions}
            rowKey={(tx) => tx.id}
            empty={<EmptyState icon={Receipt} title={t("noRecentSessions")} />}
          />
        </section>
      )}
    </div>
  );
}

/** Kachel für einen Konfigurationswert; fehlende Werte als Status mit Wort und Icon. */
function StatusTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-raised p-4">
      <p className="label-text">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-ink">
        {ok ? value : <StatusBadge tone="danger" label={value} />}
      </div>
    </div>
  );
}
