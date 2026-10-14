import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServerCog } from "lucide-react";
import { getCreatorHostingSettings } from "@/actions/creator/hosting";
import { CreatorHostingPanel } from "@/components/creator/creator-hosting-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function CreatorHostingPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const tp = await getTranslations("creatorPages.hosting");
  const result = await getCreatorHostingSettings();

  return (
    <div>
      <PageHeader level="h2" title={tp("title")} description={tp("description")} />
      {result.success ? (
        <CreatorHostingPanel profile={result.data.profile} platformSettings={result.data.platformSettings} />
      ) : (
        <EmptyState icon={ServerCog} title={result.error} />
      )}
    </div>
  );
}
