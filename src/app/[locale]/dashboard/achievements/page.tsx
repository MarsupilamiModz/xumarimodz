import { requireAuth } from "@/lib/auth";
import { evaluateUserAchievements, getUserAchievements, getUserProgress } from "@/lib/achievements";
import { AchievementShowcasePanel } from "@/components/dashboard/achievement-showcase-panel";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { runAfterResponse } from "@/lib/after-response";

export default async function AchievementsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await requireAuth(`/${locale}/login`);
  runAfterResponse(evaluateUserAchievements(user.id).catch(() => undefined));

  const [achievements, progress] = await Promise.all([
    getUserAchievements(user.id, locale),
    getUserProgress(user.id),
  ]);

  return (
    <div>
      <h1 className="h1-acp">{t("achievementsTitle")}</h1>
      <p className="text-muted-foreground mt-1">{t("achievementsSubtitle")}</p>
      <div className="mt-8">
        <AchievementShowcasePanel
          achievements={achievements.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            rarity: a.rarity,
            animated: a.animated,
            glowEffect: a.glowEffect,
            unlockedAt: a.unlockedAt,
            isShowcased: a.isShowcased,
            showcaseOrder: a.showcaseOrder,
          }))}
          xp={progress?.xp ?? 0}
          level={progress?.level ?? 1}
        />
      </div>
    </div>
  );
}
