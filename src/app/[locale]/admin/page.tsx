import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crown } from "lucide-react";
import { getAdminAnalytics } from "@/actions/admin/analytics";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatDateTime, formatEuro } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { modTone, ticketTone } from "@/lib/status-tones";
import type { Locale } from "@/i18n/config";

function Panel({
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  title: string;
  href?: string;
  linkLabel: string;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-raised">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <h2 className="section-title">{title}</h2>
        {href && (
          <Link href={href} className="link text-xs font-semibold">
            {linkLabel}
          </Link>
        )}
      </div>
      {empty ? <p className="px-4 py-8 text-center text-sm text-ink-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </section>
  );
}

const rowClass = "flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-[13px]";

export default async function AdminDashboardPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const [t, ts] = await Promise.all([getTranslations("admin.dash"), getTranslations("status")]);
  const result = await getAdminAnalytics();
  const base = `/${locale}/admin`;

  if (!result.success) {
    return (
      <div>
        <AdminPageHeader title={t("title")} />
        <AdminLoadError message={t("loadError")} />
      </div>
    );
  }
  const d = result.data;
  const premiumPercent = d.totalUsers > 0 ? Math.round((d.premiumUsers / d.totalUsers) * 100) : 0;

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiTile label={t("totalUsers")} value={formatCompactNumber(d.totalUsers, locale)} href={`${base}/users`} />
        <KpiTile
          label={t("premiumUsers")}
          value={formatCompactNumber(d.premiumUsers, locale)}
          hint={t("premiumShare", { percent: premiumPercent })}
          href={`${base}/users`}
        />
        <KpiTile label={t("activeSubscriptions")} value={formatCompactNumber(d.activeSubscriptions, locale)} href={`${base}/subscriptions`} />
        <KpiTile
          label={t("openTickets")}
          value={formatCompactNumber(d.openTickets, locale)}
          tone={d.openTickets > 0 ? "warning" : undefined}
          href={`${base}/tickets`}
        />
        <KpiTile
          label={t("bannedUsers")}
          value={formatCompactNumber(d.bannedUsers, locale)}
          tone={d.bannedUsers > 0 ? "danger" : undefined}
          href={`${base}/users?banned=banned`}
        />
        <KpiTile label={t("revenue30d")} value={formatEuro(d.revenue30dCents, locale)} hint={t("revenueHint")} href={`${base}/payments`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title={t("recentTickets")} href={`${base}/tickets`} linkLabel={t("viewAll")} empty={d.recentTickets.length === 0 ? t("noTickets") : null}>
          {d.recentTickets.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`${base}/tickets/${ticket.id}`} className={`${rowClass} hover:bg-row-hover`}>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{ticket.subject}</span>
                  <span className="meta">
                    @{ticket.user.username} · {formatDateTime(ticket.updatedAt, locale)}
                  </span>
                </span>
                <StatusBadge tone={ticketTone(ticket.status)} label={ts(`ticket.${ticket.status}`)} />
              </Link>
            </li>
          ))}
        </Panel>

        <Panel title={t("newUsers")} href={`${base}/users`} linkLabel={t("viewAll")} empty={d.latestUsers.length === 0 ? t("noUsers") : null}>
          {d.latestUsers.map((u) => (
            <li key={u.id}>
              <Link href={`${base}/users/${u.id}`} className={`${rowClass} hover:bg-row-hover`}>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{formatDisplayName(u)}</span>
                  <span className="meta">
                    @{u.username} · {formatDateTime(u.createdAt, locale)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {u.isPremium && (
                    <Badge variant="premium">
                      <Crown className="h-3 w-3" aria-hidden />
                      {t("premium")}
                    </Badge>
                  )}
                  <Badge variant="secondary">{ts(`role.${u.role}`)}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </Panel>

        <Panel title={t("recentUploads")} href={`${base}/mods`} linkLabel={t("viewAll")} empty={d.recentMods.length === 0 ? t("noUploads") : null}>
          {d.recentMods.map((m) => (
            <li key={m.id}>
              <Link href={`${base}/mods/${m.id}`} className={`${rowClass} hover:bg-row-hover`}>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{m.title}</span>
                  <span className="meta">
                    {m.game.name} · {formatDisplayName(m.author)} · {formatDateTime(m.createdAt, locale)}
                  </span>
                </span>
                <StatusBadge tone={modTone(m.status)} label={ts(`mod.${m.status}`)} />
              </Link>
            </li>
          ))}
        </Panel>

        <Panel
          title={t("recentPurchases")}
          href={`${base}/subscriptions`}
          linkLabel={t("viewAll")}
          empty={d.recentPurchases.length === 0 ? t("noPurchases") : null}
        >
          {d.recentPurchases.map((p) => (
            <li key={p.id} className={rowClass}>
              <span className="min-w-0">
                <span className="block truncate text-ink">{p.label}</span>
                <span className="meta">
                  {p.kind === "membership" ? t("membership") : t("mod")} · @{p.username} · {formatDateTime(p.createdAt, locale)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{formatEuro(p.amountCents, locale)}</span>
            </li>
          ))}
        </Panel>
      </div>
    </div>
  );
}
