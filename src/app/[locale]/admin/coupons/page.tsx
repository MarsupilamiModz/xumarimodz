import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCoupons } from "@/actions/admin/coupons";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { CouponsAdmin } from "@/components/admin/coupons-admin";
import type { Locale } from "@/i18n/config";

export default async function AdminCouponsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("coupons.write");
  const [t, result] = await Promise.all([getTranslations("admin.cp"), getCoupons()]);
  const ownerIds = result.success ? Array.from(new Set(result.data.map((c) => c.ownerUserId).filter((id): id is string => !!id))) : [];
  const owners = ownerIds.length ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, username: true } }) : [];
  const ownerMap = new Map(owners.map((o) => [o.id, o.username]));

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? (
        <CouponsAdmin
          locale={locale}
          coupons={result.data.map((c) => ({
            id: c.id,
            code: c.code,
            type: c.type,
            value: c.value,
            maxUses: c.maxUses,
            usedCount: c.usedCount,
            revenueCents: c.revenueCents,
            expiresAt: c.expiresAt?.toISOString() ?? null,
            isActive: c.isActive,
            owner: c.ownerUserId ? ownerMap.get(c.ownerUserId) ?? null : null,
          }))}
        />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
