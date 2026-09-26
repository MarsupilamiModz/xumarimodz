"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { testStripeConnection } from "@/actions/admin/payments";
import type { PaymentSettings } from "@/lib/payments/settings";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";

type Transaction = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  type: string;
  created: number;
};

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
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  const stripeReady = settings.stripeSecretKeySet && settings.stripeWebhookSecretSet;
  const activeProvider = stripeReady ? "Stripe" : t("notConfigured");

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t("heading")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("hint")}
            </p>
          </div>
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile label={t("activeProvider")} value={activeProvider} ok={stripeReady} />
          <StatusTile label={t("stripeSecret")} value={settings.stripeSecretKeySet ? t("configured") : t("missing")} ok={settings.stripeSecretKeySet} />
          <StatusTile label={t("webhookSecret")} value={settings.stripeWebhookSecretSet ? t("configured") : t("missing")} ok={settings.stripeWebhookSecretSet} />
          <StatusTile label={t("currency")} value={settings.currency} ok />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={stripeReady ? "premium" : "outline"}>{stripeReady ? t("stripeReady") : t("stripeIncomplete")}</Badge>
          <Badge variant="outline">{t("paypalViaEnv")}</Badge>
          <Badge variant="outline">{t("applePayGooglePay")}</Badge>
        </div>
      </Card>

      {!compact && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">{t("recentCheckouts")}</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecentSessions")}</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/30 py-2 last:border-0">
                  <span className="font-mono text-xs">{tx.id.slice(0, 24)}…</span>
                  <span className="text-muted-foreground">{tx.type}</span>
                  <span>
                    {tx.amount != null
                      ? `${(tx.amount / 100).toFixed(2)} ${tx.currency?.toUpperCase() ?? ""}`
                      : "—"}
                  </span>
                  <Badge variant="outline">{tx.status}</Badge>
                  <span className="text-xs text-muted-foreground w-full sm:w-auto">
                    {formatDateTime(tx.created * 1000, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function StatusTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-medium ${ok ? "text-foreground" : "text-destructive"}`}>{value}</p>
    </div>
  );
}
