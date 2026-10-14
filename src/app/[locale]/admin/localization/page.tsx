import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, Languages } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { getAdminTranslations } from "@/actions/admin/localization";
import { getLocalizationOverview, getLocalizationRows } from "@/lib/localization-table";
import { extendedLocaleCatalog, locales, type Locale } from "@/i18n/config";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { LocalizationAdminPanel } from "@/components/admin/localization-admin-panel";
import { TranslationCell, TranslationImport } from "@/components/admin/localization-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";

type Params = { tab?: string; lang?: string; q?: string; missing?: string; page?: string };

export default async function AdminLocalizationPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.lo");
  const base = `/${locale}/admin/localization`;
  const tab = searchParams.tab === "content" ? "content" : "ui";
  const languageName = (l: string) => extendedLocaleCatalog[l]?.nativeName ?? extendedLocaleCatalog[l]?.name ?? l.toUpperCase();

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "ui", label: t("tabUi") },
        { value: "content", label: t("tabContent") },
      ]}
      hrefFor={(v) => (v === "ui" ? base : `${base}?tab=${v}`)}
    />
  );

  if (tab === "content") {
    const result = await getAdminTranslations();
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        {result.success ? <LocalizationAdminPanel jobs={result.data} /> : <AdminLoadError message={result.error} />}
      </div>
    );
  }

  const targets: Locale[] = locales.filter((l) => l !== "en");
  const lang = (targets as readonly string[]).includes(searchParams.lang ?? "") ? (searchParams.lang as Locale) : targets.includes(locale) ? locale : targets[0]!;
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const missingOnly = searchParams.missing === "1";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ lang, q, missing: missingOnly ? "1" : undefined, ...next })) if (v) p.set(k, String(v));
    return `${base}?${p.toString()}`;
  };

  const [overview, table] = await Promise.all([getLocalizationOverview(), getLocalizationRows({ locale: lang, q, missingOnly, page })]);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />

      <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overview.map((o) => {
          const pct = o.total ? Math.round((o.translated / o.total) * 100) : 0;
          return (
            <li key={o.locale}>
              <a
                href={o.locale === "en" ? undefined : href({ lang: o.locale, page: undefined })}
                aria-current={o.locale === lang ? "true" : undefined}
                className={`block rounded-lg border p-3 transition-colors duration-fast ${o.locale === lang ? "border-violet bg-violet-soft" : "border-line bg-raised hover:border-line-control"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink">{languageName(o.locale)}</span>
                  <span className="text-xs tabular-nums text-ink-muted">{pct} %</span>
                </span>
                <span
                  className="mt-2 block h-1.5 rounded-full bg-elevated"
                  role="progressbar"
                  aria-label={t("progressLabel", { language: languageName(o.locale) })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <span className={`block h-1.5 rounded-full ${pct === 100 ? "bg-success" : "bg-violet"}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="meta mt-1.5 block tabular-nums">{t("progress", { translated: o.translated, total: o.total })}</span>
                <span className="meta block">{t("overrides", { count: o.overrides })}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ChipTabs
            label={t("language")}
            value={lang}
            options={targets.map((l) => ({ value: l, label: languageName(l) }))}
            hrefFor={(v) => href({ lang: v, page: undefined })}
          />
          <ChipTabs
            label={t("filter")}
            value={missingOnly ? "missing" : "all"}
            options={[
              { value: "all", label: t("all") },
              { value: "missing", label: t("missingOnly") },
            ]}
            hrefFor={(v) => href({ missing: v === "missing" ? "1" : undefined, page: undefined })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <TranslationImport locale={lang} />
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/admin/localization/export?locale=${lang}`} download>
              <Download className="h-4 w-4" aria-hidden />
              {t("export")}
            </a>
          </Button>
        </div>
      </div>

      <form method="get" action={base} className="mb-4">
        <input type="hidden" name="lang" value={lang} />
        {missingOnly && <input type="hidden" name="missing" value="1" />}
        <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-md" />
      </form>

      <p className="meta mb-2 tabular-nums">
        {t("count", { count: table.total })} · {t("saveHint")}
      </p>

      {table.rows.length === 0 ? (
        <EmptyState icon={Languages} title={t("emptyTitle")} description={missingOnly ? t("emptyMissing") : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-raised">
          <table className="w-full min-w-[760px] text-[13px]">
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th scope="col" className="w-[26%] px-4 py-2 font-medium">{t("colKey")}</th>
                <th scope="col" className="w-[32%] px-4 py-2 font-medium">{t("colSource")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colValue")} · {languageName(lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((r) => (
                <tr key={r.key} className="align-top hover:bg-row-hover">
                  <td className="px-4 py-2.5">
                    <span className="mono-id break-all text-ink-muted">{r.key}</span>
                    <span className="mt-1 flex gap-1">
                      {r.origin === "missing" && <Badge variant="warning">{t("missing")}</Badge>}
                      {r.origin === "override" && <Badge variant="outline">{t("edited")}</Badge>}
                    </span>
                  </td>
                  <td className="whitespace-pre-wrap px-4 py-2.5 text-ink-muted">{r.source}</td>
                  <td className="px-4 py-2">
                    <TranslationCell key={`${lang}:${r.key}`} locale={lang} entryKey={r.key} value={r.value} missing={r.origin === "missing"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination className="mt-6" page={table.page} pages={table.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
    </div>
  );
}
