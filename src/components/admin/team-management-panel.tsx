"use client";

import { colors } from "@/styles/tokens";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  deleteTeamDepartment,
  deleteTeamProfile,
  reorderTeamProfiles,
  searchUsersForTeamProfile,
  upsertTeamDepartment,
  upsertTeamProfile,
} from "@/actions/admin/team-profiles";
import { TeamMemberMediaUpload } from "@/components/admin/team-member-media-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SafeImage } from "@/components/ui/safe-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppToast } from "@/hooks/use-app-toast";
import { TEAM_ROLE_GROUPS, teamRoleColor } from "@/lib/team-page";
import type { TeamRoleGroup, TeamVisibility } from "@prisma/client";

type Department = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { members: number };
};

type LinkedUser = {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
};

type Profile = {
  id: string;
  name: string;
  roleGroup: TeamRoleGroup;
  roleBadge: string | null;
  roleColor: string | null;
  position: string;
  description: string | null;
  email: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  discordUrl: string | null;
  youtubeUrl: string | null;
  twitchUrl: string | null;
  tiktokUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  websiteUrl: string | null;
  customLinks: unknown;
  visibility: TeamVisibility;
  sortOrder: number;
  isActive: boolean;
  userId: string | null;
  department: { id: string; name: string; slug: string } | null;
  user: LinkedUser | null;
};

type CustomLink = { label: string; url: string };

type FormState = {
  name: string;
  roleGroup: TeamRoleGroup;
  roleBadge: string;
  roleColor: string;
  position: string;
  description: string;
  email: string;
  avatarUrl: string;
  bannerUrl: string;
  discordUrl: string;
  youtubeUrl: string;
  twitchUrl: string;
  tiktokUrl: string;
  instagramUrl: string;
  xUrl: string;
  websiteUrl: string;
  departmentId: string;
  visibility: TeamVisibility;
  sortOrder: number;
  isActive: boolean;
  userId: string | null;
  customLinks: CustomLink[];
};

const EMPTY_FORM: FormState = {
  name: "",
  roleGroup: "SUPPORT",
  roleBadge: "",
  roleColor: colors.violet,
  position: "",
  description: "",
  email: "",
  avatarUrl: "",
  bannerUrl: "",
  discordUrl: "",
  youtubeUrl: "",
  twitchUrl: "",
  tiktokUrl: "",
  instagramUrl: "",
  xUrl: "",
  websiteUrl: "",
  departmentId: "",
  visibility: "PUBLIC",
  sortOrder: 0,
  isActive: true,
  userId: null,
  customLinks: [],
};

function parseCustomLinks(value: unknown): CustomLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is CustomLink =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as CustomLink).label === "string" &&
      typeof (entry as CustomLink).url === "string"
  );
}

function profileToForm(profile: Profile): FormState {
  return {
    name: profile.name,
    roleGroup: profile.roleGroup,
    roleBadge: profile.roleBadge ?? "",
    roleColor: profile.roleColor ?? teamRoleColor(profile.roleGroup),
    position: profile.position,
    description: profile.description ?? "",
    email: profile.email ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    bannerUrl: profile.bannerUrl ?? "",
    discordUrl: profile.discordUrl ?? "",
    youtubeUrl: profile.youtubeUrl ?? "",
    twitchUrl: profile.twitchUrl ?? "",
    tiktokUrl: profile.tiktokUrl ?? "",
    instagramUrl: profile.instagramUrl ?? "",
    xUrl: profile.xUrl ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    departmentId: profile.department?.id ?? "",
    visibility: profile.visibility,
    sortOrder: profile.sortOrder,
    isActive: profile.isActive,
    userId: profile.userId,
    customLinks: parseCustomLinks(profile.customLinks),
  };
}

