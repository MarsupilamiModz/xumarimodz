"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, Check, Trash2 } from "lucide-react";
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format-locale";
import { getSafeLocale } from "@/lib/i18n/safe-locale";
import { getBrowserSupabase } from "@/lib/supabase/lazy-client";

type NotificationRow = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

const CATEGORY_KEYS = [
  { id: "all", labelKey: "categoriesAll" },
  { id: "support", labelKey: "categoriesSupport" },
  { id: "orders", labelKey: "categoriesOrders" },
  { id: "premium", labelKey: "categoriesPremium" },
  { id: "system", labelKey: "categoriesSystem" },
] as const;

export function NotificationCenter({ locale, userId }: { locale: string; userId?: string | null }) {
  const td = useTranslations("dashboard");
  const tUi = useTranslations("ui");
  const tCommon = useTranslations("common");
  const safeLocale = getSafeLocale(locale);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const refresh = useCallback(async () => {
    const [countRes, listRes] = await Promise.all([
      getUnreadNotificationsCount(),
      getNotifications({ search: debouncedSearch || undefined, category, limit: 30 }),
    ]);
    if (countRes.success) setUnread(countRes.data);
    if (listRes.success) setItems(listRes.data as NotificationRow[]);
  }, [debouncedSearch, category]);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let cleanup: (() => void) | undefined;
    void getBrowserSupabase().then((supabase) => {
      if (!active) return;
      const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        () => void refreshRef.current()
      )
      .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `${tUi("notifications")}, ${tUi("unreadCount", { count: unread })}` : tUi("notifications")}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 && (
            <span aria-hidden
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet px-1 text-[10px] font-bold tabular-nums text-violet-on">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,380px)] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">{td("notifications")}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={pending || unread === 0}
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsRead();
                await refresh();
              })
            }
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> {td("markAllRead")}
          </Button>
        </div>

        <div className="space-y-2 border-b border-line px-3 py-2">
          <Input
            placeholder={td("searchNotifications")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-[13px]"
          />
          <div className="flex flex-wrap gap-1">
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`rounded-sm border px-2 py-0.5 text-xs transition-colors duration-fast ${
 category === c.id
 ? "border-violet-bright bg-violet-soft text-violet-bright"
 : "border-line text-ink-muted hover:text-ink"
 }`}
              >
                {td(c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-muted">{td("noNotifications")}</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`flex gap-2 border-b border-line px-4 py-3 text-sm last:border-0 ${
                  !n.read ? "bg-elevated" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="line-clamp-1 font-medium text-ink hover:text-violet-bright"
                      onClick={() => {
                        if (!n.read) void markNotificationRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="font-medium line-clamp-1">{n.title}</p>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-muted">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {!n.read && <Badge variant="premium" className="px-1.5 py-0 text-[11px]">{tUi("new")}</Badge>}
                    <span className="text-xs text-ink-faint">
                      {formatDateTime(n.createdAt, safeLocale)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={tCommon("delete")}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteNotification(n.id);
                      await refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-line p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link href={`/${locale}/dashboard/notifications`} onClick={() => setOpen(false)}>
              {td("viewAllNotifications")}
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
