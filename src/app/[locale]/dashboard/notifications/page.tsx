import { requireAuth } from "@/lib/auth";
import { getNotifications } from "@/actions/notifications";
import { NotificationsList } from "@/components/dashboard/notifications-list";
import type { Locale } from "@/i18n/config";

export default async function NotificationsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requireAuth(`/${locale}/login`);
  const result = await getNotifications();
  const notifications = result.success ? result.data : [];

  return (
    <div>
      <h1 className="h1-acp">Notifications</h1>
      <div className="mt-6">
        <NotificationsList notifications={notifications} locale={locale} />
      </div>
    </div>
  );
}
