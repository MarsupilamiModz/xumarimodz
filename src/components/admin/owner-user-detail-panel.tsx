"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserRole, MembershipTier } from "@prisma/client";
import {
  ownerAssignMembership,
  ownerEnterpriseBan,
  ownerLiftBan,
  ownerRestoreUser,
  ownerSetUserPermission,
  ownerSoftDeleteUser,
  ownerSuspendUser,
  ownerUpdateUserRole,
} from "@/actions/admin/owner-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import { formatDate, formatEuro, formatNumber } from "@/lib/format-locale";
import { UserAchievementsPanel } from "@/components/admin/user-achievements-panel";
import type { getAdminAchievements, getUserAchievementsAdmin } from "@/actions/admin/achievements";

type OwnerUserDetail = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isBanned: boolean;
  isSuspended: boolean;
  uploadBanned: boolean;
  commentBanned: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  banReason: string | null;
  userMembership: {
    membershipType: MembershipTier;
    status: string;
    renewalDate: Date | null;
    cancelDate: Date | null;
    isLifetime: boolean;
    stripeSubscriptionId: string | null;
  } | null;
  userPermissions: { permissionKey: string; granted: boolean }[];
  roleHistory: {
    id: string;
    fromRole: UserRole | null;
    toRole: UserRole;
    reason: string | null;
    createdAt: Date;
    changedBy: { username: string } | null;
  }[];
  banRecords: {
    id: string;
    reason: string | null;
    banScope: string;
    banType: string;
    createdAt: Date;
    liftedAt: Date | null;
    bannedBy: { username: string } | null;
  }[];
  purchases: { id: string; amountCents: number; createdAt: Date; mod: { title: string } }[];
  shopPurchases: { id: string; priceCents: number; createdAt: Date; product: { name: string } }[];
  mods: { id: string; title: string; slug: string; status: string }[];
  supportTickets: { id: string; ticketNumber: string; subject: string; status: string }[];
  creatorApplications: { id: string; status: string; createdAt: Date }[];
  partnerApplications: { id: string; status: string; createdAt: Date }[];
  _count: { downloads: number; favorites: number; mods: number; supportTickets: number };
};

type UserAchievementAdmin = Extract<
  Awaited<ReturnType<typeof getUserAchievementsAdmin>>,
  { success: true }
>["data"][number];

type AchievementOption = Extract<
  Awaited<ReturnType<typeof getAdminAchievements>>,
  { success: true }
>["data"][number];

const selectClass = "h-9 rounded-md border border-line-control bg-raised px-3 text-sm text-ink";
const msgKey = (permission: string) => permission.replace(/\./g, "_");

