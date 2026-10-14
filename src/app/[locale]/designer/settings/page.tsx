import { getTranslations } from "next-intl/server";
import { requireDesigner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudioProfileUpload } from "@/components/studio/studio-profile-upload";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function DesignerSettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale: _locale
  } = params;

  const user = await requireDesigner();
  const [t, tp, profile] = await Promise.all([
    getTranslations("designer"),
    getTranslations("partnerPages.designerSettings"),
    prisma.designerProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("settings")} description={tp("description")} />
      <StudioProfileUpload
        avatarUrl={profile?.avatarUrl ?? user.avatarUrl}
        bannerUrl={profile?.bannerUrl}
        avatarPurpose="designer-avatar"
        bannerPurpose="designer-banner"
      />
    </div>
  );
}
