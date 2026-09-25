"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionTry, canManageRole, fail, ok, requireActionPermission } from "@/lib/action-utils";
import { createAuditLog } from "@/lib/audit";
import {
  getRolePermissionMap,
  getRolePermissionsForAdmin,
  invalidatePermissionCache,
  saveRolePermissions,
} from "@/lib/permission-store";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import type { PermissionKey } from "@/lib/permissions";

export async function getAdminRolePermissions() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  const map = await getRolePermissionMap();
  return ok(
    ASSIGNABLE_ROLES.map((role) => ({
      role,
      permissions: map[role] ?? [],
    }))
  );
}

export async function updateAdminRolePermissions(role: UserRole, permissions: string[]) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  if (!ASSIGNABLE_ROLES.includes(role)) return fail("Invalid role");
  // Owner hat immer alle Rechte und ist nicht editierbar; Admins dürfen nur Rollen unterhalb von Owner ändern.
  if (role === "OWNER") return fail("The Owner role is locked");
  if (!canManageRole(user.role, role)) return fail("You cannot edit this role");

  const validKeys = new Set(Object.keys(await import("@/lib/permissions").then((m) => m.PERMISSIONS)));
  const cleaned = permissions.filter((p) => p === "*" || validKeys.has(p));

  const before = new Set((await getRolePermissionMap())[role] ?? []);
  return actionTry(async () => {
    await saveRolePermissions(role, cleaned);
    await createAuditLog({
      actorId: user.id,
      action: "permissions.role_update",
      entityType: "PermissionGroup",
      entityId: role,
      metadata: {
        added: cleaned.filter((p) => !before.has(p as PermissionKey)),
        removed: Array.from(before).filter((p) => !cleaned.includes(p)),
      },
    });
    revalidatePath("/admin/groups");
  }, "permissions:save-role");
}

export async function getAdminRolePermissionsForRole(role: UserRole) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const permissions = await getRolePermissionsForAdmin(role);
  return ok(permissions);
}

export async function deletePermissionGroup(id: string) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  const group = await prisma.permissionGroup.findUnique({ where: { id } });
  if (!group) return fail("Group not found");
  if (group.isSystem) return fail("System groups cannot be deleted");

  return actionTry(async () => {
    await prisma.user.updateMany({
      where: { permissionGroupId: id },
      data: { permissionGroupId: null },
    });
    await prisma.permissionGroup.delete({ where: { id } });
    invalidatePermissionCache();
    revalidatePath("/admin/groups");
  }, "permissions:delete-group");
}

export type { PermissionKey };
