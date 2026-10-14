"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  bulkGrantAchievement,
  getAchievementAnalytics,
  getAdminAchievements,
} from "@/actions/admin/achievements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";
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

/** Rangliste: Name links, Zahl rechts; leer mit Hinweis. */
function RankList({ items, empty }: { items: { key: string; label: React.ReactNode; value: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ol className="divide-y divide-line text-[13px]">
      {items.map((i) => (
        <li key={i.key} className="flex justify-between gap-3 py-2">
          <span className="min-w-0 truncate text-ink">{i.label}</span>
          <span className="shrink-0 tabular-nums text-ink-muted">{i.value}</span>
        </li>
      ))}
    </ol>
  );
}

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
  const locale = useLocale();
  const t = useTranslations("admin.ui.ownerAchievements");
  const tb = useTranslations("admin.ownerAchievements");
  const tr = useTranslations("admin.ac");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [achievementId, setAchievementId] = useState(achievements[0]?.id ?? "");
  const [userIds, setUserIds] = useState("");
  const num = (n: number) => formatNumber(n, locale);

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("totalGrantsLabel")} value={num(analytics.totalGrants)} />
        <section className="rounded-lg border border-line bg-raised p-4 lg:col-span-3">
          <h2 className="label-text">{t("mostGrantedLabel")}</h2>
          {analytics.mostGranted.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">{tb("noData")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {analytics.mostGranted.slice(0, 5).map((g) => (
                <li key={g.achievement.id} className="rounded-sm border border-line px-2 py-0.5 text-xs text-ink">
                  {g.achievement.name} <span className="tabular-nums text-ink-faint">{num(g.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {soundAnalytics && (
        <section aria-labelledby="audio-analytics-heading" className="space-y-4">
          <h2 id="audio-analytics-heading" className="section-title">{t("audioAnalyticsHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label={t("totalPlaysLabel")} value={num(soundAnalytics.totalPlays)} />
            <KpiTile label={t("plays7DaysLabel")} value={num(soundAnalytics.playsLast7Days)} />
            <KpiTile label={t("avgPlaysPerSoundLabel")} value={num(soundAnalytics.avgPlaysPerSound)} />
            <KpiTile
              label={t("pendingReviewLabel")}
              value={num(soundAnalytics.pendingReview)}
              tone={soundAnalytics.pendingReview > 0 ? "warning" : undefined}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title={t("mostPlayedSoundsHeading")}>
              <RankList
                empty={tb("noData")}
                items={soundAnalytics.topPlayed.map((s) => ({
                  key: s.id,
                  label: <Link href={`/mods/${s.slug}`} className="link">{s.title}</Link>,
                  value: t("playsCount", { count: s.plays }),
                }))}
              />
            </SectionCard>
            <SectionCard title={t("topDownloadsHeading")}>
              <RankList
                empty={tb("noData")}
                items={soundAnalytics.topDownloads.map((s) => ({
                  key: s.slug,
                  label: <Link href={`/mods/${s.slug}`} className="link">{s.title}</Link>,
                  value: num(s.downloadCount),
                }))}
              />
            </SectionCard>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("rarestBadgesHeading")}>
          <RankList
            empty={tb("noData")}
            items={analytics.rarest.slice(0, 8).map((g) => ({ key: g.achievement.id, label: g.achievement.name, value: num(g.count) }))}
          />
        </SectionCard>
        <SectionCard title={t("topBadgeCollectorsHeading")}>
          <RankList
            empty={tb("noData")}
            items={analytics.topUsers.map((u) => ({
              key: u.user.id,
              label: <Link href={`/${locale}/admin/owner/users/${u.user.id}`} className="link">{u.user.displayName ?? u.user.username}</Link>,
              value: num(u.badgeCount),
            }))}
          />
        </SectionCard>
      </div>

      <SectionCard title={t("massAssignmentHeading")} description={tb("massText")}>
        <div className="space-y-4">
          <div className="max-w-md space-y-1.5">
            <label htmlFor="mass-achievement" className="label-text">{tb("achievement")}</label>
            <select
              id="mass-achievement"
              value={achievementId}
              onChange={(e) => setAchievementId(e.target.value)}
              className="h-9 w-full rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
            >
              {achievements.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({tr(`rar.${a.rarity}`)})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="label-text">{tb("grantToGroup")}</p>
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
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mass-user-ids" className="label-text">{t("userIdsPlaceholder")}</label>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id="mass-user-ids"
                placeholder={t("userIdsPlaceholder")}
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                className="mono-id min-w-[200px] flex-1"
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
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
