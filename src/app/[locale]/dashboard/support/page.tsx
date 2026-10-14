import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getTicketsForUser } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ticketTone } from "@/lib/status-tones";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export default async function SupportPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const [t, ta, ts] = await Promise.all([
    getTranslations("support"),
    getTranslations("accountPages.support"),
    getTranslations("status"),
  ]);
  const result = await getTicketsForUser();
  const tickets = result.success ? result.data.tickets : [];
  const newHref = `/${locale}/dashboard/support/new`;

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={ta("description")}
        actions={
          <Button asChild>
            <Link href={newHref}>
              <Plus className="h-4 w-4" aria-hidden /> {t("newTicket")}
            </Link>
          </Button>
        }
      />

      <DataTable
        caption={t("title")}
        rows={tickets}
        rowKey={(ticket) => ticket.id}
        rowHref={(ticket) => `/${locale}/dashboard/support/${ticket.id}`}
        empty={
          <EmptyState
            icon={LifeBuoy}
            title={t("emptyTickets")}
            description={ta("emptyText")}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={newHref}>{ta("firstTicket")}</Link>
              </Button>
            }
          />
        }
        columns={[
          {
            key: "ticket",
            header: ta("colTicket"),
            width: "minmax(0,2fr)",
            cell: (ticket) => (
              <span className="block min-w-0">
                <span className="mono-id block text-ink-faint">{ticket.ticketNumber}</span>
                <span className="block truncate font-medium text-ink">{ticket.subject}</span>
              </span>
            ),
          },
          {
            key: "category",
            header: ta("colCategory"),
            width: "minmax(0,1fr)",
            hideOnMobile: true,
            cell: (ticket) => <span className="block truncate text-ink-muted">{ts(`category.${ticket.category}`)}</span>,
          },
          {
            key: "messages",
            header: ta("colMessages"),
            width: "110px",
            align: "right",
            hideOnMobile: true,
            cell: (ticket) => formatNumber(ticket._count.messages, locale),
          },
          {
            key: "status",
            header: ta("colStatus"),
            width: "170px",
            cell: (ticket) => <StatusBadge tone={ticketTone(ticket.status)} label={ts(`ticket.${ticket.status}`)} />,
          },
        ]}
      />
    </div>
  );
}
