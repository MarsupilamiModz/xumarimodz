import { requirePagePermission } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCreatorAdmin } from "@/actions/admin/creators";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CreatorAdminPanel } from "@/components/admin/creator-admin-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminCreatorDetailPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  await requirePagePermission("users.read");
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("ecosystem"), getTranslations("admin.creatorEdit")]);
  const result = await getCreatorAdmin(id);
  if (!result.success) notFound();

  return (
    <div>
      <AdminPageHeader
        title={result.data.user.displayName ?? result.data.user.username}
        description={`@${result.data.user.username} · ${result.data.user.email}`}
        section={tc("section")}
        parent={{ label: t("creatorManagement"), href: `/${locale}/admin/creators` }}
      />
      <CreatorAdminPanel locale={locale} creator={result.data} />
    </div>
  );
}
