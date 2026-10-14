import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudioProfileUpload } from "@/components/studio/studio-profile-upload";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function PartnerSettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const user = await requireAuth(`/${locale}/login`);
  const [t, tp, profile] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("partnerPages.partnerSettings"),
    prisma.partnerProfile.findUnique({ where: { userId: user.id } }),
  ]);
  if (!profile) {
    return (
      <div>
        <PageHeader level="h2" title={t("profileSettings")} />
        <EmptyState icon={UserRound} title={tp("noProfileTitle")} description={tp("noProfileText")} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader level="h2" title={t("profileSettings")} description={tp("description")} />
      <StudioProfileUpload
        avatarUrl={user.avatarUrl}
        bannerUrl={profile.bannerUrl}
        logoUrl={profile.logoUrl}
        avatarPurpose="partner-avatar"
        bannerPurpose="partner-banner"
        logoPurpose="partner-logo"
        showLogo
      />
    </div>
  );
}
