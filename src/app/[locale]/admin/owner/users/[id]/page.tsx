import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/auth";
import { getOwnerUserDetail } from "@/actions/admin/owner-users";
import { getAdminAchievements, getUserAchievementsAdmin } from "@/actions/admin/achievements";
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
  const [detail, userAchievements, allAchievements] = await Promise.all([
    getOwnerUserDetail(id),
    getUserAchievementsAdmin(id),
    getAdminAchievements(),
  ]);
  if (!detail.success) notFound();
  return (
    <OwnerUserDetailPanel
      locale={locale}
      user={detail.data.user}
      auditLogs={detail.data.auditLogs}
      userAchievements={userAchievements.success ? userAchievements.data : []}
      allAchievements={allAchievements.success ? allAchievements.data : []}
    />
  );
}
