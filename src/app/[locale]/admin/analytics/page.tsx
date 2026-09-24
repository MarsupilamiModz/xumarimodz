import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { ANALYTICS_RANGES, getAnalyticsOverview, type AnalyticsRange } from "@/lib/admin-analytics";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { BarChart } from "@/components/admin/bar-chart";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { KpiTile } from "@/components/ui/kpi-tile";
import { formatCompactNumber, formatEuro } from "@/lib/format-locale";
import { safeIntlDateTimeFormat } from "@/lib/i18n/safe-locale";
import type { Locale } from "@/i18n/config";

function ShareList({ rows, total }: { rows: { key: string; label: React.ReactNode; value: number; href?: string }[]; total: number }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
        return (
          <li key={r.key} className="px-4 py-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              {r.href ? (
                <Link href={r.href} className="truncate text-ink hover:text-violet-bright">
                  {r.label}
                </Link>
              ) : (
                <span className="truncate text-ink">{r.label}</span>
              )}
              <span className="shrink-0 tabular-nums text-ink-muted">{r.value.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-elevated" aria-hidden>
              <div className="h-1 rounded-full bg-violet" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-raised">
      <h2 className="section-title flex h-12 items-center border-b border-line px-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { range?: string };
}) {
  setRequestLocale(locale);
  await requirePagePermission("analytics.read");
  const t = await getTranslations("admin.an");
  const range = (ANALYTICS_RANGES.includes(Number(searchParams.range) as AnalyticsRange) ? Number(searchParams.range) : 30) as AnalyticsRange;
  const base = `/${locale}/admin/analytics`;

  let data;
  try {
    data = await getAnalyticsOverview(range);
  } catch (err) {
    console.error("[admin/analytics]", err);
    return (
      <div>
        <AdminPageHeader title={t("title")} />
        <AdminLoadError message={t("loadError")} />
      </div>
    );
  }

  const dayFormat = safeIntlDateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const originTotal = data.origin.browser + data.origin.other;
  const gameTotal = data.byGame.reduce((s, g) => s + g.downloads, 0);

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <ChipTabs
            label={t("range")}
            value={String(range)}
            options={ANALYTICS_RANGES.map((r) => ({ value: String(r), label: t("days", { count: r }) }))}
            hrefFor={(v) => `${base}?range=${v}`}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile label={t("downloads")} value={formatCompactNumber(data.totals.downloads, locale)} />
        <KpiTile label={t("pageViews")} value={formatCompactNumber(data.totals.pageViews, locale)} />
        <KpiTile label={t("visitors")} value={formatCompactNumber(data.totals.visitors, locale)} />
        <KpiTile label={t("newUsers")} value={formatCompactNumber(data.totals.newUsers, locale)} />
        <KpiTile label={t("revenue")} value={formatEuro(data.totals.revenueCents, locale)} />
      </div>

      <div className="mt-4">
        <Section title={t("downloadsPerDay")}>
          <div className="p-4 pt-8">
            {data.totals.downloads === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">{t("empty")}</p>
            ) : (
              <BarChart
                locale={locale}
                label={t("downloadsPerDay")}
                data={data.days.map((d) => ({ key: d.day, label: dayFormat.format(new Date(d.day)), value: d.downloads }))}
              />
            )}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title={t("topMods")}>
          {data.topMods.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>
          ) : (
            <ShareList
              total={data.topMods[0]?.downloads ?? 0}
              rows={data.topMods.map((m) => ({ key: m.id, label: m.title, value: m.downloads, href: `/${locale}/admin/mods/${m.id}` }))}
            />
          )}
        </Section>
        <Section title={t("origin")}>
          {originTotal === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>
          ) : (
            <ShareList
              total={originTotal}
              rows={[
                { key: "browser", label: t("originBrowser"), value: data.origin.browser },
                { key: "other", label: t("originOther"), value: data.origin.other },
              ]}
            />
          )}
        </Section>
        <Section title={t("byGame")}>
          {data.byGame.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>
          ) : (
            <ShareList total={gameTotal} rows={data.byGame.map((g) => ({ key: g.name, label: g.name, value: g.downloads }))} />
          )}
        </Section>
      </div>
    </div>
  );
}
