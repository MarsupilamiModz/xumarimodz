"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCreditsFromCents } from "@/lib/credits";
import { formatPaymentReference } from "@/lib/invoice-format";
import {
  quoteCustomOrder,
  markOrderPaidManual,
  uploadOrderDelivery,
} from "@/actions/orders";
import { useAppToast } from "@/hooks/use-app-toast";

type AdminOrder = {
  id: string;
  title: string;
  status: string;
  invoiceNumber: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentNote: string | null;
  quotedAmountCents: number | null;
  finalAmountCents: number | null;
  deliveryFileName: string | null;
};

const PAYMENT_TONES: Record<string, StatusTone> = {
  UNPAID: "neutral",
  AWAITING_PAYMENT: "pending",
  PAID: "success",
  REFUNDED: "warning",
};
const KNOWN_PAYMENT = ["UNPAID", "AWAITING_PAYMENT", "PAID", "REFUNDED"];

export function AdminOrderPaymentPanel({
  order: initial,
  locale,
  onUpdated,
}: {
  order: AdminOrder;
  locale: string;
  onUpdated: () => void;
}) {
  const t = useTranslations("admin.orderDetail");
  const uid = useId();
  const appToast = useAppToast();
  const [order, setOrder] = useState(initial);
  const [amount, setAmount] = useState(initial.finalAmountCents ?? 0);
  const [note, setNote] = useState(initial.paymentNote ?? "");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  const paymentLabel = KNOWN_PAYMENT.includes(order.paymentStatus) ? t(`payment.${order.paymentStatus}`) : order.paymentStatus;

  return (
    <SectionCard
      title={t("paymentTitle")}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {order.invoiceNumber && <span className="mono-id">{order.invoiceNumber}</span>}
          <StatusBadge tone={PAYMENT_TONES[order.paymentStatus] ?? "neutral"} label={paymentLabel} />
        </div>
      }
    >
      <div className="space-y-4">
        {order.invoiceNumber && (
          <p className="text-sm text-ink-muted">
            {t("paymentReason")}: <span className="font-mono text-ink">{formatPaymentReference(order.invoiceNumber)}</span>
          </p>
        )}

        {order.paymentStatus !== "PAID" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-amount`} className="label-text mb-1.5 block">{t("quoteAmount")}</label>
              <Input
                id={`${uid}-amount`}
                type="number"
                step="100"
                min={0}
                className="tabular-nums"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-note`} className="label-text mb-1.5 block">{t("paymentNote")}</label>
              <Textarea id={`${uid}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="min-h-0" />
            </div>
            <div className="sm:col-span-2">
              <Button
                disabled={pending || amount <= 0}
                onClick={() =>
                  startTransition(async () => {
                    const r = await quoteCustomOrder(order.id, Math.round(amount), note);
                    if (r.success) {
                      appToast.saved();
                      setOrder((o) => ({ ...o, ...r.data, paymentStatus: "AWAITING_PAYMENT", status: "QUOTED" }));
                      onUpdated();
                    } else appToast.error(r.error);
                  })
                }
              >
                {t("sendQuote", { amount: formatCreditsFromCents(Math.round(amount), locale) })}
              </Button>
            </div>
          </div>
        )}

        {order.finalAmountCents != null && order.paymentStatus !== "PAID" && (
          <p className="text-sm text-ink-muted">
            {t("customerOwes")}: <strong className="tabular-nums text-ink">{formatCreditsFromCents(order.finalAmountCents, locale)}</strong>
          </p>
        )}

        <div>
          <label htmlFor={`${uid}-reference`} className="label-text mb-1.5 block">{t("reference")}</label>
          <div className="flex flex-wrap gap-2">
            <Input id={`${uid}-reference`} value={reference} onChange={(e) => setReference(e.target.value)} className="max-w-xs font-mono" />
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await markOrderPaidManual(order.id, "PAYPAL", reference || undefined);
                  if (r.success) { appToast.saved(); onUpdated(); }
                  else appToast.error(r.error);
                })
              }
            >
              {t("markPaypal")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await markOrderPaidManual(order.id, "BANK_TRANSFER", reference || undefined);
                  if (r.success) { appToast.saved(); onUpdated(); }
                  else appToast.error(r.error);
                })
              }
            >
              {t("markBank")}
            </Button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await uploadOrderDelivery(order.id, fd);
              if (r.success) { appToast.uploaded(); onUpdated(); }
              else appToast.error(r.error);
            });
          }}
        >
          <label htmlFor={`${uid}-file`} className="label-text mb-1.5 block">{t("deliveryFile")}</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input id={`${uid}-file`} type="file" name="file" required accept=".zip,.rar,.7z,.gfx,.rpf,image/*" className="max-w-sm" />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>{t("uploadDelivery")}</Button>
          </div>
        </form>

        {order.deliveryFileName && (
          <p className="text-sm text-ink-muted">
            {t("deliveryReady")}: <span className="font-mono text-ink">{order.deliveryFileName}</span>
          </p>
        )}
      </div>
    </SectionCard>
  );
}
