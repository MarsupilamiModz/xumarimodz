import { requirePagePermission } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import NewPartnerForm from "./new-partner-form";
import type { Locale } from "@/i18n/config";

export default async function NewPartnerPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requirePagePermission("users.write");
  setRequestLocale(locale);
  const [t, te] = await Promise.all([getTranslations("admin.partnerNew"), getTranslations("ecosystem")]);
  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        parent={{ label: te("partnerManagement"), href: `/${locale}/admin/partners` }}
      />
      <NewPartnerForm locale={locale} />
    </div>
  );
}
