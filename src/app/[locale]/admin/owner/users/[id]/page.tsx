import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/auth";
import { getOwnerUserDetail } from "@/actions/admin/owner-users";
import { getAdminAchievements, getUserAchievementsAdmin } from "@/actions/admin/achievements";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OwnerUserDetailPanel } from "@/components/admin/owner-user-detail-panel";
import type { Locale } from "@/i18n/config";

export default async function OwnerUserDetailPage(props: { params: Promise<{ locale: Locale; id: string }> }) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const [detail, userAchievements, allAchievements, t] = await Promise.all([
    getOwnerUserDetail(id),
    getUserAchievementsAdmin(id),
    getAdminAchievements(),
    getTranslations("admin"),
  ]);
  if (!detail.success) notFound();
  return (
    <div>
      <AdminPageHeader
        title={formatDisplayName(detail.data.user)}
        description={detail.data.user.email}
        section={t("ownerUserDetail.section")}
        parent={{ label: t("us.title"), href: `/${locale}/admin/users` }}
      />
      <OwnerUserDetailPanel
        locale={locale}
        user={detail.data.user}
        auditLogs={detail.data.auditLogs}
        userAchievements={userAchievements.success ? userAchievements.data : []}
        allAchievements={allAchievements.success ? allAchievements.data : []}
      />
    </div>
  );
}
