import { setRequestLocale } from "next-intl/server";
import { ServerCog } from "lucide-react";
import { getCreatorHostingSettings } from "@/actions/creator/hosting";
import { CreatorHostingPanel } from "@/components/creator/creator-hosting-panel";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function CreatorHostingPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const result = await getCreatorHostingSettings();
  if (!result.success) {
    return <EmptyState icon={ServerCog} title={result.error} />;
  }
  return <CreatorHostingPanel profile={result.data.profile} platformSettings={result.data.platformSettings} />;
}
