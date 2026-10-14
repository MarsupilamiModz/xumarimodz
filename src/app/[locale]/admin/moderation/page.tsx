import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getModerationOverview } from "@/actions/admin/moderation";
import { UserModerationPanel } from "@/components/admin/user-moderation-panel";
import { Pagination } from "@/components/ui/pagination";

export default async function AdminModerationPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ q?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const t = await getTranslations("admin.ui.userModeration");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getModerationOverview({ search: searchParams.q, page });
  return (
    <div>
      <AdminPageHeader
        title={t("pageTitle")}
        description={result.success ? t("pageSubtitle", { count: result.data.flagged }) : undefined}
      />
      {result.success ? (
        <>
          <UserModerationPanel locale={locale} users={result.data.users} recentLogs={result.data.recentLogs} search={searchParams.q} />
          <Pagination
            className="mt-8"
            page={result.data.page}
            pages={result.data.pages}
            hrefFor={(p) => {
              const params = new URLSearchParams();
              if (searchParams.q) params.set("q", searchParams.q);
              if (p > 1) params.set("page", String(p));
              const qs = params.toString();
              return `/${locale}/admin/moderation${qs ? `?${qs}` : ""}`;
            }}
          />
        </>
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
