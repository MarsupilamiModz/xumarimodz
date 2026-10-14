"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { getOrderDetail, sendOrderMessage } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ClientOrderPaymentPanel } from "@/components/orders/client-order-payment-panel";
import { UserIdentity } from "@/components/user/user-identity";
import { toast } from "@/hooks/use-toast";

type Order = {
  id: string;
  title: string;
  status: string;
  invoiceNumber: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  finalAmountCents: number | null;
  paymentNote: string | null;
  deliveryFileName: string | null;
  deliveryFileKey: string | null;
  messages: {
    id: string;
    content: string;
    sender: { username: string; displayName: string | null };
  }[];
};

/** Farbton je Auftragsstatus (wie in der Auftragsliste). */
function orderTone(status: string): StatusTone {
  if (status === "COMPLETED" || status === "DELIVERED") return "success";
  if (status === "CANCELED" || status === "REFUNDED") return "neutral";
  if (status === "WAITING_FOR_CUSTOMER" || status === "REVISION_REQUESTED" || status === "QUOTED") return "warning";
  return "pending";
}

export default function OrderDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const orderId = params.id as string;
  const t = useTranslations("accountPages.orders");
  const [order, setOrder] = useState<Order | null>(null);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const r = await getOrderDetail(orderId);
      if (r.success) setOrder(r.data as unknown as Order);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!order) return <PageSkeleton />;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/${locale}/dashboard/orders`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader
        title={order.title}
        actions={
          <StatusBadge
            tone={orderTone(order.status)}
            label={t.has(`status.${order.status}`) ? t(`status.${order.status}`) : order.status}
          />
        }
      />

      <div className="space-y-6">
        <ClientOrderPaymentPanel order={order} locale={locale} />

        <SectionCard title={t("conversation")}>
          {order.messages.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noMessages")}</p>
          ) : (
            <ul className="space-y-3">
              {order.messages.map((m) => (
                <li key={m.id} className="rounded-lg border border-line p-4">
                  <div className="mb-1">
                    <UserIdentity username={m.sender.username} displayName={m.sender.displayName} size="sm" />
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{m.content}</p>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-4 space-y-3 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!content.trim()) return;
              startTransition(async () => {
                const r = await sendOrderMessage(orderId, content);
                if (r.success) {
                  setContent("");
                  load();
                  toast({ title: "toast.messageSent" });
                }
              });
            }}
          >
            <label htmlFor="order-reply" className="label-text">
              {t("replyLabel")}
            </label>
            <Textarea
              id="order-reply"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={3}
            />
            <Button type="submit" disabled={pending || !content.trim()}>
              {t("send")}
            </Button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
