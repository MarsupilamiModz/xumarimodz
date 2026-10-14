import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getUserOrders } from "@/actions/orders";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { orderTone } from "@/lib/status-tones";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

/** Farbton je Auftragsstatus (wie im ACP). */
export default async function OrdersPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const [t, ta, to] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("accountPages.orders"),
    getTranslations("orders"),
  ]);
  const result = await getUserOrders();
  const orders = result.success ? result.data : [];
  const typeLabel = (type: string) => (to.has(`types.${type}`) ? to(`types.${type}`) : type);

  return (
    <div>
      <PageHeader
        title={t("customOrders")}
        description={ta("description")}
        actions={
          <Button size="sm" asChild>
            <Link href={`/${locale}/custom-orders`}>
              <Plus className="h-4 w-4" aria-hidden /> {to("newOrder")}
            </Link>
          </Button>
        }
      />
      <DataTable
        caption={t("customOrders")}
        rows={orders}
        rowKey={(o) => o.id}
        rowHref={(o) => `/${locale}/dashboard/orders/${o.id}`}
        empty={<EmptyState icon={Package} title={ta("emptyTitle")} description={ta("emptyText")} />}
        columns={[
          {
            key: "title",
            header: ta("colOrder"),
            width: "minmax(0,2fr)",
            cell: (o) => <span className="block truncate font-medium text-ink">{o.title}</span>,
          },
          {
            key: "type",
            header: ta("colType"),
            width: "minmax(0,1fr)",
            hideOnMobile: true,
            cell: (o) => <span className="block truncate text-ink-muted">{typeLabel(o.orderType)}</span>,
          },
          {
            key: "messages",
            header: ta("colMessages"),
            width: "110px",
            align: "right",
            hideOnMobile: true,
            cell: (o) => formatNumber(o._count.messages, locale),
          },
          {
            key: "status",
            header: ta("colStatus"),
            width: "170px",
            cell: (o) => (
              <StatusBadge
                tone={orderTone(o.status)}
                label={ta.has(`status.${o.status}`) ? ta(`status.${o.status}`) : o.status}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