export function OwnerUserDetailPanel({
  locale,
  user,
  auditLogs,
  userAchievements,
  allAchievements,
}: {
  locale: string;
  user: OwnerUserDetail;
  auditLogs: {
    id: string;
    action: string;
    createdAt: Date;
    actor: { username: string; role: string } | null;
  }[];
  userAchievements: UserAchievementAdmin[];
  allAchievements: AchievementOption[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.ui.ownerUserDetail");
  const tb = useTranslations("admin.ownerUserDetail");
  const tTier = useTranslations("admin.ui.membershipManager.tier");
  const tPerm = useTranslations("admin.pm.p");
  const ts = useTranslations("status");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [banReason, setBanReason] = useState("");
  const [banScope, setBanScope] = useState<"ACCOUNT" | "UPLOAD" | "COMMENT" | "IP">("ACCOUNT");
  const [roleReason, setRoleReason] = useState("");
  const [confirm, setConfirm] = useState<"ban" | "disable" | null>(null);

  /** Übersetzter Status/Enum-Wert, unbekannte Werte unverändert. */
  const label = (ns: string, value: string) => (ts.has(`${ns}.${value}`) ? ts(`${ns}.${value}`) : value);
  const tbl = (ns: string, value: string) => (tb.has(`${ns}.${value}`) ? tb(`${ns}.${value}`) : value);
  const permLabel = (key: string) => (tPerm.has(msgKey(key)) ? tPerm(msgKey(key)) : PERMISSIONS[key as PermissionKey]);

  function run(action: () => Promise<{ success: boolean; error?: string }>, msg?: string, done?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.success) appToast.error(r.error);
      else {
        appToast.saved(msg);
        done?.();
        router.refresh();
      }
    });
  }

  const granted = new Set(user.userPermissions.filter((p) => p.granted).map((p) => p.permissionKey));
  const permissionKeys = Object.keys(PERMISSIONS) as PermissionKey[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="neutral" label={label("role", user.role)} />
        {user.isBanned && <StatusBadge tone="danger" label={t("badgeAccountBanned")} />}
        {user.isSuspended && <StatusBadge tone="warning" label={t("badgeSuspended")} />}
        {user.deletedAt && <StatusBadge tone="danger" label={t("badgeDeleted")} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("statDownloads")} value={formatNumber(user._count.downloads, locale)} />
        <KpiTile label={t("statUploads")} value={formatNumber(user._count.mods, locale)} />
        <KpiTile label={t("statTickets")} value={formatNumber(user._count.supportTickets, locale)} />
        <KpiTile label={t("statMemberSince")} value={formatDate(user.createdAt, locale)} />
      </div>

      <SectionCard title={t("roleManagementHeading")}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="owner-user-role" className="label-text">{tb("role")}</label>
            <select
              id="owner-user-role"
              className={selectClass}
              defaultValue={user.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                run(() => ownerUpdateUserRole(user.id, role, roleReason || undefined), t("roleUpdatedMsg"));
              }}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{label("role", r)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="owner-user-role-reason" className="label-text">{t("reasonOptionalPlaceholder")}</label>
            <Input id="owner-user-role-reason" placeholder={t("reasonOptionalPlaceholder")} value={roleReason} onChange={(e) => setRoleReason(e.target.value)} className="max-w-xs" />
          </div>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerSuspendUser(user.id, !user.isSuspended), user.isSuspended ? t("unsuspendedMsg") : t("suspendedMsg"))}>
            {user.isSuspended ? t("unsuspendButton") : t("suspendButton")}
          </Button>
          {user.deletedAt ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerRestoreUser(user.id), t("restoredMsg"))}>{t("restoreAccountButton")}</Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-danger" disabled={pending} onClick={() => setConfirm("disable")}>{t("disableAccountButton")}</Button>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={t("premiumManagementHeading")}
        description={
          user.userMembership ? (
            <>
              {tTier(user.userMembership.membershipType)} · {tbl("membershipStatus", user.userMembership.status)}
              {user.userMembership.renewalDate && ` · ${t("renewsLabel", { date: formatDate(user.userMembership.renewalDate, locale) })}`}
              {user.userMembership.stripeSubscriptionId && " · Stripe"}
            </>
          ) : (
            tb("noMembership")
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          {(["FREE", "PREMIUM_LITE", "PREMIUM", "PREMIUM_MAX"] as MembershipTier[]).map((tier) => (
            <Button
              key={tier}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => ownerAssignMembership(user.id, tier, { extendDays: 30 }), t("membershipAssignedMsg", { tier: tTier(tier) }))}
            >
              {tTier(tier)}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerAssignMembership(user.id, "PREMIUM_MAX", { lifetime: true }), t("lifetimePremiumMsg"))}>
            {t("lifetimePremiumMaxButton")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={t("banManagementHeading")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="owner-ban-reason" className="label-text">{t("banReasonPlaceholder")}</label>
            <Input id="owner-ban-reason" placeholder={t("banReasonPlaceholder")} value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="owner-ban-scope" className="label-text">{tb("banScope")}</label>
            <select id="owner-ban-scope" className={`${selectClass} w-full`} value={banScope} onChange={(e) => setBanScope(e.target.value as typeof banScope)}>
              <option value="ACCOUNT">{t("banAccountOption")}</option>
              <option value="UPLOAD">{t("banUploadsOption")}</option>
              <option value="COMMENT">{t("banCommentsOption")}</option>
              <option value="IP">{t("banIpOption")}</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending || banReason.length < 3}
            onClick={() => setConfirm("ban")}
          >
            {t("applyBanButton")}
          </Button>
          {user.isBanned && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerLiftBan(user.id, "ACCOUNT"), t("unbannedMsg"))}>{t("liftAccountBanButton")}</Button>
          )}
          {user.uploadBanned && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerLiftBan(user.id, "UPLOAD"), t("uploadBanLiftedMsg"))}>{t("liftUploadBanButton")}</Button>
          )}
          {user.commentBanned && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerLiftBan(user.id, "COMMENT"), t("commentBanLiftedMsg"))}>{t("liftCommentBanButton")}</Button>
          )}
        </div>
        {user.banRecords.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-md border border-line text-[13px]">
            {user.banRecords.slice(0, 8).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="text-ink">
                  {tbl("scope", b.banScope)} · {tbl("banType", b.banType)}
                  {b.reason && <span className="text-ink-muted"> · {b.reason}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="meta tabular-nums">{formatDate(b.createdAt, locale)}</span>
                  {b.liftedAt && <StatusBadge tone="neutral" label={tb("lifted")} />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("individualPermissionsHeading")}>
        <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {permissionKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={granted.has(key)}
                disabled={pending}
                onChange={(e) =>
                  run(() => ownerSetUserPermission(user.id, key, e.target.checked), t("permissionUpdatedMsg"))
                }
              />
              <span className="min-w-0">
                <span className="block truncate">{permLabel(key)}</span>
                <span className="mono-id block truncate text-ink-faint">{key}</span>
              </span>
            </label>
          ))}
        </div>
      </SectionCard>

      <UserAchievementsPanel
        userId={user.id}
        initialAchievements={userAchievements}
        allAchievements={allAchievements}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("purchasesUploadsHeading")}>
          {user.purchases.length + user.shopPurchases.length + user.mods.length === 0 ? (
            <p className="text-sm text-ink-muted">{tb("nothingYet")}</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {user.purchases.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span className="truncate text-ink">{p.mod.title}</span>
                  <span className="tabular-nums text-ink-muted">{formatEuro(p.amountCents, locale)}</span>
                </li>
              ))}
              {user.shopPurchases.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span className="truncate text-ink">{p.product.name}</span>
                  <span className="tabular-nums text-ink-muted">{formatEuro(p.priceCents, locale)}</span>
                </li>
              ))}
              {user.mods.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/${locale}/mods/${m.slug}`} className="link truncate">{m.title}</Link>
                  <StatusBadge tone={m.status === "PUBLISHED" ? "success" : m.status === "REJECTED" ? "danger" : "neutral"} label={label("mod", m.status)} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title={t("ticketsApplicationsHeading")}>
          {user.supportTickets.length + user.creatorApplications.length + user.partnerApplications.length === 0 ? (
            <p className="text-sm text-ink-muted">{tb("nothingYet")}</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {user.supportTickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-ink"><span className="mono-id">{ticket.ticketNumber}</span> {ticket.subject}</span>
                  <StatusBadge tone="neutral" label={label("ticket", ticket.status)} />
                </li>
              ))}
              {user.creatorApplications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-ink">{t("creatorAppLabel")}</span>
                  <StatusBadge tone="neutral" label={label("application", a.status)} />
                </li>
              ))}
              {user.partnerApplications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-ink">{t("partnerAppLabel")}</span>
                  <StatusBadge tone="neutral" label={label("application", a.status)} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t("roleHistoryHeading")}>
        {user.roleHistory.length === 0 ? (
          <p className="text-sm text-ink-muted">{tb("nothingYet")}</p>
        ) : (
          <ul className="divide-y divide-line text-[13px]">
            {user.roleHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2 text-ink-muted">
                <span>
                  {h.fromRole ? label("role", h.fromRole) : "—"} →{" "}
                  {t("changedByLine", { toRole: label("role", h.toRole), username: h.changedBy?.username ?? t("systemActor") })}
                </span>
                <span className="meta tabular-nums">{formatDate(h.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("ownerAuditLogHeading")}>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-ink-muted">{tb("nothingYet")}</p>
        ) : (
          <ul className="max-h-64 divide-y divide-line overflow-y-auto text-[13px]">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap justify-between gap-2 py-2 text-ink-muted">
                <span>
                  <span className="mono-id text-ink">{log.action}</span> · @{log.actor?.username ?? t("systemActor")}
                </span>
                <span className="meta tabular-nums">{formatDate(log.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirm === "ban"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={tb("banTitle", { username: user.username })}
        description={tb("banText")}
        confirmLabel={t("applyBanButton")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          run(
            () =>
              ownerEnterpriseBan({
                userId: user.id,
                reason: banReason,
                scope: banScope,
                duration: "permanent",
              }),
            t("banAppliedMsg"),
            () => setConfirm(null)
          )
        }
      />
      <ConfirmDialog
        open={confirm === "disable"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={tb("disableTitle", { username: user.username })}
        description={tb("disableText")}
        confirmLabel={t("disableAccountButton")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => ownerSoftDeleteUser(user.id), t("disabledMsg"), () => setConfirm(null))}
      />
    </div>
  );
}
