import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDesignerDashboard } from "@/actions/designer";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

function orderTone(status: string): StatusTone {
  if (status === "COMPLETED" || status === "DELIVERED") return "success";
  if (status === "CANCELED" || status === "REFUNDED") return "neutral";
  if (["PENDING", "PAID", "QUOTED", "IN_REVIEW", "ACCEPTED"].includes(status)) return "warning";
  return "pending";
}

export default async function DesignerOrdersPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const [t, tp, tOrder, tEmpty] = await Promise.all([
    getTranslations("designer"),
    getTranslations("partnerPages.designerOrders"),
    getTranslations("partnerPages.orderStatus"),
    getTranslations("partnerPages.designerOverview"),
  ]);
  const result = await getDesignerDashboard();
  const orders = result.success ? result.data.orders : [];

  return (
    <div>
      <PageHeader title={t("orders")} description={tp("description")} />
      <DataTable
        caption={t("orders")}
        rows={orders}
        rowKey={(o) => o.id}
        rowHref={(o) => `/${locale}/dashboard/orders/${o.id}`}
        empty={<EmptyState icon={ClipboardList} title={tEmpty("emptyOrdersTitle")} description={t("emptyOrders")} />}
        columns={[
          {
            key: "order",
            header: tp("colOrder"),
            width: "minmax(0,2fr)",
            cell: (o) => (
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{o.title}</span>
                <span className="block truncate text-xs text-ink-faint">{tp("messages", { count: o._count.messages })}</span>
              </span>
            ),
          },
          { key: "client", header: tp("colClient"), hideOnMobile: true, cell: (o) => <span className="text-ink-muted">@{o.client.username}</span> },
          { key: "status", header: tp("colStatus"), width: "170px", cell: (o) => <StatusBadge tone={orderTone(o.status)} label={tOrder(o.status)} /> },
          {
            key: "updated",
            header: tp("colUpdated"),
            width: "110px",
            hideOnMobile: true,
            cell: (o) => <span className="tabular-nums text-ink-muted">{formatDate(o.updatedAt, locale)}</span>,
          },
        ]}
      />
    </div>
  );
}
