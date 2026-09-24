import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { getTrustCenterStats } from "@/actions/admin/trust";

export default async function AdminTrustPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("moderation.reports");
  const t = await getTranslations("admin");
  const result = await getTrustCenterStats();
  const stats = result.success
    ? [
        { label: "Offene Meldungen", value: result.data.openReports, href: `/${locale}/admin/reports` },
        { label: "Malware-Meldungen", value: result.data.malwareReports, href: `/${locale}/admin/reports` },
        { label: "Offene DMCA-Fälle", value: result.data.openDMCA, href: `/${locale}/admin/dmca` },
        { label: "Erledigte Meldungen", value: result.data.resolvedReports, href: `/${locale}/admin/reports` },
        { label: "Suchanfragen", value: result.data.searchQueries },
        { label: "Klicks auf Empfehlungen", value: result.data.recommendationClicks },
      ]
    : [];
  return (
    <div>
      <AdminPageHeader title={t("nav.security")} />
      {!result.success ? (
        <AdminLoadError message={result.error} />
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => {
            const body = (
              <>
                <dt className="text-sm text-ink-muted">{s.label}</dt>
                <dd className="mt-1 text-[28px] font-bold tabular-nums text-ink">{s.value}</dd>
              </>
            );
            return s.href ? (
              <Link key={s.label} href={s.href} className="rounded-lg border border-line bg-raised p-5 transition-colors duration-fast hover:border-line-control">
                {body}
              </Link>
            ) : (
              <div key={s.label} className="rounded-lg border border-line bg-raised p-5">
                {body}
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
