"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTransition } from "react";
import { formatDateTime } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationsList({ notifications, locale }: { notifications: Notification[]; locale: string }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tu = useTranslations("ui");
  const [pending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title={t("noNotifications")} description={t("emptyNotifications")} />;
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await markAllNotificationsRead();
            router.refresh();
          })
        }
      >
        <CheckCheck className="h-4 w-4" aria-hidden />
        {t("markAllRead")}
      </Button>
      <ul className="space-y-2">
        {notifications.map((n) => {
          const content = (
            <>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{n.title}</span>
                {!n.read && <StatusBadge tone="info" label={tu("new")} />}
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{n.body}</span>
            </>
          );
          return (
            <li
              key={n.id}
              className={cn("rounded-lg border bg-raised p-4", n.read ? "border-line" : "border-line-control")}
              onClick={() =>
                !n.read &&
                startTransition(async () => {
                  await markNotificationRead(n.id);
                })
              }
            >
              {n.link ? (
                <Link href={n.link} className="block hover:text-ink">
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
              <p className="meta mt-2">{formatDateTime(n.createdAt, locale)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
