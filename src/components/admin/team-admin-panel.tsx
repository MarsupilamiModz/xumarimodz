"use client";

import { memo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addTeamMemberAdmin,
  removeFromTeamAdmin,
  searchUsersForTeamAdmin,
  updateTeamMemberAdmin,
} from "@/actions/admin/team";
import type { UserRole } from "@prisma/client";

type Member = {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  role: UserRole;
  teamDepartment: string | null;
  teamBadge: string | null;
  permissionGroupId: string | null;
  permissionGroup: { id: string; name: string; color: string | null } | null;
};

type Group = { id: string; name: string; color: string | null };

const selectClass = "h-9 w-full rounded-md border border-line-control bg-raised px-2 text-sm text-ink";

function TeamAdminPanelInner({
  members,
  groups,
  departments,
}: {
  members: Member[];
  groups: Group[];
  departments: readonly string[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.ui.teamAdmin");
  const tb = useTranslations("admin.teamPage");
  const tToast = useTranslations("toast");
  const tRole = useTranslations("status.role");
  const tDept = useTranslations("status.department");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [searchResults, setSearchResults] = useState<
    { id: string; username: string; email: string; displayName: string | null }[]
  >([]);

  const dept = (d: string) => (tDept.has(d) ? tDept(d) : d);

  function saveMember(id: string, patch: Parameters<typeof updateTeamMemberAdmin>[1]) {
    startTransition(async () => {
      const r = await updateTeamMemberAdmin(id, patch);
      if (r.success) {
        appToast.raw({ title: tToast("teamMemberUpdated") });
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard title={t("addTeamMemberHeading")} description={tb("addText")}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (search.length < 2) return;
            startTransition(async () => {
              const r = await searchUsersForTeamAdmin(search);
              if (r.success) setSearchResults(r.data);
              setSearched(true);
            });
          }}
        >
          <label htmlFor="team-user-search" className="sr-only">{t("searchUsersPlaceholder")}</label>
          <Input
            id="team-user-search"
            type="search"
            placeholder={t("searchUsersPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={pending || search.length < 2}>
            {t("searchButton")}
          </Button>
        </form>
        {searchResults.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line">
            {searchResults.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-ink">
                  {u.displayName ?? u.username} <span className="text-ink-muted">· {u.email}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  aria-label={tb("addUser", { name: u.displayName ?? u.username })}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await addTeamMemberAdmin({ userId: u.id, role: "SUPPORT" });
                      if (r.success) {
                        appToast.raw({ title: tToast("addedToTeam") });
                        setSearchResults([]);
                        router.refresh();
                      } else appToast.error(r.error);
                    })
                  }
                >
                  {t("addButton")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {searched && searchResults.length === 0 && !pending && (
          <p className="mt-3 text-sm text-ink-muted">{tb("noUsers")}</p>
        )}
      </SectionCard>

      <section aria-labelledby="team-members-heading" className="space-y-3">
        <h2 id="team-members-heading" className="section-title">{t("teamHeading", { count: members.length })}</h2>
        {members.length === 0 ? (
          <EmptyState icon={Users} title={t("noTeamMembersYet")} description={tb("emptyText")} />
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id} className="grid gap-4 rounded-lg border border-line bg-raised p-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{m.displayName ?? m.username}</p>
                  <p className="meta truncate">{m.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusBadge tone="neutral" label={tRole(m.role)} />
                    {m.teamBadge && <StatusBadge tone="info" label={m.teamBadge} />}
                    {m.permissionGroup && <StatusBadge tone="neutral" label={m.permissionGroup.name} />}
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor={`team-role-${m.id}`} className="sr-only">{tb("role")}</label>
                  <select
                    id={`team-role-${m.id}`}
                    className={selectClass}
                    defaultValue={m.role}
                    disabled={pending}
                    onChange={(e) => saveMember(m.id, { role: e.target.value as UserRole })}
                  >
                    <option value="OWNER">{t("roleOwner")}</option>
                    <option value="ADMIN">{t("roleAdmin")}</option>
                    <option value="MODERATOR">{t("roleModerator")}</option>
                    <option value="SUPPORT">{t("roleSupport")}</option>
                  </select>
                  <label htmlFor={`team-dept-${m.id}`} className="sr-only">{tb("department")}</label>
                  <select
                    id={`team-dept-${m.id}`}
                    className={selectClass}
                    defaultValue={m.teamDepartment ?? ""}
                    disabled={pending}
                    onChange={(e) => saveMember(m.id, { teamDepartment: e.target.value || null })}
                  >
                    <option value="">{t("noDepartmentOption")}</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{dept(d)}</option>
                    ))}
                  </select>
                  <label htmlFor={`team-group-${m.id}`} className="sr-only">{tb("group")}</label>
                  <select
                    id={`team-group-${m.id}`}
                    className={selectClass}
                    defaultValue={m.permissionGroupId ?? ""}
                    disabled={pending}
                    onChange={(e) =>
                      saveMember(m.id, { permissionGroupId: e.target.value || null })
                    }
                  >
                    <option value="">{t("noGroupOption")}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <label htmlFor={`team-badge-${m.id}`} className="sr-only">{t("badgeLabelPlaceholder")}</label>
                  <Input
                    id={`team-badge-${m.id}`}
                    placeholder={t("badgeLabelPlaceholder")}
                    defaultValue={m.teamBadge ?? ""}
                    onBlur={(e) => saveMember(m.id, { teamBadge: e.target.value || null })}
                  />
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={pending}
                      onClick={() => setRemoving(m)}
                    >
                      {t("removeFromTeamButton")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("removeFromTeamConfirm")}
        description={tb("removeText", { name: removing ? removing.displayName ?? removing.username : "" })}
        confirmLabel={t("removeFromTeamButton")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!removing) return;
          startTransition(async () => {
            const r = await removeFromTeamAdmin(removing.id);
            if (r.success) {
              setRemoving(null);
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}

export const TeamAdminPanel = memo(TeamAdminPanelInner);
