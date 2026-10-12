import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getUserFavorites } from "@/actions/favorites";
import { ModCard } from "@/components/mods/mod-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function FavoritesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requireAuth(`/${locale}/login`);
  const result = await getUserFavorites();
  const favorites = result.success ? result.data : [];

  return (
    <div>
      <h1 className="h1-acp">Favorites</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {favorites.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <p className="text-muted-foreground">No favorites yet.</p>
            <Button className="mt-4" asChild>
              <Link href={`/${locale}/mods`}>Browse mods</Link>
            </Button>
          </Card>
        ) : (
          favorites.map((f) => (
            <ModCard key={f.id} locale={locale} mod={f.mod} />
          ))
        )}
      </div>
    </div>
  );
}
