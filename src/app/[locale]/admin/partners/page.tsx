import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listPartners } from "@/actions/admin/partners";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { PublisherTable } from "@/components/admin/publisher-table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import type { Locale } from "@/i18n/config";

type Params = { q?: string; page?: string };

export default async function AdminPartnersPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const t = await getTranslations("admin.pc");
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const base = `/${locale}/admin/partners`;

  const result = await listPartners({ search: q, page });
  const userIds = result.success ? result.data.partners.map((p) => p.userId) : [];
  const open = userIds.length
    ? await prisma.commissionEntry.groupBy({ by: ["userId"], where: { userId: { in: userIds }, status: "PENDING" }, _sum: { amountCents: true } })
    : [];
  const openMap = new Map(open.map((o) => [o.userId, o._sum.amountCents ?? 0]));

  return (
    <div>
      <AdminPageHeader
        title={t("partners")}
        description={result.success ? `${t("partnersSub")} ${t("count", { count: result.data.total })}` : t("partnersSub")}
        actions={
          <Button size="sm" asChild>
            <Link href={`${base}/new`}>{t("create")}</Link>
          </Button>
        }
      />
      <form method="get" action={base} className="mb-4 w-full max-w-sm">
        <SearchField label={t("search")} name="q" defaultValue={q} />
      </form>
      {!result.success ? (
        <AdminLoadError message={result.error} />
      ) : (
        <>
          <PublisherTable
            kind="partner"
            locale={locale}
            basePath={base}
            rows={result.data.partners.map((p) => ({
              id: p.id,
              name: p.user.displayName ?? p.user.username,
              username: p.user.username,
              slug: p.slug,
              code: p.affiliateCode,
              isVerified: p.isVerified,
              isPublic: p.isPublic,
              isSuspended: p.isBanned,
              shareBps: p.commissionOverrideBps ?? p.commissionRateBps,
              overridden: p.commissionOverrideBps != null,
              revenueCents: p.totalRevenueCents,
              openCents: openMap.get(p.userId) ?? 0,
              conversions: p.totalConversions,
            }))}
          />
          <Pagination
            className="mt-6"
            page={result.data.page}
            pages={Math.max(1, result.data.pages)}
            hrefFor={(n) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(n > 1 ? { page: String(n) } : {}) }).toString()}`}
          />
        </>
      )}
    </div>
  );
}
