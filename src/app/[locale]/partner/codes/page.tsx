import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/format-locale";
import { formatMoneyFromCents } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

export default async function PartnerCodesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, tp] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("partnerPages.partnerCodes"),
  ]);
  const user = await requireAuth();

  const coupons = await prisma.coupon.findMany({
    where: { ownerUserId: user.id },
    orderBy: { conversionCount: "desc" },
  });

  return (
    <div>
      <PageHeader level="h2" title={t("affiliateCodes")} description={tp("description")} />
      <DataTable
        caption={t("affiliateCodes")}
        rows={coupons}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={Ticket} title={tp("emptyTitle")} description={tp("emptyText")} />}
        columns={[
          {
            key: "code",
            header: t("affiliateCode"),
            width: "minmax(0,2fr)",
            cell: (c) => <span className="mono-id block truncate text-ink">{c.code}</span>,
          },
          { key: "clicks", header: t("clicks"), width: "100px", align: "right", hideOnMobile: true, cell: (c) => formatNumber(c.clickCount, locale) },
          { key: "conversions", header: t("conversions"), width: "110px", align: "right", hideOnMobile: true, cell: (c) => formatNumber(c.conversionCount, locale) },
          { key: "revenue", header: t("revenue"), width: "120px", align: "right", cell: (c) => formatMoneyFromCents(c.revenueCents, locale) },
          {
            key: "status",
            header: tp("colStatus"),
            width: "120px",
            cell: (c) => <StatusBadge tone={c.isActive ? "success" : "neutral"} label={c.isActive ? t("active") : t("inactive")} />,
          },
        ]}
      />
    </div>
  );
}
