import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminBrandingCenter } from "@/actions/admin/branding";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { BrandingCenterPanel } from "@/components/admin/branding-center-panel";

export default async function AdminBrandingPage() {
  await requireAdmin();
  const [t, result] = await Promise.all([getTranslations("admin.brandingPage"), getAdminBrandingCenter()]);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? <BrandingCenterPanel initial={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
