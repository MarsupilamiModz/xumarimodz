import Link from "next/link";
import { Heart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getUserFavorites } from "@/actions/favorites";
import { ModCard } from "@/components/mods/mod-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function FavoritesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const [t, ta, tc] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("accountPages.favorites"),
    getTranslations("common"),
  ]);
  const result = await getUserFavorites();
  const favorites = result.success ? result.data : [];

  return (
    <div>
      <PageHeader title={t("favorites")} description={ta("description")} />
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={ta("emptyTitle")}
          description={t("emptyFavorites")}
          action={
            <Button asChild>
              <Link href={`/${locale}/mods`}>{tc("browseMods")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((f) => (
            <ModCard key={f.id} locale={locale} mod={f.mod} />
          ))}
        </div>
      )}
    </div>
  );
}
