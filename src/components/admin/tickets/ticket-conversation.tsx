"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Loader2, Lock, Paperclip, X } from "lucide-react";
import {
  addInternalNote,
  closeTicket,
  getTicketAttachmentUrl,
  reopenTicket,
  replyToTicket,
  uploadTicketAttachment,
} from "@/actions/tickets";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

export type ConversationAttachment = { id: string; fileName: string; fileSize: number; messageId?: string | null };
export type ConversationItem =
  | {
      kind: "message";
      id: string;
      at: string;
      content: string;
      isStaff: boolean;
      isInternal: boolean;
      sender: { name: string; avatarUrl: string | null };
      attachments: ConversationAttachment[];
    }
  | { kind: "system"; id: string; at: string; text: string };

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentButton({ attachment }: { attachment: ConversationAttachment }) {
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await getTicketAttachmentUrl(attachment.id);
          if (r.success) window.open(r.data.url, "_blank", "noopener,noreferrer");
          else appToast.error(r.error);
        })
      }
      className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-line bg-elevated px-2 text-xs text-ink hover:border-line-control"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Download className="h-3 w-3" aria-hidden />}
      {attachment.fileName}
      <span className="text-ink-faint">({formatFileSize(attachment.fileSize)})</span>
    </button>
  );
}

/**
 * Ticket-Verlauf fürs ACP: Nachrichten (Team violett, interne Notizen gelb), Status-Wechsel als Systemzeilen,
 * darunter Antwortfeld mit Tabs „Antwort“ / „Interne Notiz“ oder – bei geschlossenem Ticket – der Hinweis mit „Wieder öffnen“.
 */
export function TicketConversation({
  ticketId,
  closed,
  customerName,
  items,
  locale,
}: {
  ticketId: string;
  closed: boolean;
  customerName: string;
  items: ConversationItem[];
  locale: string;
}) {
  const t = useTranslations("admin.tk");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const text = mode === "reply" ? reply : note;
  const setText = mode === "reply" ? setReply : setNote;

  function insertSnippet(snippet: string) {
    setText((prev) => (prev ? `${prev}${prev.endsWith("\n") ? "" : "\n\n"}${snippet}` : snippet));
  }

  async function uploadFiles(messageId?: string) {
    for (const file of files) {
      const fd = new FormData();
      fd.set("ticketId", ticketId);
      fd.set("file", file);
      if (messageId) fd.set("messageId", messageId);
      const r = await uploadTicketAttachment(fd);
      if (!r.success) appToast.error(t("uploadFailed", { name: file.name }));
    }
  }

  function send(andClose: boolean) {
    if (!reply.trim()) return;
    startTransition(async () => {
      const r = await replyToTicket(ticketId, reply, true);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      if (files.length > 0) await uploadFiles(r.data.messageId);
      if (andClose) {
        const c = await closeTicket(ticketId);
        if (!c.success) {
          appToast.error(c.error);
          return;
        }
      }
      setReply("");
      setFiles([]);
      appToast.updated(andClose ? t("sentClosed") : t("sent"));
      router.refresh();
    });
  }

  function saveNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const r = await addInternalNote(ticketId, note);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setNote("");
      appToast.updated(t("noteSaved"));
      router.refresh();
    });
  }

  function reopen() {
    startTransition(async () => {
      const r = await reopenTicket(ticketId);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.updated(t("reopened"));
      router.refresh();
    });
  }

  const snippets = [
    { key: "greeting", label: t("snippetGreeting"), text: t("snippetGreetingText", { name: customerName }) },
    { key: "info", label: t("snippetInfo"), text: t("snippetInfoText") },
    { key: "done", label: t("snippetDone"), text: t("snippetDoneText") },
  ];

  return (
    <div className="space-y-4">
      <ol className="space-y-3" aria-label={t("title")}>
        {items.map((item) =>
          item.kind === "system" ? (
            <li key={item.id} className="flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span>
                {item.text} · <time dateTime={item.at}>{formatDateTime(item.at, locale)}</time>
              </span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </li>
          ) : (
            <li
              key={item.id}
              className={cn(
                "flex gap-3 rounded-lg border p-4",
                item.isInternal
                  ? "border-warning/40 bg-warning-soft"
                  : item.isStaff
                    ? "border-violet/30 bg-violet-soft"
                    : "border-line bg-raised"
              )}
            >
              <UserAvatar src={item.sender.avatarUrl} name={item.sender.name} className="h-8 w-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span className="text-[13px] font-semibold text-ink">{item.sender.name}</span>
                  {item.isInternal ? (
                    <Badge variant="warning">
                      <Lock className="mr-1 h-3 w-3" aria-hidden />
                      {t("internal")}
                    </Badge>
                  ) : (
                    item.isStaff && <Badge variant="default">{t("team")}</Badge>
                  )}
                  <time dateTime={item.at}>{formatDateTime(item.at, locale)}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{item.content}</p>
                {item.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.attachments.map((a) => (
                      <AttachmentButton key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        )}
      </ol>

      {closed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-raised p-4">
          <p className="text-sm text-ink-muted">{t("closedNotice")}</p>
          <Button variant="outline" onClick={reopen} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("reopen")}
          </Button>
        </div>
      ) : (
        <div className={cn("rounded-lg border p-4", mode === "note" ? "border-warning/40 bg-warning-soft" : "border-line bg-raised")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label={t("composer")} className="inline-flex rounded-md border border-line bg-canvas p-0.5">
              {(["reply", "note"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  aria-controls={`${uid}-text`}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-[30px] rounded px-3 text-xs font-semibold transition-colors duration-fast",
                    mode === m ? (m === "note" ? "bg-warning-soft text-warning" : "bg-elevated text-ink") : "text-ink-muted hover:text-ink"
                  )}
                >
                  {m === "reply" ? t("tabReply") : t("tabNote")}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-faint">{t("snippets")}:</span>
              {snippets.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => insertSnippet(s.text)}
                  className="h-[26px] rounded-md border border-line px-2 text-xs text-ink-muted hover:border-line-control hover:text-ink"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor={`${uid}-text`} className="sr-only">
            {mode === "reply" ? t("replyLabel") : t("noteLabel")}
          </label>
          <Textarea id={`${uid}-text`} value={text} onChange={(e) => setText(e.target.value)} rows={5} />
          {mode === "note" && <p className="meta mt-1.5 text-warning">{t("noteHint")}</p>}

          {mode === "reply" && files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <li key={f.name} className="inline-flex h-[26px] items-center gap-1 rounded-md border border-line px-2 text-xs text-ink-muted">
                  {f.name}
                  <button
                    type="button"
                    aria-label={t("remove", { name: f.name })}
                    onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                    className="text-ink-faint hover:text-ink"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {mode === "reply" ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,application/pdf,.zip,.txt,.log"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={pending}>
                  <Paperclip className="h-4 w-4" aria-hidden />
                  {t("attach")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => send(true)} disabled={pending || !reply.trim()}>
                    {t("sendClose")}
                  </Button>
                  <Button type="button" onClick={() => send(false)} disabled={pending || !reply.trim()}>
                    {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {t("send")}
                  </Button>
                </div>
              </>
            ) : (
              <Button type="button" className="ml-auto" onClick={saveNote} disabled={pending || !note.trim()}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t("addNote")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
