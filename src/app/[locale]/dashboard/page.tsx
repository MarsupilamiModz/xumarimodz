import Link from "next/link";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { requireAuth, hasPremiumAccess } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { KpiTile, KpiTileSkeleton } from "@/components/ui/kpi-tile";
import { evaluateUserAchievements } from "@/lib/achievements";
import { syncCreatorRanks } from "@/lib/leaderboards";
import { formatDisplayName } from "@/lib/display-name";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { runAfterResponse } from "@/lib/after-response";
import { formatNumber } from "@/lib/format-locale";

async function DashboardStats({
  userId,
  isPremium,
  locale,
}: {
  userId: string;
  isPremium: boolean;
  locale: string;
}) {
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.overview")]);
  const stats = await getDashboardStats(userId);
  const base = `/${locale}/dashboard`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("downloads")} value={formatNumber(stats.downloads, locale)} href={`${base}/downloads`} />
        <KpiTile label={t("favorites")} value={formatNumber(stats.favorites, locale)} href={`${base}/favorites`} />
        <KpiTile
          label={t("premium")}
          value={isPremium ? t("active") : t("free")}
          tone={isPremium ? "success" : undefined}
          href={`${base}/subscription`}
        />
        <KpiTile
          label={t("level")}
          value={ta("levelValue", { level: stats.progress?.level ?? 1 })}
          hint={ta("xp", { xp: formatNumber(stats.progress?.xp ?? 0, locale) })}
          href={`${base}/achievements`}
        />
      </div>

      {stats.unreadNotifications > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-raised p-4">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Bell className="h-4 w-4 text-ink-muted" aria-hidden />
            {t("unreadNotifications", { count: stats.unreadNotifications })}
          </p>
          <Link href={`${base}/notifications`} className="link text-sm">
            {t("viewAllNotifications")}
          </Link>
        </div>
      )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiTileSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function DashboardPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await requireAuth();
  runAfterResponse(Promise.all([evaluateUserAchievements(user.id), syncCreatorRanks()]).catch(() => undefined));

  const isPremium = hasPremiumAccess(user);

  return (
    <div>
      <PageHeader title={t("title")} description={t("welcome", { name: formatDisplayName(user) })} />

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats userId={user.id} isPremium={isPremium} locale={locale} />
      </Suspense>
    </div>
  );
}
