"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatCreditsFromCents } from "@/lib/credits";
import { formatPaymentReference } from "@/lib/invoice-format";
import { startOrderStripePayment, payOrderWithCredits } from "@/actions/orders";
import { useAppToast } from "@/hooks/use-app-toast";

type ClientOrder = {
  id: string;
  invoiceNumber: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  finalAmountCents: number | null;
  paymentNote: string | null;
  deliveryFileName: string | null;
  deliveryFileKey: string | null;
};

const PAYMENT_TONE: Record<string, StatusTone> = {
  UNPAID: "warning",
  AWAITING_PAYMENT: "pending",
  PAID: "success",
  REFUNDED: "neutral",
};

export function ClientOrderPaymentPanel({ order, locale }: { order: ClientOrder; locale: string }) {
  const t = useTranslations("accountPages.orders.payment");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  if (order.paymentStatus === "UNPAID" && !order.finalAmountCents) return null;

  return (
    <SectionCard
      title={t("title")}
      action={
        <StatusBadge
          tone={PAYMENT_TONE[order.paymentStatus] ?? "neutral"}
          label={t.has(`status.${order.paymentStatus}`) ? t(`status.${order.paymentStatus}`) : order.paymentStatus}
        />
      }
    >
      <div className="space-y-4">
        {order.invoiceNumber && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="label-text">{t("invoice")}</dt>
              <dd className="mono-id mt-1">{order.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="label-text">{t("reference")}</dt>
              <dd className="mono-id mt-1">{formatPaymentReference(order.invoiceNumber)}</dd>
            </div>
          </dl>
        )}

        {order.paymentNote && <p className="text-sm text-ink">{order.paymentNote}</p>}

        {order.finalAmountCents != null && order.paymentStatus !== "PAID" && (
          <>
            <p className="text-2xl font-bold tabular-nums text-ink">
              {formatCreditsFromCents(order.finalAmountCents, locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await startOrderStripePayment(
                      order.id,
                      locale,
                      typeof window !== "undefined" ? window.location.origin : undefined
                    );
                    if (!r.success) {
                      appToast.error(r.error);
                      return;
                    }
                    if (r.data.url) window.location.href = r.data.url;
                    else appToast.error(t("checkoutFailed"));
                  })
                }
              >
                {t("payWithCard")}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await payOrderWithCredits(order.id);
                    if (r.success) {
                      appToast.saved();
                      window.location.reload();
                    } else appToast.error(r.error);
                  })
                }
              >
                {t("payWithCredits")}
              </Button>
            </div>
            <p className="meta">{t("otherMethods")}</p>
          </>
        )}

        {order.paymentStatus === "PAID" && order.deliveryFileName && order.deliveryFileKey && (
          <Button asChild>
            <a href={`/api/assets/${encodeURIComponent(order.deliveryFileKey)}`} download={order.deliveryFileName}>
              <Download className="h-4 w-4" aria-hidden />
              {t("download", { file: order.deliveryFileName })}
            </a>
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
