import { requirePagePermission } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import NewCreatorForm from "./new-creator-form";
import type { Locale } from "@/i18n/config";

export default async function NewCreatorPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requirePagePermission("users.write");
  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  return (
    <div className="space-y-4">
      <h1 className="h1-acp">{t("createCreator")}</h1>
      <NewCreatorForm locale={locale} />
    </div>
  );
}
