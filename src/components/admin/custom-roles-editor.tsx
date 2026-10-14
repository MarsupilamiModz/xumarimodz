"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { colors } from "@/styles/tokens";
import { memo, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Plus, Shield, Trash2 } from "lucide-react";
import {
  duplicatePermissionGroup,
  reorderPermissionGroups,
  savePermissionGroup,
} from "@/actions/admin/branding";
import { deletePermissionGroup } from "@/actions/admin/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  PERMISSION_UI_GROUPS,
  UNGROUPED_PERMISSIONS,
  filterPermissionsBySearch,
} from "@/lib/permission-ui";
import { useSlugField } from "@/hooks/use-slug-field";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchField } from "@/components/ui/search-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatGroupLabel } from "@/lib/role-display";
import { cn } from "@/lib/utils";

const HIERARCHY_TIERS = [
  "Owner",
  "Admin",
  "Moderator",
  "Support",
  "Custom",
  "Creator",
  "Partner",
  "Premium",
  "User",
];

const DASHBOARD_OPTIONS = ["admin", "creator", "partner", "dashboard", "premium"];

// Rechte-Texte wie in der Rechte-Matrix (admin.pm.p.<recht_mit_unterstrich>).
const msgKey = (permission: string) => permission.replace(/\./g, "_");

export type CustomRole = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: unknown;
  isSystem: boolean;
  color?: string | null;
  badge?: string | null;
  icon?: string | null;
  hierarchyTier?: string | null;
  dashboardAccess?: unknown;
  sortOrder?: number;
  isDisabled?: boolean;
};

function PermissionPicker({
  selected,
  onChange,
  search,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  search: string;
}) {
  const t = useTranslations("admin.ui.customRoles");
  const tPm = useTranslations("admin.pm");
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((p) => p !== key) : [...selected, key]);
  };
  const describe = (key: string) => (tPm.has(`p.${msgKey(key)}`) ? tPm(`p.${msgKey(key)}`) : PERMISSIONS[key as keyof typeof PERMISSIONS]);

  const groups = useMemo(
    () =>
      PERMISSION_UI_GROUPS.map((g) => ({
        ...g,
        keys: filterPermissionsBySearch(search, g.keys),
      })).filter((g) => g.keys.length > 0),
    [search]
  );

  const ungrouped = filterPermissionsBySearch(search, UNGROUPED_PERMISSIONS);

  const row = (key: string, withDescription: boolean) => (
    <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="mono-id text-ink">{key}</span>
        {withDescription && <span className="meta block">{describe(key)}</span>}
      </span>
      <Switch checked={selected.includes(key)} onCheckedChange={() => toggle(key)} />
    </label>
  );

  return (
    <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="label-text">{tPm.has(`g.${group.id}`) ? tPm(`g.${group.id}`) : group.label}</p>
          <div className="space-y-2">{group.keys.map((key) => row(key, true))}</div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div className="space-y-2">
          <p className="label-text">{t("otherGroupLabel")}</p>
          {ungrouped.map((key) => row(key, false))}
        </div>
      )}
      <label className="flex items-center justify-between gap-3 rounded-md border border-line-control bg-elevated px-3 py-2 text-sm">
        <span className="mono-id text-ink">{t("fullAccessLabel")}</span>
        <Switch checked={selected.includes("*")} onCheckedChange={() => toggle("*")} />
      </label>
    </div>
  );
}

/** Feld mit sichtbarem Label. */
function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
    </div>
  );
}

