import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserDetail } from "@/actions/admin/users";
import { getAdminMembershipPlans } from "@/actions/admin/memberships";
import { getAdminPermissionGroups } from "@/actions/admin/branding";
import { requirePagePermission } from "@/lib/auth";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserDetailPanel } from "@/components/admin/user-detail-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminUserDetailPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const [result, plansResult, groupsResult, t] = await Promise.all([
    getUserDetail(id),
    getAdminMembershipPlans(),
    getAdminPermissionGroups(),
    getTranslations("admin.us"),
  ]);
  if (!result.success) notFound();
  const plans = plansResult.success ? plansResult.data : [];
  const permissionGroups = groupsResult.success
    ? groupsResult.data.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))
    : [];

  return (
    <div>
      <AdminPageHeader
        title={formatDisplayName(result.data.user)}
        section={t("detail")}
        parent={{ label: t("title"), href: `/${locale}/admin/users` }}
      />
      <UserDetailPanel
        locale={locale}
        user={result.data.user}
        auditLogs={result.data.auditLogs}
        membershipPlans={plans}
        permissionGroups={permissionGroups}
      />
    </div>
  );
}
