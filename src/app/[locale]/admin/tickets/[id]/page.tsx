import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTicketView, TicketBadges, loadAdminTicket } from "@/components/admin/tickets/admin-ticket-view";
import { TicketHeaderActions } from "@/components/admin/tickets/ticket-header-actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function AdminTicketDetailPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  const user = await requirePagePermission("tickets.read");
  const [data, t] = await Promise.all([loadAdminTicket(id), getTranslations("admin.tk")]);
  if (!data) notFound();
  const { ticket } = data;
  const open = ticket.status !== "CLOSED" && ticket.status !== "RESOLVED";

  return (
    <div>
      <AdminPageHeader
        title={ticket.subject}
        section={ticket.ticketNumber}
        parent={{ label: t("title"), href: `/${locale}/admin/tickets` }}
        actions={
          <>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/${locale}/admin/tickets`}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("allTickets")}
              </Link>
            </Button>
            <TicketHeaderActions
              ticketId={ticket.id}
              canClaim={open && ticket.assignee?.id !== user.id}
              canEscalate={open && ticket.status !== "ESCALATED"}
            />
          </>
        }
      />
      <div className="-mt-4 mb-6">
        <TicketBadges ticket={ticket} />
      </div>
      <AdminTicketView data={data} locale={locale} />
    </div>
  );
}
