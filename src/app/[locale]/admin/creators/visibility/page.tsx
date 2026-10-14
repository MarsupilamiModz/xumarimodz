import { requirePagePermission } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listVisibleCreators } from "@/actions/admin/creators";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { CreatorVisibilityManager } from "@/components/admin/creator-visibility-manager";
import type { Locale } from "@/i18n/config";

export default async function CreatorVisibilityPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requirePagePermission("users.write");
  setRequestLocale(locale);
  const [t, tv] = await Promise.all([getTranslations("ecosystem"), getTranslations("admin.creatorVisibility")]);
  const result = await listVisibleCreators();

  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title={t("visibleCreators")}
        description={tv("subtitle")}
        parent={{ label: t("creatorManagement"), href: `/${locale}/admin/creators` }}
      />
      {result.success ? <CreatorVisibilityManager creators={result.data} /> : <AdminLoadError message={tv("loadError")} />}
    </div>
  );
}
