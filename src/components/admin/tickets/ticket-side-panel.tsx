"use client";

import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import type { TicketDepartment, TicketPriority, TicketStatus } from "@prisma/client";
import {
  addTicketTags,
  addTicketWatcher,
  assignTicket,
  removeTicketWatcher,
  transferTicketDepartment,
  updateTicketPriority,
  updateTicketStatus,
} from "@/actions/tickets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppToast } from "@/hooks/use-app-toast";

const STATUSES: TicketStatus[] = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "WAITING_FOR_USER", "WAITING_FOR_STAFF", "ESCALATED", "RESOLVED", "CLOSED"];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"];
const DEPARTMENTS: TicketDepartment[] = ["SUPPORT", "MODERATION", "CREATOR_MANAGEMENT", "PARTNER_MANAGEMENT", "BILLING", "TECHNICAL_SUPPORT", "ADMINISTRATION"];

function formatDuration(ms: number) {
  const minutes = Math.floor(Math.abs(ms) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 > 0 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function SlaRow({ label, due, met }: { label: string; due: string | null; met: boolean }) {
  const t = useTranslations("admin.tk");
  // Zeit erst nach dem Mount lesen, damit Server- und Client-HTML übereinstimmen.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (met || !due) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [due, met]);

  let tone: StatusTone = "neutral";
  let badge = t("slaNone");
  let detail = "";
  if (due && met) {
    tone = "success";
    badge = t("slaMet");
  } else if (due && now !== null) {
    const ms = new Date(due).getTime() - now;
    if (ms < 0) {
      tone = "danger";
      badge = t("slaOverdue");
      detail = t("slaOverdueBy", { duration: formatDuration(ms) });
    } else {
      tone = ms < 60 * 60 * 1000 ? "warning" : "pending";
      badge = t("slaOpen");
      detail = t("slaLeft", { duration: formatDuration(ms) });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="flex items-center gap-2">
        {detail && <span className="text-xs tabular-nums text-ink-faint">{detail}</span>}
        <StatusBadge tone={tone} label={badge} />
      </span>
    </div>
  );
}

function Chip({ label, removeLabel, onRemove, disabled }: { label: string; removeLabel: string; onRemove: () => void; disabled?: boolean }) {
  return (
    <li className="inline-flex h-[26px] items-center gap-1 rounded-md border border-line bg-elevated pl-2 pr-1 text-xs text-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:bg-hover hover:text-ink"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line p-4 last:border-b-0">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

export function TicketSidePanel({
  locale,
  ticket,
  staffUsers,
}: {
  locale: string;
  ticket: {
    id: string;
    status: TicketStatus;
    priority: TicketPriority;
    department: TicketDepartment;
    assigneeId: string | null;
    slaResponseDueAt: string | null;
    slaResolveDueAt: string | null;
    firstResponseAt: string | null;
    watchers: { userId: string; username: string }[];
    tags: string[];
    user: { id: string; name: string; username: string; email: string; avatarUrl: string | null };
    createdAt: string;
  };
  staffUsers: { id: string; username: string }[];
}) {
  const t = useTranslations("admin.tk");
  const ts = useTranslations("status");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [tagInput, setTagInput] = useState("");

  const resolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.updated(t("updated"));
      router.refresh();
    });
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || ticket.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setTagInput("");
    run(() => addTicketTags(ticket.id, [...ticket.tags, tag]));
  }

  const watcherIds = new Set(ticket.watchers.map((w) => w.userId));
  const watcherOptions = staffUsers.filter((s) => !watcherIds.has(s.id));

  return (
    <aside className="rounded-lg border border-line bg-raised" aria-busy={pending}>
      <Section title="SLA">
        <SlaRow label={t("slaResponse")} due={ticket.slaResponseDueAt} met={!!ticket.firstResponseAt || resolved} />
        <SlaRow label={t("slaResolve")} due={ticket.slaResolveDueAt} met={resolved} />
      </Section>

      <Section title={t("details")}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-status`} className="label-text mb-1.5 block text-ink-muted">{t("status")}</label>
            <Select value={ticket.status} onValueChange={(v) => run(() => updateTicketStatus(ticket.id, v as TicketStatus))} disabled={pending}>
              <SelectTrigger id={`${uid}-status`} className="h-[30px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(`ticket.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-priority`} className="label-text mb-1.5 block text-ink-muted">{t("priority")}</label>
            <Select value={ticket.priority} onValueChange={(v) => run(() => updateTicketPriority(ticket.id, v as TicketPriority))} disabled={pending}>
              <SelectTrigger id={`${uid}-priority`} className="h-[30px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{ts(`priority.${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-dept`} className="label-text mb-1.5 block text-ink-muted">{t("department")}</label>
            <Select value={ticket.department} onValueChange={(v) => run(() => transferTicketDepartment(ticket.id, v as TicketDepartment))} disabled={pending}>
              <SelectTrigger id={`${uid}-dept`} className="h-[30px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{ts(`department.${d}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-assignee`} className="label-text mb-1.5 block text-ink-muted">{t("assignee")}</label>
            <Select
              value={ticket.assigneeId ?? "__none__"}
              onValueChange={(v) => run(() => assignTicket(ticket.id, v === "__none__" ? null : v))}
              disabled={pending}
            >
              <SelectTrigger id={`${uid}-assignee`} className="h-[30px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("unassigned")}</SelectItem>
                {staffUsers.map((s) => <SelectItem key={s.id} value={s.id}>@{s.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title={t("watchers")}>
        {ticket.watchers.length === 0 ? (
          <p className="text-xs text-ink-faint">{t("noWatchers")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {ticket.watchers.map((w) => (
              <Chip
                key={w.userId}
                label={`@${w.username}`}
                removeLabel={t("remove", { name: `@${w.username}` })}
                disabled={pending}
                onRemove={() => run(() => removeTicketWatcher(ticket.id, w.userId))}
              />
            ))}
          </ul>
        )}
        {watcherOptions.length > 0 && (
          <Select value="" onValueChange={(v) => v && run(() => addTicketWatcher(ticket.id, v))} disabled={pending}>
            <SelectTrigger aria-label={t("addWatcher")} className="h-[30px] text-xs">
              <SelectValue placeholder={t("addWatcher")} />
            </SelectTrigger>
            <SelectContent>
              {watcherOptions.map((s) => <SelectItem key={s.id} value={s.id}>@{s.username}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </Section>

      <Section title={t("tags")}>
        {ticket.tags.length === 0 ? (
          <p className="text-xs text-ink-faint">{t("noTags")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {ticket.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                removeLabel={t("remove", { name: tag })}
                disabled={pending}
                onRemove={() => run(() => addTicketTags(ticket.id, ticket.tags.filter((x) => x !== tag)))}
              />
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addTag();
          }}
        >
          <label htmlFor={`${uid}-tag`} className="sr-only">{t("addTag")}</label>
          <Input id={`${uid}-tag`} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder={t("addTag")} maxLength={40} className="h-[30px] text-xs" />
          <Button type="submit" variant="outline" size="icon" className="h-[30px] w-[30px] shrink-0" aria-label={t("addTag")} disabled={pending || !tagInput.trim()}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </Section>

      <Section title={t("submittedBy")}>
        <Link href={`/${locale}/admin/users/${ticket.user.id}`} className="flex items-center gap-3 rounded-md hover:text-violet-bright">
          <UserAvatar src={ticket.user.avatarUrl} name={ticket.user.name} className="h-9 w-9" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{ticket.user.name}</span>
            <span className="block truncate text-xs text-ink-faint">@{ticket.user.username} · {ticket.user.email}</span>
          </span>
        </Link>
      </Section>
    </aside>
  );
}
