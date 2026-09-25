"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { updateAdminRolePermissions } from "@/actions/admin/permissions";
import { PERMISSION_UI_GROUPS } from "@/lib/permission-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchField } from "@/components/ui/search-field";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

type RoleColumn = { role: UserRole; permissions: string[]; members: number; editable: boolean };

const msgKey = (permission: string) => permission.replace(/\./g, "_");

/**
 * Rechte-Matrix: Zeilen = Rechte (gruppiert), Spalten = Rollen. Owner ist gesperrt und immer vollständig.
 * „Speichern/Verwerfen“ erscheint nur bei Änderungen; gespeichert werden nur geänderte Rollen.
 */
export function RolePermissionMatrix({ roles }: { roles: RoleColumn[] }) {
  const t = useTranslations("admin.pm");
  const tr = useTranslations("status.role");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const initial = useMemo(() => Object.fromEntries(roles.map((r) => [r.role, new Set(r.permissions)])) as Record<string, Set<string>>, [roles]);
  const [state, setState] = useState(initial);
  useEffect(() => setState(initial), [initial]);

  const changedRoles = roles.filter((r) => {
    const a = initial[r.role];
    const b = state[r.role];
    return a.size !== b.size || Array.from(a).some((p) => !b.has(p));
  });
  const dirty = changedRoles.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Jedes Recht nur einmal zeigen (manche Schlüssel stehen in mehreren UI-Gruppen).
  const groups = useMemo(() => {
    const seen = new Set<string>();
    const q = query.trim().toLowerCase();
    return PERMISSION_UI_GROUPS.map((g) => ({
      id: g.id,
      keys: g.keys.filter((k) => {
        if (seen.has(k)) return false;
        seen.add(k);
        if (!q) return true;
        return k.includes(q) || t(`p.${msgKey(k)}`).toLowerCase().includes(q);
      }),
    })).filter((g) => g.keys.length > 0);
  }, [query, t]);

  function toggle(role: UserRole, permission: string, checked: boolean) {
    setState((prev) => {
      const next = new Set(prev[role]);
      if (checked) next.add(permission);
      else next.delete(permission);
      return { ...prev, [role]: next };
    });
  }

  function save() {
    startTransition(async () => {
      for (const r of changedRoles) {
        const res = await updateAdminRolePermissions(r.role, Array.from(state[r.role]));
        if (!res.success) {
          appToast.error(`${tr(r.role)}: ${res.error}`);
          return;
        }
      }
      appToast.saved(t("saved"));
      router.refresh();
    });
  }

  const hasAll = (role: RoleColumn) => role.role === "OWNER" || state[role.role].has("*");

  return (
    <div className="space-y-4 pb-20">
      <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {roles.map((r) => (
          <li key={r.role} className="rounded-lg border border-line bg-raised p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              {tr(r.role)}
              {r.role === "OWNER" && <Lock className="h-3.5 w-3.5 text-ink-faint" aria-label={t("locked")} />}
            </p>
            <p className="mt-1 text-xs tabular-nums text-ink-muted">{t("members", { count: r.members })}</p>
            <p className="text-xs tabular-nums text-ink-faint">
              {hasAll(r) ? t("all") : t("permissions", { count: state[r.role].size })}
            </p>
          </li>
        ))}
      </ul>

      <SearchField label={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full max-w-sm" />

      <div className="overflow-x-auto rounded-lg border border-line bg-raised">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <caption className="sr-only">{t("matrix")}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-faint">
              <th scope="col" className="sticky left-0 z-10 bg-raised px-4 py-2.5 text-left font-medium">{t("permission")}</th>
              {roles.map((r) => (
                <th key={r.role} scope="col" className="px-2 py-2.5 text-center font-medium">
                  <span className="inline-flex items-center gap-1">
                    {tr(r.role)}
                    {r.role === "OWNER" && <Lock className="h-3 w-3" aria-hidden />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={roles.length + 1} className="px-4 py-8 text-center text-sm text-ink-muted">{t("noResults")}</td>
              </tr>
            </tbody>
          ) : (
            groups.map((g) => (
              <tbody key={g.id}>
                <tr className="border-b border-line bg-elevated">
                  <th scope="rowgroup" colSpan={roles.length + 1} className="sticky left-0 px-4 py-1.5 text-left text-xs font-semibold text-ink-muted">
                    {t(`g.${g.id}`)}
                  </th>
                </tr>
                {g.keys.map((key) => (
                  <tr key={key} className="border-b border-line last:border-b-0 hover:bg-row-hover">
                    <th scope="row" className="sticky left-0 z-10 bg-raised px-4 py-2 text-left font-normal">
                      <span className="block text-ink">{t(`p.${msgKey(key)}`)}</span>
                      <span className="mono-id text-[11px] text-ink-faint">{key}</span>
                    </th>
                    {roles.map((r) => {
                      const all = hasAll(r);
                      const checked = all || state[r.role].has(key);
                      const changed = !all && initial[r.role].has(key) !== state[r.role].has(key);
                      return (
                        <td key={r.role} className={cn("px-2 py-2 text-center", changed && "bg-violet-soft")}>
                          <span className="inline-flex justify-center">
                            <Checkbox
                              checked={checked}
                              disabled={!r.editable || all || pending}
                              onCheckedChange={(v) => toggle(r.role, key, v)}
                              aria-label={t("toggle", { permission: t(`p.${msgKey(key)}`), role: tr(r.role) })}
                            />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))
          )}
        </table>
      </div>

      <div role="region" aria-label={t("unsaved")} hidden={!dirty} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-raised lg:left-[232px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-medium text-ink" aria-live="polite">
            {dirty ? `${t("unsaved")} · ${changedRoles.map((r) => tr(r.role)).join(", ")}` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => setState(initial)}>{t("discard")}</Button>
            <Button disabled={pending} onClick={save}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
