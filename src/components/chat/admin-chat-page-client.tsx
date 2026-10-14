"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ChatChannelType } from "@prisma/client";
import {
  getChatMessages,
  getOrCreateDmChannel,
  listChatChannelsForUser,
  sendChatMessage,
} from "@/actions/team-chat";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { useTeamChatRealtime } from "@/hooks/use-team-chat-realtime";

type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  type: ChatChannelType;
  department: string | null;
  description: string | null;
  unread: number;
  lastMessage: { content: string; createdAt: Date } | null;
  memberCount: number;
};

type StaffRow = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  teamDepartment?: string | null;
};

type MessageRow = {
  id: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
  replyTo: {
    id: string;
    content: string;
    sender: { username: string; displayName: string | null };
  } | null;
  attachments: Array<{
    url: string;
    key: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
};

/** Mindesthöhe des Chats und Abstand zum unteren Fensterrand (entspricht py-8 der Seiten). */
const MIN_HEIGHT = 480;
const BOTTOM_GAP = 32;

function normalizeMessageRows(rows: unknown[]): MessageRow[] {
  return rows.map((row) => {
    const value = row as MessageRow & { attachments?: unknown };
    return {
      ...value,
      attachments: Array.isArray(value.attachments)
        ? (value.attachments as MessageRow["attachments"]).filter(
            (attachment) =>
              typeof attachment?.url === "string" &&
              typeof attachment?.key === "string" &&
              typeof attachment?.fileName === "string"
          )
        : [],
    };
  });
}

export function AdminChatPageClient({
  locale,
  userId,
  currentUserName,
  currentUserRole,
  initialChannels,
  initialStaff,
  initialChannelId,
}: {
  locale: string;
  userId: string;
  currentUserName: string;
  currentUserRole: string;
  initialChannels: ChannelRow[];
  initialStaff: StaffRow[];
  initialChannelId?: string;
}) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const ts = useTranslations("sharedTools.chat");
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [channels, setChannels] = useState(initialChannels);
  const [staff] = useState(initialStaff);
  const [activeChannelId, setActiveChannelId] = useState(
    initialChannelId ?? initialChannels.find((c) => c.slug === "general")?.id ?? initialChannels[0]?.id ?? null
  );
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [channelMeta, setChannelMeta] = useState<{
    name: string;
    type: ChatChannelType;
    description?: string | null;
  } | null>(null);
  const [participants, setParticipants] = useState<
    Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      role: string;
      lastReadAt: Date | null;
    }>
  >([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pending, startTransition] = useTransition();
  const loadingRef = useRef(false);

  // Höhe aus der tatsächlichen Position im Fenster: /admin/chat hat einen Seitenkopf darüber,
  // /team-chat nicht. So füllt der Chat auf beiden Seiten den Rest des Fensters, und nur der
  // Verlauf scrollt (keine zweite Scrollleiste der Seite). Vor dem Messen gilt die CSS-Höhe.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - top - BOTTOM_GAP)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const refreshChannels = useCallback(async () => {
    const result = await listChatChannelsForUser();
    if (result.success) setChannels(result.data.channels as ChannelRow[]);
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMessages(true);
    const result = await getChatMessages(channelId);
    loadingRef.current = false;
    setLoadingMessages(false);
    if (result.success) {
      setMessages(normalizeMessageRows(result.data.messages as unknown[]));
      setChannelMeta({
        name: result.data.channel.name,
        type: result.data.channel.type,
        description: result.data.channel.description,
      });
      setParticipants(result.data.participants as typeof participants);
      void refreshChannels();
    }
  }, [refreshChannels]);

  useEffect(() => {
    if (activeChannelId) void loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  const onRealtimeMessage = useCallback(() => {
    if (activeChannelId) void loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  const { onlineUserIds, typingUsers, sendTyping } = useTeamChatRealtime({
    channelId: activeChannelId,
    currentUser: { id: userId, name: currentUserName, role: currentUserRole },
    onNewMessage: onRealtimeMessage,
  });

  function selectChannel(channelId: string) {
    setActiveChannelId(channelId);
  }

  function startDm(otherUserId: string) {
    startTransition(async () => {
      const result = await getOrCreateDmChannel(otherUserId);
      if (result.success) {
        await refreshChannels();
        setActiveChannelId(result.data.channelId);
      }
    });
  }

  async function handleSend(
    content: string,
    attachments: Array<{ url: string; key: string; fileName: string; mimeType: string; fileSize: number }>
  ) {
    if (!activeChannelId || (!content.trim() && attachments.length === 0)) return;
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await sendChatMessage({ channelId: activeChannelId, content, attachments });
        if (result.success) {
          setMessages((prev) => [...prev, result.data.message as MessageRow]);
          void refreshChannels();
        }
        resolve();
      });
    });
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div
      ref={rootRef}
      className={cn("flex min-h-[480px] gap-4", height === null && "h-[calc(100dvh-var(--header-height)-4rem)]")}
      style={height === null ? undefined : { height }}
    >
      <ChatSidebar
        locale={locale}
        channels={channels}
        staff={staff}
        activeChannelId={activeChannelId}
        onSelect={selectChannel}
        onStartDm={startDm}
        pending={pending}
        onlineUserIds={onlineUserIds}
      />
      <section
        aria-label={channelMeta?.name ?? activeChannel?.name ?? ts("threadLabel")}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-raised"
      >
        {activeChannel && (channelMeta || loadingMessages) ? (
          <>
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="section-title truncate">{channelMeta?.name ?? activeChannel.name}</h2>
                  {(channelMeta?.description ?? activeChannel.description) && (
                    <p className="meta mt-0.5 truncate">
                      {channelMeta?.description ?? activeChannel.description}
                    </p>
                  )}
                </div>
                <div className="meta shrink-0 text-right tabular-nums">
                  <p>{ts("onlineCount", { count: onlineUserIds.length })}</p>
                  <p>{ts("memberCount", { count: participants.length })}</p>
                </div>
              </div>
            </div>
            {channelMeta ? (
              <ChatThread
                locale={locale}
                userId={userId}
                messages={messages}
                participants={participants}
                typingUsers={typingUsers}
                onlineUserIds={onlineUserIds}
                pending={pending}
                onSend={handleSend}
                onTyping={sendTyping}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-muted" role="status">
                {tc("loading")}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-muted">
            {t("selectChannel")}
          </div>
        )}
      </section>
    </div>
  );
}
