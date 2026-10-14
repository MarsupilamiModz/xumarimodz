import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { HeaderSkeleton } from "@/components/layout/header-skeleton";
import {
  NAV_LABEL_DEFAULTS,
  resolveNavLabel,
  type NavLabels,
} from "@/components/layout/nav-labels";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { getNavGames } from "@/lib/nav-games";
import { getPlatformLanguages } from "@/lib/languages";
import { getSafeLocale } from "@/lib/i18n/safe-locale";

// Ohne Nutzer: der kommt im Browser (useNavUser). So liest der Header keine Cookies und die Seiten
// bleiben statisch/ISR-fähig.
async function HeaderContent({ locale }: { locale: string }) {
  const safeLocale = getSafeLocale(locale);

  const [t, brandingBundle, navGames, languages] = await Promise.all([
    getTranslations("nav"),
    getCachedPublicBranding(),
    getNavGames(),
    getPlatformLanguages(),
  ]);
  const defaults = NAV_LABEL_DEFAULTS[safeLocale] ?? NAV_LABEL_DEFAULTS.en;

  const navLabels: NavLabels = {
    games: resolveNavLabel(t("games"), defaults.games),
    mods: resolveNavLabel(t("mods"), defaults.mods),
    collections: resolveNavLabel(t("collections"), defaults.collections),
    creators: resolveNavLabel(t("creators"), defaults.creators),
    partners: resolveNavLabel(t("partners"), defaults.partners),
    shop: resolveNavLabel(t("shop"), defaults.shop),
    leaderboards: resolveNavLabel(t("leaderboards"), defaults.leaderboards),
    premium: resolveNavLabel(t("premium"), defaults.premium),
    customOrders: resolveNavLabel(t("customOrders"), defaults.customOrders),
    developers: resolveNavLabel(t("developers"), defaults.developers),
    search: resolveNavLabel(t("search"), defaults.search),
  };

  return (
    <Header
      locale={safeLocale}
      navLabels={navLabels}
      header={brandingBundle.header}
      branding={brandingBundle.branding}
      navGames={navGames}
      allGamesLabel={t("allGames")}
      languages={languages}
    />
  );
}

export function AsyncHeader({ locale }: { locale: string }) {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <HeaderContent locale={locale} />
    </Suspense>
  );
}

