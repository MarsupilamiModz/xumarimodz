import { requirePagePermission } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import NewCreatorForm from "./new-creator-form";
import type { Locale } from "@/i18n/config";

export default async function NewCreatorPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requirePagePermission("users.write");
  setRequestLocale(locale);
  const [t, tn] = await Promise.all([getTranslations("ecosystem"), getTranslations("admin.creatorNew")]);
  return (
    <div>
      <AdminPageHeader
        title={t("createCreator")}
        description={tn("subtitle")}
        parent={{ label: t("creatorManagement"), href: `/${locale}/admin/creators` }}
      />
      <NewCreatorForm locale={locale} />
    </div>
  );
}
