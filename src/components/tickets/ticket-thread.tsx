"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TicketStatus } from "@prisma/client";
import {
  replyToTicket,
  closeTicket,
  reopenTicket,
  addInternalNote,
  uploadTicketAttachment,
  getTicketAttachmentUrl,
} from "@/actions/tickets";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/hooks/use-toast";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/ticket-labels";
import { ticketTone } from "@/lib/status-tones";
import { formatDisplayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";
import { Paperclip, Download } from "lucide-react";
import { formatDateTime } from "@/lib/format-locale";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  messageId?: string | null;
};

type Message = {
  id: string;
  content: string;
  isStaff: boolean;
  isInternal?: boolean;
  createdAt: Date;
  sender: { username: string; displayName?: string | null; avatarUrl: string | null; role: string };
  attachments?: Attachment[];
};

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: keyof typeof TICKET_CATEGORY_LABELS;
  priority: keyof typeof TICKET_PRIORITY_LABELS;
  status: TicketStatus;
  closedAt: Date | null;
  user: { username: string };
  messages: Message[];
  attachments?: Attachment[];
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TicketAttachmentButton({ attachment }: { attachment: Attachment }) {
  const t = useTranslations("accountPages.supportTicket");
  const [pending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await getTicketAttachmentUrl(attachment.id);
      if (result.success) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        toast({ title: "toast.error", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={pending}
      aria-label={t("download", { file: attachment.fileName })}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-elevated px-2 py-1 text-xs text-ink transition-colors duration-fast hover:bg-hover disabled:opacity-50"
    >
      <Download className="h-3 w-3" aria-hidden />
      {attachment.fileName}
      <span className="text-ink-faint">({formatFileSize(attachment.fileSize)})</span>
    </button>
  );
}

export function TicketThread({
  ticket,
  isStaff,
  canReply,
}: {
  ticket: Ticket;
  isStaff: boolean;
  canReply: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("accountPages.supportTicket");
  const ts = useTranslations("status");
  const [content, setContent] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(messageId?: string) {
    for (const file of files) {
      const formData = new FormData();
      formData.set("ticketId", ticket.id);
      formData.set("file", file);
      if (messageId) formData.set("messageId", messageId);
      const result = await uploadTicketAttachment(formData);
      if (!result.success) {
        toast({ title: "toast.uploadFailed", description: result.error, variant: "destructive" });
      }
    }
  }

  function sendReply() {
    if (!content.trim() && files.length === 0) return;
    startTransition(async () => {
      let messageId: string | undefined;
      if (content.trim()) {
        const result = await replyToTicket(ticket.id, content, isStaff);
        if (!result.success) {
          toast({ title: "toast.error", description: result.error, variant: "destructive" });
          return;
        }
        messageId = result.data?.messageId;
      }
      if (files.length > 0) {
        await uploadFiles(messageId);
      }
      setContent("");
      setFiles([]);
      toast({ title: "toast.replySent" });
      window.location.reload();
    });
  }

  function sendInternalNote() {
    if (!internalNote.trim() || !isStaff) return;
    startTransition(async () => {
      const result = await addInternalNote(ticket.id, internalNote);
      if (result.success) {
        setInternalNote("");
        toast({ title: "toast.internalNoteAdded" });
        window.location.reload();
      } else {
        toast({ title: "toast.error", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeTicket(ticket.id, !isStaff);
      if (result.success) {
        toast({ title: "toast.ticketClosed" });
        window.location.reload();
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenTicket(ticket.id);
      if (result.success) {
        toast({ title: "toast.ticketReopened" });
        window.location.reload();
      }
    });
  }

  const orphanAttachments =
    ticket.attachments?.filter((a) => !a.messageId) ?? [];

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="mono-id">{ticket.ticketNumber}</span>
            <span>{t("category", { category: ts(`category.${ticket.category}`) })}</span>
            <span>{t("priority", { priority: ts(`priority.${ticket.priority}`) })}</span>
          </span>
        }
        actions={<StatusBadge tone={ticketTone(ticket.status)} label={ts(`ticket.${ticket.status}`)} />}
      />

      <div className="space-y-6">
        {orphanAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {orphanAttachments.map((a) => (
              <TicketAttachmentButton key={a.id} attachment={a} />
            ))}
          </div>
        )}

        <ul className="space-y-4">
          {ticket.messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "flex gap-3 rounded-lg border p-4",
                msg.isInternal
                  ? "border-line bg-warning-soft"
                  : msg.isStaff
                    ? "ml-0 mr-8 border-line-control bg-elevated"
                    : "ml-8 mr-0 border-line bg-raised"
              )}
            >
              <UserAvatar
                src={msg.sender.avatarUrl}
                name={msg.sender.displayName ?? msg.sender.username}
                className="h-8 w-8 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink">{formatDisplayName(msg.sender)}</span>
                  {msg.isInternal && <Badge variant="warning">{t("internal")}</Badge>}
                  {msg.isStaff && !msg.isInternal && <Badge variant="outline">{t("staff")}</Badge>}
                  <span>{formatDateTime(msg.createdAt, locale)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.attachments.map((a) => (
                      <TicketAttachmentButton key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canReply && ticket.status !== "CLOSED" && (
          <SectionCard>
            <div className="space-y-3">
              <label htmlFor="ticket-reply" className="label-text">
                {t("replyLabel")}
              </label>
              <Textarea
                id="ticket-reply"
                placeholder={t("replyPlaceholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf,.zip,.txt,.log"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
                  {files.map((f) => (
                    <span key={f.name} className="rounded-sm border border-line px-2 py-0.5">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={sendReply}
                  disabled={pending || (!content.trim() && files.length === 0)}
                >
                  {t("sendReply")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                  {t("attach")}
                </Button>
                <Button variant="ghost" onClick={handleClose} disabled={pending}>
                  {t("close")}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {isStaff && ticket.status !== "CLOSED" && (
          <div className="space-y-3 rounded-lg bg-warning-soft p-4">
            <label htmlFor="ticket-internal" className="label-text text-warning">
              {t("internalTitle")}
            </label>
            <Textarea
              id="ticket-internal"
              placeholder={t("internalPlaceholder")}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={sendInternalNote}
              disabled={pending || !internalNote.trim()}
            >
              {t("addInternal")}
            </Button>
          </div>
        )}

        {ticket.status === "CLOSED" && (
          <Button variant="outline" onClick={handleReopen} disabled={pending}>
            {t("reopen")}
          </Button>
        )}
      </div>
    </div>
  );
}
