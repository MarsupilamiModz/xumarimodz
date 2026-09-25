import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageRole } from "@/lib/action-utils";
import { getAdminPermissionGroups } from "@/actions/admin/branding";
import { getAdminRolePermissions } from "@/actions/admin/permissions";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { CustomRolesEditor } from "@/components/admin/custom-roles-editor";
import { RolePermissionMatrix } from "@/components/admin/role-permission-matrix";
import { ChipTabs } from "@/components/ui/chip-tabs";
import type { Locale } from "@/i18n/config";

export default async function AdminGroupsPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: { tab?: string } }) {
  setRequestLocale(locale);
  const viewer = await requirePagePermission("settings.write");
  const t = await getTranslations("admin.pm");
  const tab = searchParams.tab === "groups" ? "groups" : "roles";
  const base = `/${locale}/admin/groups`;

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "roles", label: t("tabRoles") },
        { value: "groups", label: t("tabGroups") },
      ]}
      hrefFor={(v) => (v === "roles" ? base : `${base}?tab=${v}`)}
    />
  );

  if (tab === "groups") {
    const groups = await getAdminPermissionGroups();
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        {groups.success ? <CustomRolesEditor groups={groups.data} /> : <AdminLoadError message={groups.error} />}
      </div>
    );
  }

  const [rolesResult, counts] = await Promise.all([
    getAdminRolePermissions(),
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  const members = new Map(counts.map((c) => [c.role, c._count._all]));

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
      {rolesResult.success ? (
        <RolePermissionMatrix
          roles={[...rolesResult.data]
            .sort((a, b) => (a.role === "OWNER" ? -1 : b.role === "OWNER" ? 1 : 0))
            .map((r) => ({
              role: r.role,
              permissions: r.permissions.map(String),
              members: members.get(r.role) ?? 0,
              editable: r.role !== "OWNER" && canManageRole(viewer.role, r.role),
            }))}
        />
      ) : (
        <AdminLoadError message={rolesResult.error} />
      )}
    </div>
  );
}
