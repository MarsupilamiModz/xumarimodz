import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { getAdminEmailTemplates } from "@/actions/admin/email";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { EmailTemplatesPanel } from "@/components/admin/email-templates-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminEmailTemplatesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, result] = await Promise.all([getTranslations("admin.et"), getAdminEmailTemplates()]);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} parent={{ label: t("back"), href: `/${locale}/admin/email` }} />
      {result.success ? <EmailTemplatesPanel templates={result.data} /> : <AdminLoadError message={t("loadError")} />}
    </div>
  );
}
