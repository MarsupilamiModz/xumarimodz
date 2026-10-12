import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { getUsers } from "@/actions/admin/users";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import { formatDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const ROLES: UserRole[] = ["OWNER", ...ASSIGNABLE_ROLES.filter((r) => r !== "OWNER")];
const STATES = ["active", "banned", "deleted"] as const;
type State = (typeof STATES)[number];
type Params = { q?: string; role?: string; banned?: string; state?: string; page?: string };

export default async function AdminUsersPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<Params>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const [t, ts] = await Promise.all([getTranslations("admin.us"), getTranslations("status")]);

  const q = searchParams.q?.trim() || undefined;
  const role = ROLES.includes(searchParams.role as UserRole) ? (searchParams.role as UserRole) : undefined;
  // `banned=banned|active` ist die alte URL-Form und wird weiter verstanden.
  const rawState = searchParams.state ?? searchParams.banned;
  const state: State | undefined = STATES.includes(rawState as State) ? (rawState as State) : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const result = await getUsers({
    page,
    limit: 25,
    search: q,
    role,
    banned: state === "banned" ? true : state === "active" ? false : undefined,
    deletedOnly: state === "deleted",
  });

  const base = `/${locale}/admin/users`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    const merged = { q, role, state, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader title={t("title")} description={result.success ? t("count", { count: result.data.total }) : undefined} />

      <div className="mb-4 space-y-3">
        <form method="get" action={base} className="flex flex-wrap gap-2">
          {role && <input type="hidden" name="role" value={role} />}
          {state && <input type="hidden" name="state" value={state} />}
          <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-sm" />
        </form>
        <ChipTabs
          label={t("role")}
          value={role ?? ""}
          options={[{ value: "", label: t("allRoles") }, ...ROLES.map((r) => ({ value: r, label: ts(`role.${r}`) }))]}
          hrefFor={(v) => href({ role: v || undefined, page: undefined })}
        />
        <ChipTabs
          label={t("state")}
          value={state ?? ""}
          options={[
            { value: "", label: t("stateAll") },
            { value: "active", label: t("stateActive") },
            { value: "banned", label: t("stateBanned") },
            { value: "deleted", label: t("stateDeleted") },
          ]}
          hrefFor={(v) => href({ state: v || undefined, page: undefined })}
        />
      </div>

      {!result.success ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <DataTable
            caption={t("title")}
            rows={result.data.users}
            rowKey={(u) => u.id}
            rowHref={(u) => `${base}/${u.id}`}
            empty={
              <EmptyState
                icon={Users}
                title={t("emptyTitle")}
                description={t("emptyText")}
                action={
                  q || role || state ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={base}>{t("resetFilters")}</Link>
                    </Button>
                  ) : undefined
                }
              />
            }
            columns={[
              {
                key: "user",
                header: t("colUser"),
                width: "minmax(0,2fr)",
                cell: (u) => (
                  <span className="flex items-center gap-3">
                    <UserAvatar src={u.avatarUrl} name={u.displayName ?? u.username} className="h-8 w-8 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{formatDisplayName(u)}</span>
                      <span className="block truncate text-xs text-ink-faint">@{u.username}</span>
                    </span>
                  </span>
                ),
              },
              {
                key: "email",
                header: t("colEmail"),
                width: "minmax(0,1.6fr)",
                hideOnMobile: true,
                cell: (u) => <span className="block truncate text-ink-muted">{u.email}</span>,
              },
              {
                key: "role",
                header: t("colRole"),
                width: "150px",
                hideOnMobile: true,
                cell: (u) => (
                  <span className="flex flex-wrap gap-1">
                    <Badge variant={u.role === "OWNER" || u.role === "ADMIN" ? "default" : "outline"}>{ts(`role.${u.role}`)}</Badge>
                    {u.isPremium && u.role !== "PREMIUM" && <Badge variant="premium">{t("premium")}</Badge>}
                  </span>
                ),
              },
              {
                key: "status",
                header: t("colStatus"),
                width: "110px",
                cell: (u) =>
                  u.deletedAt ? (
                    <StatusBadge tone="neutral" label={t("stateDeleted")} />
                  ) : u.isBanned ? (
                    <StatusBadge tone="danger" label={t("stateBanned")} />
                  ) : (
                    <StatusBadge tone="success" label={t("stateActive")} />
                  ),
              },
              {
                key: "joined",
                header: t("colJoined"),
                width: "110px",
                hideOnMobile: true,
                cell: (u) => <span className="tabular-nums text-ink-muted">{formatDate(u.createdAt, locale)}</span>,
              },
              {
                key: "actions",
                header: "",
                width: "40px",
                align: "right",
                cell: (u) => (
                  <UserRowActions
                    locale={locale}
                    user={{
                      id: u.id,
                      username: u.username,
                      role: u.role,
                      isBanned: u.isBanned,
                      isPremium: u.isPremium,
                      deleted: !!u.deletedAt,
                    }}
                  />
                ),
              },
            ]}
          />
          <Pagination className="mt-6" page={result.data.page} pages={result.data.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
