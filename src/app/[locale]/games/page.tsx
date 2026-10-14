import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gamepad2 } from "lucide-react";
import { getAllGames } from "@/lib/data";
import { GameCard } from "@/components/games/game-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export const revalidate = 60; // REVALIDATE.catalog – Next verlangt ein Literal

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "games" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function GamesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("games");
  const games = await getAllGames().catch(() => []);

  return (
    <div className="page-section">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {games.length === 0 ? (
        <EmptyState icon={Gamepad2} title={t("empty")} />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <li key={game.id}>
              <GameCard locale={locale} game={game} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
