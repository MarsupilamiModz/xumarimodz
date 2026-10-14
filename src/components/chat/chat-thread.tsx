"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Paperclip } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SafeImage } from "@/components/ui/safe-image";
import { formatDisplayName } from "@/lib/display-name";
import { formatDateTime } from "@/lib/format-locale";
import { formatBytes } from "@/lib/file-size";
import { useR2MultipartUpload } from "@/hooks/use-r2-multipart-upload";
import { cn } from "@/lib/utils";

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

function renderContent(content: string) {
  const parts = content.split(/(@[a-zA-Z0-9_]{2,32})/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-violet-bright">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function ChatThread({
  locale,
  userId,
  messages,
  participants,
  typingUsers,
  onlineUserIds,
  pending,
  onSend,
  onTyping,
}: {
  locale: string;
  userId: string;
  messages: MessageRow[];
  participants: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    lastReadAt: Date | null;
  }>;
  typingUsers: Array<{ id: string; name: string; role: string }>;
  onlineUserIds: string[];
  pending: boolean;
  onSend: (
    content: string,
    attachments: Array<{ url: string; key: string; fileName: string; mimeType: string; fileSize: number }>
  ) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}) {
  const t = useTranslations("chat");
  const ts = useTranslations("sharedTools.chat");
  const tr = useTranslations("status.role");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const { upload, uploading, progress, error: uploadError } = useR2MultipartUpload();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit() {
    if (!content.trim() && files.length === 0) return;
    const uploadedAttachments: Array<{
      url: string;
      key: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }> = [];

    for (const file of files) {
      const result = await upload({ file, purpose: "chat-attachment" });
      uploadedAttachments.push({
        url: result.url ?? "",
        key: result.key,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
    }

    await onSend(content, uploadedAttachments);
    setContent("");
    setFiles([]);
    onTyping(false);
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-label={ts("historyLabel")}>
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("emptyChannel")}</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender.id === userId;
            const readers = participants.filter(
              (participant) =>
                participant.id !== userId &&
                participant.lastReadAt &&
                new Date(participant.lastReadAt).getTime() >= new Date(msg.createdAt).getTime()
            );
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", mine ? "flex-row-reverse" : "flex-row")}
              >
                <UserAvatar
                  src={msg.sender.avatarUrl}
                  name={formatDisplayName(msg.sender)}
                  className="h-8 w-8 shrink-0"
                />
                <div className={cn("min-w-0 max-w-[75%]", mine && "text-right")}>
                  <div className={cn("mb-0.5 flex flex-wrap items-center gap-2", mine && "justify-end")}>
                    <span className="text-xs font-medium text-ink">{formatDisplayName(msg.sender)}</span>
                    <span className="rounded-sm border border-line px-1.5 text-[11px] font-medium text-ink-muted">
                      {tr.has(msg.sender.role) ? tr(msg.sender.role) : msg.sender.role}
                    </span>
                    <time className="meta tabular-nums" dateTime={new Date(msg.createdAt).toISOString()}>
                      {formatDateTime(msg.createdAt, locale)}
                    </time>
                  </div>
                  {msg.replyTo && (
                    <p className="meta mb-1 border-l-2 border-line-control pl-2">
                      {formatDisplayName(msg.replyTo.sender)}: {msg.replyTo.content.slice(0, 80)}
                    </p>
                  )}
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-left text-sm text-ink",
                      mine ? "border-line bg-hover" : "border-line bg-elevated"
                    )}
                  >
                    {renderContent(msg.content)}
                  </div>
                  {msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((attachment) => (
                        <div key={attachment.key} className="rounded-lg border border-line bg-elevated p-2 text-left">
                          {attachment.mimeType.startsWith("image/") ? (
                            <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
                              <SafeImage
                                src={attachment.url}
                                alt={attachment.fileName}
                                width={480}
                                height={320}
                                className="max-h-56 w-auto rounded-md object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm text-ink transition-colors duration-fast hover:text-violet-bright"
                            >
                              <Paperclip className="h-4 w-4" aria-hidden />
                              <span className="truncate">{attachment.fileName}</span>
                              {attachment.fileSize > 0 && (
                                <span className="meta shrink-0 tabular-nums">{formatBytes(attachment.fileSize, locale)}</span>
                              )}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {mine && readers.length > 0 && (
                    <p className="meta mt-1">
                      {t("readBy")}: {readers.map((reader) => formatDisplayName(reader)).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-line p-3">
        {typingUsers.length > 0 && (
          <p className="meta" aria-live="polite">
            {ts("typing", { names: typingUsers.map((user) => user.name).join(", "), count: typingUsers.length })}
          </p>
        )}
        <Textarea
          aria-label={ts("messageLabel")}
          placeholder={t("messagePlaceholder")}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping(true);
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => onTyping(false), 1200);
          }}
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,application/pdf,.zip,.txt,.log,.json"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
            {files.map((file) => (
              <span key={`${file.name}-${file.size}`} className="rounded-sm border border-line px-2 py-0.5">
                {file.name} <span className="tabular-nums">· {formatBytes(file.size, locale)}</span>
              </span>
            ))}
          </div>
        )}
        {uploadError && <p className="text-sm text-danger" role="alert">{uploadError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="meta">{t("mentionHint")}</p>
            {onlineUserIds.length > 0 && (
              <p className="meta tabular-nums">{ts("onlineCount", { count: onlineUserIds.length })}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" aria-hidden />
              {t("attach")}
            </Button>
            <Button
              size="sm"
              disabled={pending || uploading || (!content.trim() && files.length === 0)}
              onClick={submit}
            >
              {uploading ? ts("uploadingProgress", { progress }) : t("send")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
