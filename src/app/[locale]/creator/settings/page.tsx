import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreatorSettingsForm } from "@/components/creator/creator-settings-form";
import { CreatorProfileUpload } from "@/components/creator/creator-profile-upload";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/config";

export default async function CreatorSettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tp = await getTranslations("creatorPages.settings");
  const user = await requireAuth(`/${locale}/login`);

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { bannerUrl: true, user: { select: { avatarUrl: true } } },
  });
  if (!profile) notFound();

  return (
    <div>
      <PageHeader level="h2" title={t("profileSettings")} description={tp("description")} />
      <div className="space-y-6">
        <CreatorProfileUpload avatarUrl={profile.user.avatarUrl} bannerUrl={profile.bannerUrl} />
        <CreatorSettingsForm locale={locale} />
      </div>
    </div>
  );
}
