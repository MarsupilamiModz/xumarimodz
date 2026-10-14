import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminAchievements } from "@/actions/admin/achievements";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { AchievementsAdminPanel } from "@/components/admin/achievements-admin-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminAchievementsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, result, holders] = await Promise.all([
    getTranslations("admin.ac"),
    getAdminAchievements(),
    prisma.userAchievement.groupBy({ by: ["achievementId"], _count: { _all: true } }),
  ]);
  const holderMap = new Map(holders.map((h) => [h.achievementId, h._count._all]));

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? (
        <AchievementsAdminPanel
          achievements={result.data.map((a) => ({
            id: a.id,
            slug: a.slug,
            name: a.name,
            description: a.description,
            title: a.title,
            category: a.category,
            rarity: a.rarity,
            icon: a.icon,
            xpReward: a.xpReward,
            isHidden: a.isHidden,
            isSeasonal: a.isSeasonal,
            seasonStart: a.seasonStart?.toISOString() ?? null,
            seasonEnd: a.seasonEnd?.toISOString() ?? null,
            animated: a.animated,
            glowEffect: a.glowEffect,
            isActive: a.isActive,
            unlockRule: a.unlockRule && typeof a.unlockRule === "object" && !Array.isArray(a.unlockRule) ? (a.unlockRule as { type: string; threshold?: number }) : null,
            holders: holderMap.get(a.id) ?? 0,
          }))}
        />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
