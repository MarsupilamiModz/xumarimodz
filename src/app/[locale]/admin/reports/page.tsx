import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { getAdminReports } from "@/actions/admin/trust";
import { ReportsAdminPanel } from "@/components/admin/reports-admin-panel";
import { Pagination } from "@/components/ui/pagination";

export default async function AdminReportsPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("moderation.reports");
  const t = await getTranslations("admin");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getAdminReports({ page });
  return (
    <div>
      <AdminPageHeader
        title={t("nav.reports")}
        actions={
          <Link href={`/${locale}/admin/dmca`} className="link text-sm font-semibold">
            DMCA
          </Link>
        }
      />
      {result.success ? (
        <>
          <ReportsAdminPanel reports={result.data.reports} />
          <Pagination
            className="mt-8"
            page={result.data.page}
            pages={result.data.pages}
            hrefFor={(p) => `/${locale}/admin/reports${p > 1 ? `?page=${p}` : ""}`}
          />
        </>
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
