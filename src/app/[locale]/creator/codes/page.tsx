import { Ticket } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export default async function CreatorCodesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tp = await getTranslations("creatorPages.codes");
  const user = await requireAuth();

  const coupons = await prisma.coupon.findMany({
    where: { ownerUserId: user.id },
    orderBy: { usedCount: "desc" },
  });

  return (
    <div>
      <PageHeader level="h2" title={t("codes")} description={tp("description")} />
      <DataTable
        caption={t("codes")}
        rows={coupons}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={Ticket} title={t("noCodes")} description={tp("emptyText")} />}
        columns={[
          {
            key: "code",
            header: tp("colCode"),
            width: "minmax(0,1.4fr)",
            cell: (c) => <span className="mono-id block truncate text-ink">{c.code}</span>,
          },
          {
            key: "discount",
            header: tp("colDiscount"),
            width: "100px",
            align: "right",
            cell: (c) =>
              c.type === "PERCENT"
                ? tp("percent", { value: formatNumber(c.value / 100, locale) })
                : formatMoneyFromCents(c.value, locale),
          },
          {
            key: "type",
            header: tp("colType"),
            width: "110px",
            hideOnMobile: true,
            cell: (c) => <span className="text-ink-muted">{tp(`type.${c.affiliateType}`)}</span>,
          },
          {
            key: "clicks",
            header: tp("colClicks"),
            width: "90px",
            align: "right",
            hideOnMobile: true,
            cell: (c) => formatNumber(c.clickCount, locale),
          },
          {
            key: "uses",
            header: tp("colUses"),
            width: "90px",
            align: "right",
            hideOnMobile: true,
            cell: (c) => formatNumber(c.usedCount, locale),
          },
          {
            key: "revenue",
            header: tp("colRevenue"),
            width: "120px",
            align: "right",
            hideOnMobile: true,
            cell: (c) => formatMoneyFromCents(c.revenueCents, locale),
          },
          {
            key: "status",
            header: tp("colStatus"),
            width: "110px",
            cell: (c) => (
              <StatusBadge tone={c.isActive ? "success" : "neutral"} label={c.isActive ? t("active") : t("inactive")} />
            ),
          },
        ]}
      />
    </div>
  );
}
