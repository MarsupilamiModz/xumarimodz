import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminReferrals } from "@/actions/admin/referrals";
import { ReferralsAdminPanel } from "@/components/admin/referrals-admin-panel";

export default async function AdminReferralsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const result = await getAdminReferrals();
  return (
    <div>
      <AdminPageHeader title="Referrals" />
      {result.success ? <ReferralsAdminPanel data={result.data} locale={locale} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
