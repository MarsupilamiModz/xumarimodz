import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trophy } from "lucide-react";
import type { LeaderboardMetric, LeaderboardPeriod } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PUBLIC_LEADERBOARD_METRICS, getHiddenLeaderboardCreators, getLeaderboard, getLeaderboardWeights } from "@/lib/leaderboards";
import { CreatorRankBadge } from "@/components/leaderboards/creator-rank-badge";
import { formatNumber } from "@/lib/format-locale";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LeaderboardRowActions, LeaderboardWeightsForm, UnhideButton } from "@/components/admin/leaderboards-admin-panel";
import { Badge } from "@/components/ui/badge";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

const PERIODS: LeaderboardPeriod[] = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];
type Params = { tab?: string; metric?: string; period?: string };

export default async function AdminLeaderboardsPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.lb");
  const base = `/${locale}/admin/leaderboards`;
  const tab = searchParams.tab === "settings" ? "settings" : "ranking";
  const metric = PUBLIC_LEADERBOARD_METRICS.includes(searchParams.metric as LeaderboardMetric) ? (searchParams.metric as LeaderboardMetric) : "DOWNLOADS";
  const period = PERIODS.includes(searchParams.period as LeaderboardPeriod) ? (searchParams.period as LeaderboardPeriod) : "WEEKLY";
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ metric, period, ...next })) if (v) p.set(k, String(v));
    return `${base}?${p.toString()}`;
  };

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "ranking", label: t("tabRanking") },
        { value: "settings", label: t("tabSettings") },
      ]}
      hrefFor={(v) => (v === "ranking" ? base : `${base}?tab=${v}`)}
    />
  );

  if (tab === "settings") {
    const weights = await getLeaderboardWeights();
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        <section className="max-w-3xl rounded-lg border border-line bg-raised p-4">
          <h2 className="section-title">{t("weights")}</h2>
          <p className="mb-4 mt-1 text-sm text-ink-muted">{t("weightsText")}</p>
          <LeaderboardWeightsForm initial={weights} />
        </section>
      </div>
    );
  }

  const [entries, hiddenIds] = await Promise.all([getLeaderboard({ metric, period, limit: 50 }), getHiddenLeaderboardCreators()]);
  const hidden = hiddenIds.length
    ? await prisma.creatorProfile.findMany({ where: { id: { in: hiddenIds } }, select: { id: true, slug: true, user: { select: { username: true, displayName: true } } } })
    : [];

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
      <div className="mb-4 flex flex-wrap gap-3">
        <ChipTabs label={t("metric")} value={metric} options={PUBLIC_LEADERBOARD_METRICS.map((m) => ({ value: m, label: t(`m.${m}`) }))} hrefFor={(v) => href({ metric: v })} />
        <ChipTabs label={t("period")} value={period} options={PERIODS.map((p) => ({ value: p, label: t(`p.${p}`) }))} hrefFor={(v) => href({ period: v })} />
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Trophy} title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-raised">
          <table className="w-full min-w-[640px] text-[13px]">
            <caption className="sr-only">{t(`m.${metric}`)}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th scope="col" className="w-16 px-4 py-2 font-medium">{t("colRank")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colCreator")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colTier")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{t("colScore")}</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">{t("pin")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.creatorId} className="hover:bg-row-hover">
                  <td className="px-4 py-2 font-semibold tabular-nums text-ink">{e.rank}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-ink">{e.name}</span>
                      {e.isPinned && <Badge variant="default">{t("pinned")}</Badge>}
                    </span>
                    <span className="meta block">/{e.slug}</span>
                  </td>
                  <td className="px-4 py-2"><CreatorRankBadge tier={e.rankTier} size="sm" /></td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-muted">{formatNumber(Math.round(e.score), locale)}</td>
                  <td className="px-4 py-2">
                    <LeaderboardRowActions creatorId={e.creatorId} name={e.name} pinned={e.isPinned} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-6 rounded-lg border border-line bg-raised" aria-labelledby="hidden-heading">
        <h2 id="hidden-heading" className="section-title flex h-12 items-center border-b border-line px-4">{t("hiddenList")}</h2>
        {hidden.length === 0 ? (
          <p className="px-4 py-5 text-sm text-ink-muted">{t("noHidden")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {hidden.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
                <span>
                  {c.user.displayName ?? c.user.username} <span className="meta">/{c.slug}</span>
                </span>
                <UnhideButton creatorId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
