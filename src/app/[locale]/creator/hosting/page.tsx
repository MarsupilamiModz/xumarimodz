import { setRequestLocale } from "next-intl/server";
import { ServerCog } from "lucide-react";
import { getCreatorHostingSettings } from "@/actions/creator/hosting";
import { CreatorHostingPanel } from "@/components/creator/creator-hosting-panel";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function CreatorHostingPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const result = await getCreatorHostingSettings();
  if (!result.success) {
    return <EmptyState icon={ServerCog} title={result.error} />;
  }
  return <CreatorHostingPanel profile={result.data.profile} platformSettings={result.data.platformSettings} />;
}
