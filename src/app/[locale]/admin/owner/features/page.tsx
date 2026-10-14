import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getOwnerFeatureFlags } from "@/actions/admin/feature-flags";
import { FeatureFlagsPanel } from "@/components/admin/feature-flags-panel";

export default async function OwnerFeaturesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const [t, result] = await Promise.all([getTranslations("admin.ownerFeatures"), getOwnerFeatureFlags()]);
  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? <FeatureFlagsPanel initial={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
