import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { listTeamMembersAdmin } from "@/actions/admin/team";
import { listTeamDepartmentsAdmin, listTeamProfilesAdmin } from "@/actions/admin/team-profiles";
import { TeamAdminPanel } from "@/components/admin/team-admin-panel";
import { TeamManagementPanel } from "@/components/admin/team-management-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminTeamPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const [staff, departments, profiles] = await Promise.all([
    listTeamMembersAdmin(),
    listTeamDepartmentsAdmin(),
    listTeamProfilesAdmin(),
  ]);
  return (
    <div>
      <AdminPageHeader title="Team" />
      <Tabs defaultValue="page">
        <TabsList>
          <TabsTrigger value="page">Team-Seite</TabsTrigger>
          <TabsTrigger value="staff">Mitarbeiter und Rollen</TabsTrigger>
        </TabsList>
        <TabsContent value="page">
          {departments.success && profiles.success ? (
            <TeamManagementPanel departments={departments.data} profiles={profiles.data} />
          ) : (
            <AdminLoadError message={!departments.success ? departments.error : !profiles.success ? profiles.error : ""} />
          )}
        </TabsContent>
        <TabsContent value="staff">
          {staff.success ? (
            <TeamAdminPanel members={staff.data.members} groups={staff.data.groups} departments={staff.data.departments} />
          ) : (
            <AdminLoadError message={staff.error} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
