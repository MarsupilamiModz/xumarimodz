"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  bulkGrantAchievement,
  getAchievementAnalytics,
  getAdminAchievements,
} from "@/actions/admin/achievements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import type { UserRole } from "@prisma/client";
import type { getOwnerSoundAnalytics } from "@/actions/sounds";

type Analytics = Extract<
  Awaited<ReturnType<typeof getAchievementAnalytics>>,
  { success: true }
>["data"];

type SoundAnalytics = Extract<
  Awaited<ReturnType<typeof getOwnerSoundAnalytics>>,
  { success: true }
>["data"];

type AchievementOption = Extract<
  Awaited<ReturnType<typeof getAdminAchievements>>,
  { success: true }
>["data"][number];

export function OwnerAchievementsPanel({
  analytics,
  achievements,
  soundAnalytics,
}: {
  analytics: Analytics;
  achievements: AchievementOption[];
  soundAnalytics: SoundAnalytics | null;
}) {
  const router = useRouter();
  const t = useTranslations("admin.ui.ownerAchievements");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [achievementId, setAchievementId] = useState(achievements[0]?.id ?? "");
  const [userIds, setUserIds] = useState("");

  const massGrant = (params: { role?: UserRole; premiumOnly?: boolean }) => {
    if (!achievementId) return;
    startTransition(async () => {
      const r = await bulkGrantAchievement({ achievementId, ...params });
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/owner" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("ownerControlCenterLink")}
        </Link>
        <h1 className="h1-acp mt-2">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("pageSubtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">{t("totalGrantsLabel")}</p>
          <p className="text-2xl font-bold tabular-nums">{analytics.totalGrants}</p>
        </Card>
        <Card className="p-4 sm:col-span-3">
          <p className="text-xs text-muted-foreground uppercase mb-2">{t("mostGrantedLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {analytics.mostGranted.slice(0, 5).map((g) => (
              <Badge key={g.achievement.id} variant="outline">
                {g.achievement.name} ({g.count})
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {soundAnalytics && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("audioAnalyticsHeading")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase">{t("totalPlaysLabel")}</p>
              <p className="text-2xl font-bold tabular-nums">{soundAnalytics.totalPlays}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase">{t("plays7DaysLabel")}</p>
              <p className="text-2xl font-bold tabular-nums">{soundAnalytics.playsLast7Days}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase">{t("avgPlaysPerSoundLabel")}</p>
              <p className="text-2xl font-bold tabular-nums">{soundAnalytics.avgPlaysPerSound}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase">{t("pendingReviewLabel")}</p>
              <p className="text-2xl font-bold tabular-nums">{soundAnalytics.pendingReview}</p>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t("mostPlayedSoundsHeading")}</h3>
              <ul className="text-sm space-y-1">
                {soundAnalytics.topPlayed.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link href={`/mods/${s.slug}`} className="text-violet-bright hover:underline truncate">
                      {s.title}
                    </Link>
                    <span className="text-muted-foreground tabular-nums shrink-0">{t("playsCount", { count: s.plays })}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t("topDownloadsHeading")}</h3>
              <ul className="text-sm space-y-1">
                {soundAnalytics.topDownloads.map((s) => (
                  <li key={s.slug} className="flex justify-between gap-2">
                    <Link href={`/mods/${s.slug}`} className="text-violet-bright hover:underline truncate">
                      {s.title}
                    </Link>
                    <span className="text-muted-foreground tabular-nums shrink-0">{s.downloadCount}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t("rarestBadgesHeading")}</h3>
          <ul className="text-sm space-y-1">
            {analytics.rarest.slice(0, 8).map((g) => (
              <li key={g.achievement.id} className="flex justify-between">
                <span>{g.achievement.name}</span>
                <span className="text-muted-foreground tabular-nums">{g.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t("topBadgeCollectorsHeading")}</h3>
          <ul className="text-sm space-y-1">
            {analytics.topUsers.map((u) => (
              <li key={u.user.id} className="flex justify-between">
                <Link href={`/admin/owner/users/${u.user.id}`} className="text-violet-bright hover:underline">
                  {u.user.displayName ?? u.user.username}
                </Link>
                <span className="text-muted-foreground tabular-nums">{u.badgeCount}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">{t("massAssignmentHeading")}</h3>
        <select
          value={achievementId}
          onChange={(e) => setAchievementId(e.target.value)}
          className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
        >
          {achievements.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.rarity})
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => massGrant({ role: "CREATOR" })}>
            {t("allCreatorsButton")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => massGrant({ role: "PARTNER" })}>
            {t("allPartnersButton")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => massGrant({ role: "ADMIN" })}>
            {t("teamAdminsButton")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => massGrant({ premiumOnly: true })}>
            {t("premiumUsersButton")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            placeholder={t("userIdsPlaceholder")}
            value={userIds}
            onChange={(e) => setUserIds(e.target.value)}
            className="flex-1 min-w-[200px] font-mono text-xs"
          />
          <Button

            size="sm"
            disabled={pending || !userIds.trim()}
            onClick={() =>
              startTransition(async () => {
                const ids = userIds.split(/[\s,]+/).filter(Boolean);
                const r = await bulkGrantAchievement({ achievementId, userIds: ids });
                if (r.success) {
                  appToast.saved();
                  setUserIds("");
                  router.refresh();
                } else appToast.error(r.error);
              })
            }
          >
            {t("grantToUsersButton")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
