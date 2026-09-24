import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getTicketActivity, getTicketDetail } from "@/actions/tickets";
import { prisma } from "@/lib/db";
import { formatDisplayName } from "@/lib/display-name";
import { ticketTone } from "@/lib/status-tones";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TicketConversation, type ConversationItem } from "@/components/admin/tickets/ticket-conversation";
import { TicketSidePanel } from "@/components/admin/tickets/ticket-side-panel";
import { cn } from "@/lib/utils";

/** Team-Mitglieder für Zuständig/Beobachter; ändert sich selten, daher 5 Minuten gecacht. */
export const getTicketStaff = unstable_cache(
  () =>
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "ADMIN", "MODERATOR", "SUPPORT"] }, deletedAt: null },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    }),
  ["ticket-staff"],
  { revalidate: 300, tags: ["ticket-staff"] }
);

export async function loadAdminTicket(id: string) {
  const [detail, activity, staff] = await Promise.all([getTicketDetail(id), getTicketActivity(id), getTicketStaff()]);
  if (!detail.success) return null;
  return { ticket: detail.data.ticket, activity: activity.success ? activity.data : [], staff };
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadAdminTicket>>>;

function meta(value: unknown, key: string): string | undefined {
  if (value && typeof value === "object" && key in value) {
    const v = (value as Record<string, unknown>)[key];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export async function TicketBadges({ ticket }: { ticket: Loaded["ticket"] }) {
  const ts = await getTranslations("status");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mono-id text-ink-muted">{ticket.ticketNumber}</span>
      <Badge variant="outline">{ts(`department.${ticket.department}`)}</Badge>
      <Badge variant={ticket.priority === "URGENT" || ticket.priority === "CRITICAL" ? "destructive" : "outline"}>
        {ts(`priority.${ticket.priority}`)}
      </Badge>
      <StatusBadge tone={ticketTone(ticket.status)} label={ts(`ticket.${ticket.status}`)} />
    </div>
  );
}

/** Verlauf + Seitenpanel eines Tickets; genutzt in der Liste (rechte Spalte) und auf der Detailseite. */
export async function AdminTicketView({ data, locale, compact = false }: { data: Loaded; locale: string; compact?: boolean }) {
  const [t, ts] = await Promise.all([getTranslations("admin.tk"), getTranslations("status")]);
  const { ticket, activity, staff } = data;

  const systemText = (action: string, metadata: unknown): string | null => {
    switch (action) {
      case "ticket.status_change": {
        const to = meta(metadata, "to");
        return to ? t("sysStatus", { status: ts(`ticket.${to}`) }) : null;
      }
      case "ticket.priority_change": {
        const to = meta(metadata, "to");
        return to ? t("sysPriority", { priority: ts(`priority.${to}`) }) : null;
      }
      case "ticket.transfer": {
        const d = meta(metadata, "department");
        return d ? t("sysTransfer", { department: ts(`department.${d}`) }) : null;
      }
      case "ticket.assign":
        return t("sysAssign");
      case "ticket.claim":
        return t("sysClaim");
      case "ticket.escalate":
        return t("sysEscalate");
      case "ticket.tags_update":
        return t("sysTags");
      case "ticket.watcher_add":
      case "ticket.watcher_remove":
        return t("sysWatcher");
      default:
        return null;
    }
  };

  const items: ConversationItem[] = [
    ...ticket.messages.map(
      (m): ConversationItem => ({
        kind: "message",
        id: m.id,
        at: m.createdAt.toISOString(),
        content: m.content,
        isStaff: m.isStaff,
        isInternal: m.isInternal,
        sender: { name: formatDisplayName(m.sender), avatarUrl: m.sender.avatarUrl },
        attachments: m.attachments.map((a) => ({ id: a.id, fileName: a.fileName, fileSize: a.fileSize })),
      })
    ),
    ...activity.flatMap((log): ConversationItem[] => {
      const text = systemText(log.action, log.metadata);
      return text ? [{ kind: "system", id: log.id, at: log.createdAt.toISOString(), text: t("system", { actor: log.actor, text }) }] : [];
    }),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const orphanAttachments = ticket.attachments.filter((a) => !a.messageId);
  if (orphanAttachments.length > 0 && items[0]?.kind === "message") {
    items[0] = {
      ...items[0],
      attachments: [...items[0].attachments, ...orphanAttachments.map((a) => ({ id: a.id, fileName: a.fileName, fileSize: a.fileSize }))],
    };
  }

  const tags = Array.isArray(ticket.tags) ? ticket.tags.filter((x): x is string => typeof x === "string") : [];

  return (
    <div className={cn("grid items-start gap-6", compact ? "2xl:grid-cols-[minmax(0,1fr)_300px]" : "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <TicketConversation
        ticketId={ticket.id}
        closed={ticket.status === "CLOSED"}
        customerName={ticket.user.username}
        items={items}
        locale={locale}
      />
      <TicketSidePanel
        locale={locale}
        staffUsers={staff}
        ticket={{
          id: ticket.id,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          assigneeId: ticket.assignee?.id ?? null,
          slaResponseDueAt: ticket.slaResponseDueAt?.toISOString() ?? null,
          slaResolveDueAt: ticket.slaResolveDueAt?.toISOString() ?? null,
          firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
          watchers: ticket.watchers.map((w) => ({ userId: w.userId, username: w.user.username })),
          tags,
          user: {
            id: ticket.user.id,
            name: formatDisplayName(ticket.user),
            username: ticket.user.username,
            email: ticket.user.email,
            avatarUrl: ticket.user.avatarUrl,
          },
          createdAt: ticket.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
