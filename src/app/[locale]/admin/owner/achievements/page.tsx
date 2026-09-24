import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getAchievementAnalytics, getAdminAchievements } from "@/actions/admin/achievements";
import { getOwnerSoundAnalytics } from "@/actions/sounds";
import { OwnerAchievementsPanel } from "@/components/admin/owner-achievements-panel";

export default async function OwnerAchievementsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin");
  const [analytics, achievements, sounds] = await Promise.all([
    getAchievementAnalytics(),
    getAdminAchievements(),
    getOwnerSoundAnalytics(),
  ]);
  return (
    <div>
      <AdminPageHeader title={t("nav.achievements")} />
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
