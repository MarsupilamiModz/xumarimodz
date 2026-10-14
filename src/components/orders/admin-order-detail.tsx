"use client";

import { useParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquare } from "lucide-react";
import { getOrderDetail, sendOrderMessage } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { AdminOrderPaymentPanel } from "@/components/orders/admin-order-payment-panel";
import { UserIdentity } from "@/components/user/user-identity";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Order = {
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
  client: { username: string; displayName: string | null };
  messages: {
    id: string;
    content: string;
    isInternal: boolean;
    sender: { username: string; displayName: string | null };
  }[];
};

const KNOWN_STATUS = [
  "PENDING", "PAID", "QUOTED", "IN_REVIEW", "ACCEPTED", "ASSIGNED", "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER", "REVISION_REQUESTED", "REVIEW", "COMPLETED", "DELIVERED", "CANCELED", "REFUNDED",
];

function statusTone(status: string): StatusTone {
  if (status === "COMPLETED" || status === "DELIVERED" || status === "PAID") return "success";
  if (status === "CANCELED" || status === "REFUNDED") return "neutral";
  if (status === "WAITING_FOR_CUSTOMER" || status === "REVISION_REQUESTED") return "warning";
  if (status === "PENDING" || status === "QUOTED" || status === "IN_REVIEW") return "pending";
  return "info";
}

export function AdminOrderDetail() {
  const params = useParams();
  const locale = params.locale as string;
  const orderId = params.id as string;
  const t = useTranslations("admin.orderDetail");
  const ts = useTranslations("admin.or.st");
  const uid = useId();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const r = await getOrderDetail(orderId);
      if (r.success) {
        setOrder(r.data as unknown as Order);
        setLoadFailed(false);
      } else setLoadFailed(true);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!order) {
    if (loadFailed) {
      return (
        <p role="alert" className="max-w-3xl rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {t("loadError")}
        </p>
      );
    }
    return (
      <div className="max-w-3xl space-y-6" aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SectionCard
        title={order.title}
        action={<StatusBadge tone={statusTone(order.status)} label={KNOWN_STATUS.includes(order.status) ? ts(order.status) : order.status} />}
      >
        <p className="text-sm text-ink-muted">
          <span className="label-text mr-2">{t("client")}</span>
          <UserIdentity username={order.client.username} displayName={order.client.displayName} />
        </p>
      </SectionCard>

      <AdminOrderPaymentPanel order={order} locale={locale} onUpdated={load} />

      <SectionCard title={t("messagesTitle")}>
        {order.messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t("noMessages")} className="py-8" />
        ) : (
          <ul className="space-y-3">
            {order.messages.map((m) => (
              <li key={m.id} className={cn("rounded-md border p-4", m.isInternal ? "border-violet-bright/30 bg-violet-soft" : "border-line bg-elevated")}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <UserIdentity username={m.sender.username} displayName={m.sender.displayName} size="sm" />
                  {m.isInternal && <StatusBadge tone="info" label={t("internal")} />}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{m.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label htmlFor={`${uid}-reply`} className="label-text block">{t("replyLabel")}</label>
          <Textarea id={`${uid}-reply`} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("replyPlaceholder")} rows={3} />
          <Button
            variant="outline"
            disabled={pending || !content.trim()}
            onClick={() =>
              startTransition(async () => {
                const r = await sendOrderMessage(orderId, content, false);
                if (r.success) {
                  setContent("");
                  load();
                  toast({ title: "toast.sent" });
                } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("reply")}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
