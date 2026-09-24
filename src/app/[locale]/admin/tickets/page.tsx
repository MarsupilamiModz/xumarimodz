import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inbox, Maximize2 } from "lucide-react";
import { getTicketsAdmin } from "@/actions/tickets";
import { requirePagePermission } from "@/lib/auth";
import { formatDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/format-locale";
import { ticketTone } from "@/lib/status-tones";
import type { TicketQueue } from "@/lib/ticket-queues";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { AdminTicketView, TicketBadges, loadAdminTicket } from "@/components/admin/tickets/admin-ticket-view";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

const FILTERS = { all: "all", open: "active", closed: "solved" } as const satisfies Record<string, TicketQueue>;
type Filter = keyof typeof FILTERS;
type Params = { filter?: string; q?: string; page?: string; t?: string };

export default async function AdminTicketsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: Params;
}) {
  setRequestLocale(locale);
  await requirePagePermission("tickets.read");
  const [t, ts] = await Promise.all([getTranslations("admin.tk"), getTranslations("status")]);

  const filter: Filter = searchParams.filter && searchParams.filter in FILTERS ? (searchParams.filter as Filter) : "open";
  const q = searchParams.q?.trim() || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const result = await getTicketsAdmin({ page, limit: 30, queue: FILTERS[filter], search: q });
  const tickets = result.success ? result.data.tickets : [];
  const selectedId = searchParams.t ?? tickets[0]?.id;
  const selected = selectedId ? await loadAdminTicket(selectedId) : null;

  const base = `/${locale}/admin/tickets`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    const merged = { filter: filter === "open" ? undefined : filter, q, page: page > 1 ? String(page) : undefined, t: searchParams.t, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  const itemBody = (tk: (typeof tickets)[number]) => (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="mono-id truncate text-ink-faint">{tk.ticketNumber}</span>
        <span className="shrink-0 text-xs tabular-nums text-ink-faint">{formatDate(tk.updatedAt, locale)}</span>
      </span>
      <span className="mt-1 block truncate text-[13px] font-semibold text-ink">{tk.subject}</span>
      <span className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-ink-muted">
          {formatDisplayName(tk.user)} · {t("messages", { count: tk._count.messages })}
        </span>
        <StatusBadge tone={ticketTone(tk.status)} label={ts(`ticket.${tk.status}`)} />
      </span>
    </>
  );

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label={t("list")} className="space-y-3">
          <ChipTabs
            label={t("filter")}
            value={filter}
            options={[
              { value: "all", label: t("filterAll") },
              { value: "open", label: t("filterOpen") },
              { value: "closed", label: t("filterClosed") },
            ]}
            hrefFor={(v) => href({ filter: v === "open" ? undefined : v, page: undefined, t: undefined })}
          />
          <form method="get" action={base}>
            {filter !== "open" && <input type="hidden" name="filter" value={filter} />}
            <SearchField label={t("search")} name="q" defaultValue={q} />
          </form>

          {!result.success ? (
            <AdminLoadError message={t("loadError")} />
          ) : tickets.length === 0 ? (
            <EmptyState icon={Inbox} title={t("emptyTitle")} description={t("emptyText")} />
          ) : (
            <>
              <ul className="overflow-hidden rounded-lg border border-line bg-raised">
                {tickets.map((tk) => {
                  const active = tk.id === selected?.ticket.id;
                  const cls = cn(
                    "relative border-b border-line px-4 py-3 last:border-b-0 transition-colors duration-fast",
                    active ? "bg-violet-soft" : "hover:bg-row-hover"
                  );
                  return (
                    <li key={tk.id}>
                      {/* Ab xl öffnet ein Klick das Ticket rechts, darunter direkt die Detailseite. */}
                      <Link href={href({ t: tk.id })} aria-current={active ? "true" : undefined} className={cn(cls, "hidden xl:block")}>
                        {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-violet" aria-hidden />}
                        {itemBody(tk)}
                      </Link>
                      <Link href={`${base}/${tk.id}`} className={cn(cls, "block xl:hidden")}>
                        {itemBody(tk)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Pagination page={result.data.page} pages={result.data.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined, t: undefined })} />
            </>
          )}
        </section>

        <section className="hidden min-w-0 xl:block" aria-label={selected ? selected.ticket.subject : t("selectTitle")}>
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <TicketBadges ticket={selected.ticket} />
                  <h2 className="truncate text-lg font-semibold text-ink">{selected.ticket.subject}</h2>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`${base}/${selected.ticket.id}`}>
                    <Maximize2 className="h-4 w-4" aria-hidden />
                    {t("fullView")}
                  </Link>
                </Button>
              </div>
              <AdminTicketView data={selected} locale={locale} compact />
            </div>
          ) : (
            <EmptyState icon={Inbox} title={t("selectTitle")} description={t("selectText")} />
          )}
        </section>
      </div>
    </div>
  );
}
