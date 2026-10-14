import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { listTeamMembersAdmin } from "@/actions/admin/team";
import { listTeamDepartmentsAdmin, listTeamProfilesAdmin } from "@/actions/admin/team-profiles";
import { TeamAdminPanel } from "@/components/admin/team-admin-panel";
import { TeamManagementPanel } from "@/components/admin/team-management-panel";
import { ChipTabs } from "@/components/ui/chip-tabs";

export default async function AdminTeamPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const [t, staff, departments, profiles] = await Promise.all([
    getTranslations("admin.teamPage"),
    listTeamMembersAdmin(),
    listTeamDepartmentsAdmin(),
    listTeamProfilesAdmin(),
  ]);
  const tab = searchParams.tab === "staff" ? "staff" : "page";
  const base = `/${locale}/admin/team`;

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <ChipTabs
            label={t("tabs")}
            value={tab}
            options={[
              { value: "page", label: t("tabPage") },
              { value: "staff", label: t("tabStaff") },
            ]}
            hrefFor={(v) => (v === "page" ? base : `${base}?tab=${v}`)}
          />
        }
      />
      {tab === "page" ? (
        departments.success && profiles.success ? (
          <TeamManagementPanel departments={departments.data} profiles={profiles.data} />
        ) : (
          <AdminLoadError message={!departments.success ? departments.error : !profiles.success ? profiles.error : ""} />
        )
      ) : staff.success ? (
        <TeamAdminPanel members={staff.data.members} groups={staff.data.groups} departments={staff.data.departments} />
      ) : (
        <AdminLoadError message={staff.error} />
      )}
    </div>
  );
}
