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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/use-app-toast";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import { formatDisplayName } from "@/lib/display-name";
import { formatRoleLabel, roleBadgeVariant } from "@/lib/role-display";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
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
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [banReason, setBanReason] = useState("");
  const [banScope, setBanScope] = useState<"ACCOUNT" | "UPLOAD" | "COMMENT" | "IP">("ACCOUNT");
  const [roleReason, setRoleReason] = useState("");

  function run(action: () => Promise<{ success: boolean; error?: string }>, msg = "Saved") {
    startTransition(async () => {
      const r = await action();
      if (!r.success) appToast.error(r.error);
      else {
        appToast.saved(msg);
        router.refresh();
      }
    });
  }

  const granted = new Set(user.userPermissions.filter((p) => p.granted).map((p) => p.permissionKey));
  const permissionKeys = Object.keys(PERMISSIONS) as PermissionKey[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h1-acp">{formatDisplayName(user)}</h1>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={roleBadgeVariant(user.role)}>{formatRoleLabel(user.role)}</Badge>
            {user.isBanned && <Badge variant="destructive">{t("badgeAccountBanned")}</Badge>}
            {user.isSuspended && <Badge variant="outline">{t("badgeSuspended")}</Badge>}
            {user.deletedAt && <Badge variant="destructive">{t("badgeDeleted")}</Badge>}
          </div>
        </div>
        <Link href={`/${locale}/admin/owner/users`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("backToUsers")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">{t("statDownloads")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.downloads}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t("statUploads")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.mods}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t("statTickets")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.supportTickets}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t("statMemberSince")}</CardTitle></CardHeader><CardContent><p className="text-sm">{safeToLocaleDateString(user.createdAt)}</p></CardContent></Card>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{t("roleManagementHeading")}</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={user.role}
            onChange={(e) => {
              const role = e.target.value as UserRole;
              run(() => ownerUpdateUserRole(user.id, role, roleReason || undefined), t("roleUpdatedMsg"));
            }}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{formatRoleLabel(r)}</option>
            ))}
          </select>
          <Input placeholder={t("reasonOptionalPlaceholder")} value={roleReason} onChange={(e) => setRoleReason(e.target.value)} className="max-w-xs" />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerSuspendUser(user.id, !user.isSuspended), user.isSuspended ? t("unsuspendedMsg") : t("suspendedMsg"))}>
            {user.isSuspended ? t("unsuspendButton") : t("suspendButton")}
          </Button>
          {user.deletedAt ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerRestoreUser(user.id), t("restoredMsg"))}>{t("restoreAccountButton")}</Button>
          ) : (
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => ownerSoftDeleteUser(user.id), t("disabledMsg"))}>{t("disableAccountButton")}</Button>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{t("premiumManagementHeading")}</h3>
        {user.userMembership && (
          <p className="text-sm text-muted-foreground">
            {user.userMembership.membershipType} · {user.userMembership.status}
            {user.userMembership.renewalDate && ` · ${t("renewsLabel", { date: safeToLocaleDateString(user.userMembership.renewalDate) })}`}
            {user.userMembership.stripeSubscriptionId && ` · Stripe`}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(["FREE", "PREMIUM_LITE", "PREMIUM", "PREMIUM_MAX"] as MembershipTier[]).map((tier) => (
            <Button
              key={tier}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => ownerAssignMembership(user.id, tier, { extendDays: 30 }), t("membershipAssignedMsg", { tier }))}
            >
              {tier.replace("_", " ")}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerAssignMembership(user.id, "PREMIUM_MAX", { lifetime: true }), t("lifetimePremiumMsg"))}>
            {t("lifetimePremiumMaxButton")}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{t("banManagementHeading")}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder={t("banReasonPlaceholder")} value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={banScope} onChange={(e) => setBanScope(e.target.value as typeof banScope)}>
            <option value="ACCOUNT">{t("banAccountOption")}</option>
            <option value="UPLOAD">{t("banUploadsOption")}</option>
            <option value="COMMENT">{t("banCommentsOption")}</option>
            <option value="IP">{t("banIpOption")}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending || banReason.length < 3}
            onClick={() =>
              run(
                () =>
                  ownerEnterpriseBan({
                    userId: user.id,
                    reason: banReason,
                    scope: banScope,
                    duration: "permanent",
                  }),
                t("banAppliedMsg")
              )
            }
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
          <ul className="text-xs space-y-1 text-muted-foreground">
            {user.banRecords.slice(0, 8).map((b) => (
              <li key={b.id}>
                {b.banScope} · {b.banType} · {b.reason} · {safeToLocaleDateString(b.createdAt)}
                {b.liftedAt ? ` ${t("liftedSuffix")}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{t("individualPermissionsHeading")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto">
          {permissionKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={granted.has(key)}
                onChange={(e) =>
                  run(() => ownerSetUserPermission(user.id, key, e.target.checked), t("permissionUpdatedMsg"))
                }
              />
              <span className="truncate" title={PERMISSIONS[key]}>{key}</span>
            </label>
          ))}
        </div>
      </Card>

      <UserAchievementsPanel
        userId={user.id}
        initialAchievements={userAchievements}
        allAchievements={allAchievements}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t("purchasesUploadsHeading")}</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {user.purchases.slice(0, 5).map((p) => (
              <li key={p.id}>{p.mod.title} · €{(p.amountCents / 100).toFixed(2)}</li>
            ))}
            {user.shopPurchases.slice(0, 5).map((p) => (
              <li key={p.id}>{p.product.name} · €{(p.priceCents / 100).toFixed(2)}</li>
            ))}
            {user.mods.slice(0, 5).map((m) => (
              <li key={m.id}>
                <Link href={`/${locale}/mods/${m.slug}`} className="text-violet-bright hover:underline">{m.title}</Link> · {m.status}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t("ticketsApplicationsHeading")}</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {user.supportTickets.map((ticket) => (
              <li key={ticket.id}>{ticket.ticketNumber}: {ticket.subject} ({ticket.status})</li>
            ))}
            {user.creatorApplications.map((a) => (
              <li key={a.id}>{t("creatorAppLabel")} · {a.status}</li>
            ))}
            {user.partnerApplications.map((a) => (
              <li key={a.id}>{t("partnerAppLabel")} · {a.status}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t("roleHistoryHeading")}</h3>
        <ul className="text-sm space-y-1">
          {user.roleHistory.map((h) => (
            <li key={h.id} className="text-muted-foreground">
              {h.fromRole ?? "?"} → {t("changedByLine", { toRole: h.toRole, username: h.changedBy?.username ?? t("systemActor") })} · {safeToLocaleDateString(h.createdAt)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t("ownerAuditLogHeading")}</h3>
        <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
          {auditLogs.map((log) => (
            <li key={log.id} className="text-muted-foreground">
              <span className="text-foreground">{log.action}</span> · @{log.actor?.username ?? t("systemActor")} · {safeToLocaleDateString(log.createdAt)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