function CustomRolesEditorInner({ groups: initial }: { groups: CustomRole[] }) {
  const t = useTranslations("admin.ui.customRoles");
  const tp = useTranslations("admin.panelCustomRoles");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [roles, setRoles] = useState(initial);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [name, setName] = useState("");
  const { slug, setSlug } = useSlugField(name);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(colors.violet);
  const [badge, setBadge] = useState("");
  const [icon, setIcon] = useState("");
  const [hierarchyTier, setHierarchyTier] = useState("");
  const [dashboardAccess, setDashboardAccess] = useState<string[]>([]);
  const [isDisabled, setIsDisabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState("");
  const [deleteRole, setDeleteRole] = useState<CustomRole | null>(null);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor(colors.violet);
    setBadge("");
    setIcon("shield");
    setHierarchyTier("Custom");
    setDashboardAccess([]);
    setIsDisabled(false);
    setSelected([]);
    setPermSearch("");
  };

  const startEdit = (role: CustomRole) => {
    if (role.isSystem) return;
    setEditing(role);
    setName(role.name);
    setSlug(role.slug);
    setDescription(role.description ?? "");
    setColor(role.color ?? colors.violet);
    setBadge(role.badge ?? "");
    setIcon(role.icon ?? "");
    setHierarchyTier(role.hierarchyTier ?? "");
    setDashboardAccess(Array.isArray(role.dashboardAccess) ? role.dashboardAccess.map(String) : []);
    setIsDisabled(role.isDisabled ?? false);
    setSelected(Array.isArray(role.permissions) ? role.permissions.map(String) : []);
  };

  const saveRole = () => {
    if (!name.trim()) {
      appToast.error(t("roleNameRequired"));
      return;
    }
    startTransition(async () => {
      const r = await savePermissionGroup({
        id: editing?.id,
        slug: slug.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: selected,
        color: color || undefined,
        badge: badge.trim() || undefined,
        icon: icon.trim() || undefined,
        hierarchyTier: hierarchyTier || undefined,
        dashboardAccess,
        sortOrder: editing?.sortOrder ?? roles.length,
        isDisabled,
      });
      if (r.success) {
        const autoSlug =
          r.data &&
          typeof r.data === "object" &&
          "slugAutoGenerated" in r.data &&
          r.data.slugAutoGenerated;
        if (autoSlug) appToast.saved(tp("slugAutoGenerated"));
        else appToast.saved();
        startCreate();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const moveRole = (index: number, dir: -1 | 1) => {
    const next = [...roles];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRoles(next);
    startTransition(async () => {
      const r = await reorderPermissionGroups(next.map((g) => g.id));
      if (r.success) router.refresh();
      else appToast.error(r.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{t("customRolesHeading")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("customRolesSubtitle")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={startCreate}>
          <Plus className="h-4 w-4" aria-hidden /> {t("createRoleButton")}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <ul className="space-y-3 xl:col-span-2" aria-label={t("customRolesHeading")}>
          {roles.map((role, index) => {
            const label = formatGroupLabel(role.name, role.slug);
            return (
              <li
                key={role.id}
                className={cn(
                  "space-y-2 rounded-lg border bg-raised p-4 transition-colors duration-fast",
                  editing?.id === role.id ? "border-violet-bright" : "border-line hover:border-line-control"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(role)}
                    disabled={role.isSystem}
                    aria-pressed={editing?.id === role.id}
                    className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
                  >
                    <EntityIcon value={role.icon} fallback={Shield} className="h-5 w-5 text-ink-muted" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{label}</span>
                      <span className="mono-id block truncate text-ink-muted">{role.slug}</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {role.isSystem && <StatusBadge tone="info" label={t("systemBadge")} />}
                    {role.isDisabled && <StatusBadge tone="neutral" label={t("disabledBadge")} />}
                    {role.badge && (
                      <Badge variant="outline" className="gap-1.5">
                        {/* Rollenfarbe ist ein gespeicherter Wert der Rolle (Daten, kein Design-Token). */}
                        {role.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} aria-hidden />}
                        {role.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                {!role.isSystem && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === 0 || pending}
                      onClick={() => moveRole(index, -1)}
                      aria-label={tp("moveUp", { name: label })}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === roles.length - 1 || pending}
                      onClick={() => moveRole(index, 1)}
                      aria-label={tp("moveDown", { name: label })}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await duplicatePermissionGroup(role.id);
                          if (r.success) {
                            appToast.saved();
                            router.refresh();
                          } else appToast.error(r.error);
                        })
                      }
                    >
                      <Copy className="h-3 w-3" aria-hidden /> {t("duplicateButton")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setDeleteRole(role)}
                      aria-label={tp("deleteRole", { name: label })}
                      className="text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <SectionCard
          title={editing ? t("editRoleHeading", { name: editing.name }) : t("newCustomRoleHeading")}
          className="h-fit xl:sticky xl:top-24 xl:col-span-3"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="role-name" label={t("roleNamePlaceholder")}>
                <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field id="role-slug" label={t("slugAutoPlaceholder")}>
                <Input
                  id="role-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!!editing}
                  className="mono-id"
                />
              </Field>
            </div>
            <Field id="role-description" label={t("descriptionPlaceholder")}>
              <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="role-color" label={tp("colorLabel")}>
                <Input id="role-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 p-1" />
              </Field>
              <Field id="role-badge" label={t("badgePlaceholder")}>
                <Input id="role-badge" value={badge} onChange={(e) => setBadge(e.target.value)} />
              </Field>
              <Field id="role-icon" label={t("iconPlaceholder")}>
                <Input id="role-icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="role-tier" label={t("hierarchyTierLabel")}>
                <select
                  id="role-tier"
                  value={hierarchyTier}
                  onChange={(e) => setHierarchyTier(e.target.value)}
                  className={cn(controlClassName, "h-9")}
                >
                  <option value="">—</option>
                  {HIERARCHY_TIERS.map((tier) => (
                    <option key={tier} value={tier}>{tp(`tier.${tier}`)}</option>
                  ))}
                </select>
              </Field>
              <fieldset className="space-y-1.5">
                <legend className="label-text">{t("dashboardAccessLabel")}</legend>
                <div className="flex flex-wrap gap-3 pt-1">
                  {DASHBOARD_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={dashboardAccess.includes(opt)}
                        onChange={(e) =>
                          setDashboardAccess((prev) =>
                            e.target.checked ? [...prev, opt] : prev.filter((x) => x !== opt)
                          )
                        }
                      />
                      {tp(`dashboard.${opt}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <Switch checked={isDisabled} onCheckedChange={setIsDisabled} />
              {t("roleDisabledLabel")}
            </label>
            <SearchField
              label={t("searchPermissionsPlaceholder")}
              name="permission-search"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
            />
            <PermissionPicker selected={selected} onChange={setSelected} search={permSearch} />
            <Button disabled={pending || !!editing?.isSystem} onClick={saveRole}>
              {editing ? t("saveRoleButton") : t("createRoleButton")}
            </Button>
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={deleteRole !== null}
        onOpenChange={(open) => !open && setDeleteRole(null)}
        title={tp("deleteConfirmTitle", { name: deleteRole ? formatGroupLabel(deleteRole.name, deleteRole.slug) : "" })}
        description={tp("deleteConfirmText")}
        confirmLabel={tp("deleteConfirm")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleteRole) return;
          const id = deleteRole.id;
          startTransition(async () => {
            const r = await deletePermissionGroup(id);
            if (r.success) {
              setDeleteRole(null);
              appToast.deleted();
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}

export const CustomRolesEditor = memo(CustomRolesEditorInner);
