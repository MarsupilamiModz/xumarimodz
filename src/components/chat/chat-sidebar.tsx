"use client";

import type { ChatChannelType } from "@prisma/client";
import { Hash, MessageCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";

type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  type: ChatChannelType;
  unread: number;
};

type StaffRow = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  teamDepartment?: string | null;
};

function channelIcon(type: ChatChannelType) {
  if (type === "DM") return MessageCircle;
  if (type === "DEPARTMENT") return Users;
  return Hash;
}

export function ChatSidebar({
  locale,
  channels,
  staff,
  activeChannelId,
  onSelect,
  onStartDm,
  pending,
  onlineUserIds,
}: {
  locale: string;
  channels: ChannelRow[];
  staff: StaffRow[];
  activeChannelId: string | null;
  onSelect: (channelId: string) => void;
  onStartDm: (userId: string) => void;
  pending: boolean;
  onlineUserIds: string[];
}) {
  const t = useTranslations("chat");
  const tu = useTranslations("ui");
  const ts = useTranslations("sharedTools.chat");

  const publicChannels = channels.filter((c) => c.type === "PUBLIC");
  const deptChannels = channels.filter((c) => c.type === "DEPARTMENT");
  const dmChannels = channels.filter((c) => c.type === "DM");

  function renderChannel(ch: ChannelRow) {
    const Icon = channelIcon(ch.type);
    const active = ch.id === activeChannelId;
    return (
      <button
        key={ch.id}
        type="button"
        onClick={() => onSelect(ch.id)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-fast",
          active ? "bg-violet-soft text-violet-bright" : "text-ink-muted hover:bg-hover hover:text-ink"
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{ch.name}</span>
        {ch.unread > 0 && (
          <Badge variant="default" className="h-5 min-w-5 justify-center px-1 text-[11px] tabular-nums">
            <span aria-hidden>
              {ch.unread > 99 ? ts("unreadOverflow", { max: formatNumber(99, locale) }) : formatNumber(ch.unread, locale)}
            </span>
            <span className="sr-only">{tu("unreadCount", { count: ch.unread })}</span>
          </Badge>
        )}
      </button>
    );
  }

  return (
    <aside
      aria-label={t("channels")}
      className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-line bg-raised p-3"
    >
      <h2 className="section-title mb-2 px-2">{t("channels")}</h2>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {publicChannels.length > 0 && (
          <div className="space-y-0.5">
            <p className="label-text mb-1 px-2 text-ink-faint">{t("public")}</p>
            {publicChannels.map(renderChannel)}
          </div>
        )}
        {deptChannels.length > 0 && (
          <div className="space-y-0.5">
            <p className="label-text mb-1 px-2 text-ink-faint">{t("departments")}</p>
            {deptChannels.map(renderChannel)}
          </div>
        )}
        {dmChannels.length > 0 && (
          <div className="space-y-0.5">
            <p className="label-text mb-1 px-2 text-ink-faint">{t("directMessages")}</p>
            {dmChannels.map(renderChannel)}
          </div>
        )}

        <div className="space-y-1 border-t border-line pt-2">
          <p className="label-text mb-1 px-2 text-ink-faint">{t("startDm")}</p>
          {staff.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              className="h-8 w-full justify-start gap-2 px-2 font-normal"
              aria-label={ts("messageUser", { name: formatDisplayName(s) })}
              onClick={() => onStartDm(s.id)}
            >
              <div className="relative">
                <UserAvatar src={s.avatarUrl} name={formatDisplayName(s)} className="h-5 w-5" />
                {onlineUserIds.includes(s.id) && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-raised" aria-hidden />
                )}
              </div>
              <span className="truncate text-xs">@{s.username}</span>
              {onlineUserIds.includes(s.id) && <span className="sr-only">{t("online")}</span>}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}
