"use client";

import { useTranslations } from "next-intl";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { CreatorRankBadge } from "@/components/leaderboards/creator-rank-badge";
import type { AchievementRarity, CreatorRankTier } from "@prisma/client";

type ShowcaseAchievement = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  rarity: AchievementRarity;
  animated?: boolean;
  glowEffect?: boolean;
  unlockedAt: Date;
};

export function ProfileShowcase({
  achievements,
  rankTier,
  supporterLabel,
}: {
  achievements: ShowcaseAchievement[];
  rankTier?: CreatorRankTier | null;
  supporterLabel?: string | null;
}) {
  const t = useTranslations("ecosystem");
  if (achievements.length === 0 && !rankTier && !supporterLabel) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{t("showcaseTitle")}</h2>
        {rankTier && <CreatorRankBadge tier={rankTier} size="sm" />}
        {supporterLabel && (
          <span className="rounded-sm bg-violet-soft px-2 py-0.5 text-xs font-semibold text-violet-bright">
            {supporterLabel}
          </span>
        )}
      </div>
      {achievements.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {achievements.map((a) => (
            <AchievementBadge
            key={a.id}
            name={a.name}
            description={a.description}
            icon={a.icon}
              rarity={a.rarity}
              animated={a.animated}
              glowEffect={a.glowEffect}
              unlockedAt={a.unlockedAt}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
