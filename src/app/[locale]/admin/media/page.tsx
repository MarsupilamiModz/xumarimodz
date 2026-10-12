import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminMediaCenter, type MediaSection } from "@/actions/admin/media-center";
import { MediaCenterPanel } from "@/components/admin/media-center-panel";

export default async function AdminMediaPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ section?: string; page?: string; status?: string; q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin");
  const section = (searchParams.section as MediaSection | undefined) ?? "mods";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getAdminMediaCenter({ section, page, status: searchParams.status, q: searchParams.q });
  return (
    <div>
      <AdminPageHeader title={t("nav.media")} />
      {result.success ? (
        <MediaCenterPanel
          locale={locale}
          section={section}
          items={result.data.items}
          total={result.data.total}
          page={result.data.page}
          pages={result.data.pages}
        />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
