import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getTicketDetail } from "@/actions/tickets";
import { TicketThread } from "@/components/tickets/ticket-thread";
import type { Locale } from "@/i18n/config";

export default async function TicketDetailPage(
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
  await requireAuth(`/${locale}/login`);
  const ta = await getTranslations("accountPages.support");
  const result = await getTicketDetail(id);
  if (!result.success) notFound();

  const { ticket } = result.data;

  return (
    <div className="max-w-3xl">
      <Link
        href={`/${locale}/dashboard/support`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {ta("back")}
      </Link>
      <TicketThread
        ticket={ticket}
        isStaff={false}
        canReply={ticket.status !== "CLOSED"}
      />
    </div>
  );
}
