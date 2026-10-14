import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getAchievementAnalytics, getAdminAchievements } from "@/actions/admin/achievements";
import { getOwnerSoundAnalytics } from "@/actions/sounds";
import { OwnerAchievementsPanel } from "@/components/admin/owner-achievements-panel";

export default async function OwnerAchievementsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin.ui.ownerAchievements");
  const [analytics, achievements, sounds] = await Promise.all([
    getAchievementAnalytics(),
    getAdminAchievements(),
    getOwnerSoundAnalytics(),
  ]);
  return (
    <div>
      <AdminPageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      {analytics.success && achievements.success ? (
        <OwnerAchievementsPanel
          analytics={analytics.data}
          achievements={achievements.data}
          soundAnalytics={sounds.success ? sounds.data : null}
        />
      ) : (
        <AdminLoadError message={!analytics.success ? analytics.error : !achievements.success ? achievements.error : ""} />
      )}
    </div>
  );
}
