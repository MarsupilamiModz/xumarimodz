import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getNotifications } from "@/actions/notifications";
import { NotificationsList } from "@/components/dashboard/notifications-list";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function NotificationsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.notifications")]);
  const result = await getNotifications();
  const notifications = result.success ? result.data : [];

  return (
    <div>
      <PageHeader title={t("notifications")} description={ta("description")} />
      <NotificationsList notifications={notifications} locale={locale} />
    </div>
  );
}
