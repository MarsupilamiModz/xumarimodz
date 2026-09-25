import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { listAnnouncements } from "@/actions/admin/announcements";
import { announcementChannels, announcementKind, audienceTargets } from "@/lib/announcement-targeting";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { AnnouncementsEditor } from "@/components/admin/announcements-editor";
import type { Locale } from "@/i18n/config";

export default async function AdminAnnouncementsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, result] = await Promise.all([getTranslations("admin.an2"), listAnnouncements()]);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? (
        <AnnouncementsEditor
          locale={locale}
          items={result.data.map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            link: a.link,
            isActive: a.isActive,
            startsAt: a.startsAt.toISOString(),
            endsAt: a.endsAt?.toISOString() ?? null,
            kind: announcementKind(a.visibilityTargets),
            channels: announcementChannels(a.visibilityTargets),
            audience: audienceTargets(a.visibilityTargets),
          }))}
        />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
