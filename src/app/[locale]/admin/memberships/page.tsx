import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserCheck } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { getAdminMembershipPlans, getPremiumPageAdminSettings } from "@/actions/admin/memberships";
import { getManualMemberships } from "@/lib/admin-billing";
import { formatDate } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { MembershipsAdminPanel } from "@/components/admin/memberships-admin-panel";
import { GrantMembershipForm, RevokeMembershipButton } from "@/components/admin/manual-memberships";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function AdminMembershipsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, plansResult, pageResult, manual] = await Promise.all([
    getTranslations("admin.mg"),
    getAdminMembershipPlans(),
    getPremiumPageAdminSettings(),
    getManualMemberships().catch((err) => {
      console.error("[admin/memberships]", err);
      return null;
    }),
  ]);

  if (!plansResult.success || !pageResult.success) {
    return (
      <div>
        <AdminPageHeader title={t("title")} />
        <AdminLoadError message={t("loadError")} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} />
        <MembershipsAdminPanel plans={plansResult.data} pageSettings={pageResult.data} locale={locale} />
      </div>

      <section aria-labelledby="manual-memberships">
        <h2 id="manual-memberships" className="section-title mb-3">{t("manual")}</h2>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {manual === null ? (
            <AdminLoadError message={t("loadError")} />
          ) : (
            <DataTable
              caption={t("manual")}
              rows={manual}
              rowKey={(m) => m.user.id}
              empty={<EmptyState icon={UserCheck} title={t("emptyTitle")} description={t("emptyText")} />}
              columns={[
                {
                  key: "user",
                  header: t("colUser"),
                  width: "minmax(0,1.5fr)",
                  cell: (m) => (
                    <span className="min-w-0">
                      <a href={`/${locale}/admin/users/${m.user.id}`} className="block truncate font-medium text-ink hover:text-violet-bright">
                        {formatDisplayName(m.user)}
                      </a>
                      <span className="block truncate text-xs text-ink-faint">@{m.user.username}</span>
                    </span>
                  ),
                },
                { key: "plan", header: t("colPlan"), cell: (m) => <span className="truncate text-ink-muted">{m.plan}</span> },
                {
                  key: "until",
                  header: t("colUntil"),
                  width: "110px",
                  cell: (m) => <span className="tabular-nums text-ink-muted">{m.until ? formatDate(m.until, locale) : t("forever")}</span>,
                },
                {
                  key: "granted",
                  header: t("colGranted"),
                  width: "110px",
                  hideOnMobile: true,
                  cell: (m) => <span className="tabular-nums text-ink-muted">{formatDate(m.grantedAt, locale)}</span>,
                },
                {
                  key: "revoke",
                  header: "",
                  width: "100px",
                  align: "right",
                  cell: (m) => <RevokeMembershipButton userId={m.user.id} username={m.user.username} />,
                },
              ]}
            />
          )}
          <GrantMembershipForm plans={plansResult.data.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </section>
    </div>
  );
}
