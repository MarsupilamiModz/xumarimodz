import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { NewsletterToggle } from "@/components/dashboard/newsletter-toggle";
import { AchievementShowcasePanel } from "@/components/dashboard/achievement-showcase-panel";
import { evaluateUserAchievements, getUserAchievements, getUserProgress } from "@/lib/achievements";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function SettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.settings")]);
  await evaluateUserAchievements(user.id);

  const [creatorProfile, achievements, progress] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: user.id } }),
    getUserAchievements(user.id, locale),
    getUserProgress(user.id),
  ]);

  return (
    <div>
      <PageHeader title={t("settings")} description={ta("description")} />
      <div className="max-w-3xl space-y-6">
        <SettingsForm
          locale={locale}
          user={{
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            locale: user.locale,
            discordId: user.discordId,
            role: user.role,
            hasCreatorProfile: !!creatorProfile,
          }}
        />
        <NewsletterToggle initial={user.newsletterConsent} />
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
