import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatEuro } from "@/lib/format-locale";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { Locale } from "@/i18n/config";

const GROUPS = {
  open: ["PENDING", "PAID", "QUOTED", "IN_REVIEW", "ACCEPTED"],
  active: ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "REVISION_REQUESTED", "REVIEW"],
  done: ["COMPLETED", "DELIVERED", "CANCELED", "REFUNDED"],
} as const;
type Group = keyof typeof GROUPS;

function tone(status: string): StatusTone {
  if (status === "COMPLETED" || status === "DELIVERED") return "success";
  if (status === "CANCELED" || status === "REFUNDED") return "neutral";
  if ((GROUPS.open as readonly string[]).includes(status)) return "warning";
  return "pending";
}

export default async function AdminOrdersPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: { group?: string; page?: string } }) {
  setRequestLocale(locale);
  await requirePagePermission("orders.read");
  const t = await getTranslations("admin.or");
  const group = searchParams.group && searchParams.group in GROUPS ? (searchParams.group as Group) : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const limit = 25;
  const base = `/${locale}/admin/orders`;
  const where: Prisma.CustomOrderWhereInput = group ? { status: { in: [...GROUPS[group]] } } : {};

  let data: { orders: Awaited<ReturnType<typeof loadOrders>>; total: number } | null = null;
  async function loadOrders() {
    return prisma.customOrder.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        orderType: true,
        status: true,
        budgetCents: true,
        updatedAt: true,
        client: { select: { username: true } },
        assignee: { select: { username: true } },
        _count: { select: { messages: true } },
      },
    });
  }
  try {
    const [orders, total] = await Promise.all([loadOrders(), prisma.customOrder.count({ where })]);
    data = { orders, total };
  } catch (err) {
    console.error("[admin/orders]", err);
  }

  const href = (next: { group?: string; page?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ group, ...next })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      <div className="mb-4">
        <ChipTabs
          label={t("status")}
          value={group ?? ""}
          options={[{ value: "", label: t("all") }, ...(Object.keys(GROUPS) as Group[]).map((g) => ({ value: g, label: t(`group.${g}`) }))]}
          hrefFor={(v) => href({ group: v || undefined, page: undefined })}
        />
      </div>
      {!data ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <DataTable
            caption={t("title")}
            rows={data.orders}
            rowKey={(o) => o.id}
            rowHref={(o) => `${base}/${o.id}`}
            empty={<EmptyState icon={ClipboardList} title={t("emptyTitle")} description={t("emptyText")} />}
            columns={[
              {
                key: "order",
                header: t("colOrder"),
                width: "minmax(0,2fr)",
                cell: (o) => (
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{o.title}</span>
                    <span className="block truncate text-xs text-ink-faint">
                      {o.orderType} · {t("messages", { count: o._count.messages })}
                    </span>
                  </span>
                ),
              },
              { key: "client", header: t("colClient"), hideOnMobile: true, cell: (o) => <span className="text-ink-muted">@{o.client.username}</span> },
              { key: "assignee", header: t("colAssignee"), hideOnMobile: true, cell: (o) => <span className="text-ink-muted">{o.assignee ? `@${o.assignee.username}` : t("unassigned")}</span> },
              { key: "budget", header: t("colBudget"), width: "100px", align: "right", hideOnMobile: true, cell: (o) => (o.budgetCents != null ? formatEuro(o.budgetCents, locale) : "—") },
              { key: "status", header: t("colStatus"), width: "170px", cell: (o) => <StatusBadge tone={tone(o.status)} label={t(`st.${o.status}`)} /> },
              { key: "updated", header: t("colUpdated"), width: "110px", hideOnMobile: true, cell: (o) => <span className="tabular-nums text-ink-muted">{formatDate(o.updatedAt, locale)}</span> },
            ]}
          />
          <Pagination className="mt-6" page={page} pages={Math.max(1, Math.ceil(data.total / limit))} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
