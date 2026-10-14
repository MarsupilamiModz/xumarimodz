import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGamesAndCategories } from "@/lib/data";
import { ModForm } from "@/components/creator/mod-form";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function NewModPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("creator");
  const tp = await getTranslations("creatorPages.productForm");
  const catalog = await getGamesAndCategories().catch(() => []);
  const games = catalog.map(({ id, name, modes }) => ({ id, name, modes }));
  const categories = catalog.flatMap((g) => g.categories);

  return (
    <div>
      <PageHeader level="h2" title={t("newMod")} description={tp("description")} />
      <ModForm locale={locale} games={games} categories={categories} />
    </div>
  );
}