export function TeamManagementPanel({
  departments,
  profiles,
}: {
  departments: Department[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.ui.teamManagement");
  const tb = useTranslations("admin.teamPage");
  const roleTitle = (group: TeamRoleGroup) => (tb.has(`roleGroup.${group}`) ? tb(`roleGroup.${group}`) : group);
  const [confirm, setConfirm] = useState<{ kind: "profile" | "dept"; id: string; name: string } | null>(null);
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [deptName, setDeptName] = useState("");
  const [deptSlug, setDeptSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<
    Array<LinkedUser & { avatarUrl: string | null }>
  >([]);

  const editing = useMemo(
    () => (editingId ? profiles.find((p) => p.id === editingId) ?? null : null),
    [editingId, profiles]
  );

  const isEditing = editingId !== null;

  function startCreate() {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, sortOrder: profiles.length });
    setLinkedUser(null);
    setUserSearch("");
    setUserResults([]);
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id);
    setForm(profileToForm(profile));
    setLinkedUser(profile.user);
    setUserSearch("");
    setUserResults([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinkedUser(null);
    setUserSearch("");
    setUserResults([]);
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function saveDept() {
    if (!deptName.trim()) return;
    startTransition(async () => {
      const r = await upsertTeamDepartment({
        slug: deptSlug || deptName,
        name: deptName,
      });
      if (r.success) {
        appToast.created();
        setDeptName("");
        setDeptSlug("");
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  function saveProfile() {
    if (!form.name.trim() || !form.position.trim()) {
      appToast.error(t("nameAndPositionRequired"));
      return;
    }

    startTransition(async () => {
      const r = await upsertTeamProfile({
        id: editing && editingId !== "new" ? editing.id : undefined,
        name: form.name,
        roleGroup: form.roleGroup,
        roleBadge: form.roleBadge || undefined,
        roleColor: form.roleColor || undefined,
        position: form.position,
        description: form.description || undefined,
        email: form.email || undefined,
        avatarUrl: form.avatarUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
        discordUrl: form.discordUrl || undefined,
        youtubeUrl: form.youtubeUrl || undefined,
        twitchUrl: form.twitchUrl || undefined,
        tiktokUrl: form.tiktokUrl || undefined,
        instagramUrl: form.instagramUrl || undefined,
        xUrl: form.xUrl || undefined,
        websiteUrl: form.websiteUrl || undefined,
        customLinks: form.customLinks.filter((link) => link.label.trim() && link.url.trim()),
        departmentId: form.departmentId || null,
        visibility: form.visibility,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        userId: form.userId,
      });

      if (r.success) {
        appToast.saved();
        cancelEdit();
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  function confirmRemoval() {
    if (!confirm) return;
    const { kind, id } = confirm;
    startTransition(async () => {
      const r = kind === "profile" ? await deleteTeamProfile(id) : await deleteTeamDepartment(id);
      if (r.success) {
        if (kind === "profile" && editingId === id) cancelEdit();
        setConfirm(null);
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  function moveProfile(id: string, dir: -1 | 1) {
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = [...profiles];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    startTransition(async () => {
      const r = await reorderTeamProfiles(next.map((p) => p.id));
      if (r.success) router.refresh();
      else appToast.error(r.error);
    });
  }

  function searchUsers() {
    if (userSearch.trim().length < 2) return;
    startTransition(async () => {
      const r = await searchUsersForTeamProfile(
        userSearch.trim(),
        editing && editingId !== "new" ? editing.id : undefined
      );
      if (r.success) setUserResults(r.data);
      else appToast.error(r.error);
    });
  }

  function linkUser(user: LinkedUser & { avatarUrl?: string | null }) {
    setLinkedUser(user);
    patchForm({
      userId: user.id,
      name: form.name || user.displayName || user.username,
      email: form.email || user.email,
      avatarUrl: form.avatarUrl || user.avatarUrl || "",
    });
    setUserResults([]);
    setUserSearch("");
  }

  function unlinkUser() {
    setLinkedUser(null);
    patchForm({ userId: null });
  }

  return (
    <Tabs defaultValue="members">
      <TabsList>
        <TabsTrigger value="members">{t("teamMembersTab")}</TabsTrigger>
        <TabsTrigger value="departments">{t("categoriesTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="departments" className="mt-4 space-y-4">
        <SectionCard title={t("categoriesTab")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            aria-label={t("categoryNamePlaceholder")}
            placeholder={t("categoryNamePlaceholder")}
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
          />
          <Input
            aria-label={t("slugOptionalPlaceholder")}
            placeholder={t("slugOptionalPlaceholder")}
            value={deptSlug}
            onChange={(e) => setDeptSlug(e.target.value)}
            className="mono-id"
          />
          <Button disabled={pending} onClick={saveDept}>
            <Plus className="h-4 w-4" aria-hidden /> {t("addCategoryButton")}
          </Button>
        </div>
        </SectionCard>
        {departments.length === 0 ? (
          <EmptyState icon={Users} title={tb("noCategoriesTitle")} description={tb("noCategoriesText")} />
        ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
          {departments.map((dept) => (
            <li
              key={dept.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{dept.name}</p>
                <p className="meta">
                  {t("memberCountLabel", { count: dept._count.members })} · <span className="mono-id">{dept.slug}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={tb("deleteCategory", { name: dept.name })}
                onClick={() => setConfirm({ kind: "dept", id: dept.id, name: dept.name })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        )}
      </TabsContent>

      <TabsContent value="members" className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-muted">
              {t("managePublicProfilesHint")}
            </p>
          </div>
          {!isEditing && (
            <Button onClick={startCreate}>
              <UserPlus className="h-4 w-4" aria-hidden />
              {t("addTeamMemberButton")}
            </Button>
          )}
        </div>

        {isEditing && (
          <section className="space-y-6 rounded-lg border border-line bg-raised p-5" aria-labelledby="team-profile-editor">
            <div className="flex items-center justify-between gap-3">
              <h2 id="team-profile-editor" className="section-title">
                {editingId === "new" ? t("addTeamMemberHeading") : t("editMemberHeading", { name: form.name })}
              </h2>
              <Button type="button" variant="ghost" size="icon" aria-label={t("cancelButton")} onClick={cancelEdit}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("identityHeading")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  aria-label={t("displayNamePlaceholder")}
                  placeholder={t("displayNamePlaceholder")}
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                />
                <Input
                  aria-label={t("positionTitlePlaceholder")}
                  placeholder={t("positionTitlePlaceholder")}
                  value={form.position}
                  onChange={(e) => patchForm({ position: e.target.value })}
                />
              </div>

              <div className="space-y-2 rounded-md border border-line p-3">
                <p className="text-sm font-medium text-ink">{t("linkPlatformUserLabel")}</p>
                {linkedUser ? (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-elevated px-3 py-2">
                    <div>
                      <p className="font-medium text-ink">{linkedUser.displayName || linkedUser.username}</p>
                      <p className="meta">{linkedUser.email}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={unlinkUser}>
                      {t("unlinkButton")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      aria-label={t("searchUsernameEmailPlaceholder")}
                      placeholder={t("searchUsernameEmailPlaceholder")}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending || userSearch.trim().length < 2}
                      aria-label={tb("searchUsers")}
                      onClick={searchUsers}
                    >
                      <Search className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
                {userResults.length > 0 && (
                  <div className="space-y-1">
                    {userResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover"
                        onClick={() => linkUser(user)}
                      >
                        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-elevated">
                          <SafeImage src={user.avatarUrl} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{user.displayName || user.username}</p>
                          <p className="meta">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("roleAndCategoryHeading")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  className="flex h-9 rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
                  value={form.roleGroup}
                  onChange={(e) =>
                    patchForm({
                      roleGroup: e.target.value as TeamRoleGroup,
                      roleColor: teamRoleColor(e.target.value as TeamRoleGroup, form.roleColor),
                    })
                  }
                >
                  {TEAM_ROLE_GROUPS.map((group) => (
                    <option key={group.key} value={group.key}>
                      {roleTitle(group.key)}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={t("roleBadgePlaceholder")}
                  placeholder={t("roleBadgePlaceholder")}
                  value={form.roleBadge}
                  onChange={(e) => patchForm({ roleBadge: e.target.value })}
                />
                <Input
                  type="color"
                  value={form.roleColor}
                  onChange={(e) => patchForm({ roleColor: e.target.value })}
                />
                <select
                  className="flex h-9 rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
                  value={form.departmentId}
                  onChange={(e) => patchForm({ departmentId: e.target.value })}
                >
                  <option value="">{t("noCategoryOption")}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("mediaHeading")}
              </h3>
              <TeamMemberMediaUpload
                avatarUrl={form.avatarUrl || null}
                bannerUrl={form.bannerUrl || null}
                teamMemberId={editingId !== "new" ? editingId ?? undefined : undefined}
                disabled={pending}
                onAvatarChange={(url) => patchForm({ avatarUrl: url })}
                onBannerChange={(url) => patchForm({ bannerUrl: url })}
              />
            </section>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("contactHeading")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="email"
                  aria-label={t("emailPlaceholder")}
                  placeholder={t("emailPlaceholder")}
                  value={form.email}
                  onChange={(e) => patchForm({ email: e.target.value })}
                />
                <Input
                  aria-label={t("discordUrlPlaceholder")}
                  placeholder={t("discordUrlPlaceholder")}
                  value={form.discordUrl}
                  onChange={(e) => patchForm({ discordUrl: e.target.value })}
                />
                <Input
                  aria-label={t("websitePlaceholder")}
                  placeholder={t("websitePlaceholder")}
                  value={form.websiteUrl}
                  onChange={(e) => patchForm({ websiteUrl: e.target.value })}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("socialLinksHeading")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  aria-label={t("youtubePlaceholder")}
                  placeholder={t("youtubePlaceholder")}
                  value={form.youtubeUrl}
                  onChange={(e) => patchForm({ youtubeUrl: e.target.value })}
                />
                <Input
                  aria-label={t("twitchPlaceholder")}
                  placeholder={t("twitchPlaceholder")}
                  value={form.twitchUrl}
                  onChange={(e) => patchForm({ twitchUrl: e.target.value })}
                />
                <Input
                  aria-label={t("tiktokPlaceholder")}
                  placeholder={t("tiktokPlaceholder")}
                  value={form.tiktokUrl}
                  onChange={(e) => patchForm({ tiktokUrl: e.target.value })}
                />
                <Input
                  aria-label={t("instagramPlaceholder")}
                  placeholder={t("instagramPlaceholder")}
                  value={form.instagramUrl}
                  onChange={(e) => patchForm({ instagramUrl: e.target.value })}
                />
                <Input
                  aria-label={t("xTwitterPlaceholder")}
                  placeholder={t("xTwitterPlaceholder")}
                  value={form.xUrl}
                  onChange={(e) => patchForm({ xUrl: e.target.value })}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="label-text">
                  {t("customLinksHeading")}
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patchForm({ customLinks: [...form.customLinks, { label: "", url: "" }] })
                  }
                >
                  <Link2 className="h-4 w-4" aria-hidden /> {t("addLinkButton")}
                </Button>
              </div>
              {form.customLinks.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("noCustomLinksYet")}</p>
              ) : (
                <div className="space-y-2">
                  {form.customLinks.map((link, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        aria-label={t("labelPlaceholder")}
                        placeholder={t("labelPlaceholder")}
                        value={link.label}
                        onChange={(e) => {
                          const next = [...form.customLinks];
                          next[index] = { ...next[index]!, label: e.target.value };
                          patchForm({ customLinks: next });
                        }}
                      />
                      <Input
                        aria-label={t("urlPlaceholder")}
                        placeholder={t("urlPlaceholder")}
                        value={link.url}
                        onChange={(e) => {
                          const next = [...form.customLinks];
                          next[index] = { ...next[index]!, url: e.target.value };
                          patchForm({ customLinks: next });
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={tb("removeLink")}
                        onClick={() =>
                          patchForm({
                            customLinks: form.customLinks.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="label-text">
                {t("biographyHeading")}
              </h3>
              <Textarea
                aria-label={t("biographyPlaceholder")}
                placeholder={t("biographyPlaceholder")}
                rows={4}
                value={form.description}
                onChange={(e) => patchForm({ description: e.target.value })}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <select
                className="flex h-9 rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
                value={form.visibility}
                onChange={(e) => patchForm({ visibility: e.target.value as TeamVisibility })}
              >
                <option value="PUBLIC">{t("visibilityPublic")}</option>
                <option value="INTERNAL">{t("visibilityInternal")}</option>
                <option value="HIDDEN">{t("visibilityHidden")}</option>
              </select>
              <Input
                type="number"
                aria-label={t("sortOrderPlaceholder")}
                placeholder={t("sortOrderPlaceholder")}
                value={form.sortOrder}
                onChange={(e) => patchForm({ sortOrder: Number(e.target.value) || 0 })}
              />
              <label className="flex items-center gap-2 rounded-md border border-line px-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patchForm({ isActive: e.target.checked })}
                />
                {t("activeOnTeamPageLabel")}
              </label>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={saveProfile}>
                {editingId === "new" ? t("createMemberButton") : t("saveChangesButton")}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={cancelEdit}>
                {t("cancelButton")}
              </Button>
            </div>
          </section>
        )}

        <div className="space-y-2">
          {profiles.length === 0 ? (
            <EmptyState icon={Users} title={t("noTeamMembersYet")} description={tb("noProfilesText")} />
          ) : (
            profiles.map((profile, index) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-raised p-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-elevated">
                  <SafeImage
                    src={profile.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{profile.name}</p>
                    {!profile.isActive && <StatusBadge tone="neutral" label={t("inactiveBadge")} />}
                    {profile.user && <span className="meta">@{profile.user.username}</span>}
                  </div>
                  <p className="text-sm text-ink-muted">
                    {roleTitle(profile.roleGroup)} · {profile.position}
                    {profile.department && ` · ${profile.department.name}`}
                  </p>
                </div>
                {profile.roleBadge && (
                  <span
                    className="rounded-sm border px-2 py-0.5 text-xs font-semibold text-ink"
                    style={{ borderColor: teamRoleColor(profile.roleGroup, profile.roleColor) }}
                  >
                    {profile.roleBadge}
                  </span>
                )}
                <StatusBadge
                  tone={profile.visibility === "PUBLIC" ? "success" : "neutral"}
                  label={
                    profile.visibility === "PUBLIC"
                      ? t("visibilityPublic")
                      : profile.visibility === "INTERNAL"
                        ? t("visibilityInternal")
                        : t("visibilityHidden")
                  }
                />
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending || index === 0}
                    aria-label={tb("moveUp", { name: profile.name })}
                    onClick={() => moveProfile(profile.id, -1)}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending || index === profiles.length - 1}
                    aria-label={tb("moveDown", { name: profile.name })}
                    onClick={() => moveProfile(profile.id, 1)}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(profile)}>
                    {t("editButton")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    aria-label={tb("removeMember", { name: profile.name })}
                    onClick={() => setConfirm({ kind: "profile", id: profile.id, name: profile.name })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === "dept"
            ? t("deleteCategoryConfirm", { name: confirm.name })
            : t("removeMemberConfirm", { name: confirm?.name ?? "" })
        }
        description={confirm?.kind === "dept" ? tb("deleteCategoryText") : tb("removeMemberText")}
        confirmLabel={tb("confirmDelete")}
        variant="destructive"
        loading={pending}
        onConfirm={confirmRemoval}
      />
    </Tabs>
  );
}
