import { requirePagePermission } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { getPartnerAdmin } from "@/actions/admin/partners";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PartnerAdminPanel } from "@/components/admin/partner-admin-panel";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function AdminPartnerDetailPage(
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
  const [t, ta, result] = await Promise.all([getTranslations("ecosystem"), getTranslations("admin"), getPartnerAdmin(id)]);
  if (!result.success) notFound();

  return (
    <div>
      <AdminPageHeader
        title={result.data.user.displayName ?? result.data.user.username}
        description={`@${result.data.user.username} · ${result.data.user.email}`}
        section={ta("partnerDetail.section")}
        parent={{ label: t("partnerManagement"), href: `/${locale}/admin/partners` }}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/partners/${result.data.slug}`}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("viewPublicProfile")}
            </Link>
          </Button>
        }
      />
      <PartnerAdminPanel locale={locale} partner={result.data} />
    </div>
  );
}
