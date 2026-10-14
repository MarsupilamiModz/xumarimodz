import { requireAuth } from "@/lib/auth";
import { getFollowedCreators } from "@/lib/follows";
import { getInlineBadgesForUsers } from "@/lib/user-badges";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { formatDisplayName } from "@/lib/display-name";
import { resolveAssetUrl } from "@/lib/assets";
import Link from "next/link";
import type { Locale } from "@/i18n/config";

export default async function FollowingPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.following")]);
  const user = await requireAuth(`/${locale}/login`);
  const followed = await getFollowedCreators(user.id);
  const badgeMap = await getInlineBadgesForUsers(
    followed.map((c) => c.id),
    locale
  );

  return (
    <div>
      <PageHeader title={t("following")} description={ta("description")} />
      {followed.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("emptyFollowing")}
          description={ta("emptyText")}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/creators`}>{t("discoverCreators")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {followed.map((c) => {
            const badges = badgeMap.get(c.id) ?? [];
            return (
              <Link
                key={c.id}
                href={`/${locale}/creators/${c.creatorProfile!.slug}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-raised p-4 transition-colors duration-fast hover:border-line-control"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <SafeImage
                    src={resolveAssetUrl(c.avatarUrl)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{formatDisplayName(c)}</p>
                  {c.creatorProfile?.tagline && <p className="truncate text-xs text-ink-muted">{c.creatorProfile.tagline}</p>}
                  {badges.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {badges.map((b) => (
                        <AchievementBadge
                          key={b.id}
                          name={b.name}
                          description={b.description}
                          icon={b.icon}
                          rarity={b.rarity}
                          animated={b.animated}
                          glowEffect={b.glowEffect}
                          unlockedAt={b.unlockedAt}
                          size="sm"
                          className="origin-left scale-75"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
