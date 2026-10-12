import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getOwnerTranslationCenter } from "@/actions/admin/translation-center";
import { TranslationCenterPanel } from "@/components/admin/translation-center-panel";

export default async function OwnerTranslationsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin");
  const result = await getOwnerTranslationCenter();
  return (
    <div>
      <AdminPageHeader title={t("nav.localization")} />
      {result.success ? <TranslationCenterPanel {...result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
