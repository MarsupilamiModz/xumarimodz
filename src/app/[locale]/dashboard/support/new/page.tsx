import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function NewTicketPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const [t, ta, tn] = await Promise.all([
    getTranslations("support"),
    getTranslations("accountPages.support"),
    getTranslations("accountPages.supportNew"),
  ]);

  return (
    <div className="max-w-xl">
      <Link
        href={`/${locale}/dashboard/support`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {ta("back")}
      </Link>
      <PageHeader title={t("newTicket")} description={tn("description")} />
      <CreateTicketForm locale={locale} />
    </div>
  );
}
