import { Suspense } from "react";
import { requireAuth, hasPremiumAccess } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Heart, Crown, Trophy } from "lucide-react";
import { evaluateUserAchievements } from "@/lib/achievements";
import { syncCreatorRanks } from "@/lib/leaderboards";
import { formatDisplayName } from "@/lib/display-name";
import { getDashboardStats } from "@/lib/dashboard-stats";

async function DashboardStats({
  userId,
  isPremium,
}: {
  userId: string;
  isPremium: boolean;
}) {
  const t = await getTranslations("dashboard");
  const stats = await getDashboardStats(userId);

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("downloads")}</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.downloads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("favorites")}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.favorites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("premium")}</CardTitle>
            <Crown className="h-4 w-4 text-violet-bright" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isPremium ? t("active") : t("free")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("level")}</CardTitle>
            <Trophy className="h-4 w-4 text-ink-muted" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Lv.{stats.progress?.level ?? 1}</p>
            <p className="text-xs text-muted-foreground">{(stats.progress?.xp ?? 0).toLocaleString()} XP</p>
          </CardContent>
        </Card>
      </div>

      {stats.unreadNotifications > 0 && (
        <Card className="mt-6 border-line-control">
          <CardContent className="py-4 text-sm">
            You have <strong>{stats.unreadNotifications}</strong> {t("notifications").toLowerCase()}.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-24 animate-pulse" />
      ))}
    </div>
  );
}

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await requireAuth();
  void Promise.all([evaluateUserAchievements(user.id), syncCreatorRanks()]).catch(() => undefined);

  const isPremium = hasPremiumAccess(user);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("welcome", { name: formatDisplayName(user) })}</p>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats userId={user.id} isPremium={isPremium} />
      </Suspense>
    </div>
  );
}
