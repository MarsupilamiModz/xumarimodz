"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
import type { UserRole } from "@prisma/client";
import {
  banUser,
  restoreUser,
  setUserPremium,
  softDeleteUser,
  unbanUser,
  updateUserRole,
  assignUserPermissionGroup,
  adminResendVerification,
  adminUpdateUserEmail,
} from "@/actions/admin/users";
import { MembershipManager } from "@/components/admin/membership-manager";
import type { MembershipTier } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatRoleLabel } from "@/lib/role-display";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-labels";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import { Input } from "@/components/ui/input";
import { isPlaceholderEmail } from "@/lib/email/address";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserDetail = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  role: UserRole;
  permissionGroupId: string | null;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: Date | null;
  discordId: string | null;
  discordUsername: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  subscriptions: { id: string; status: string; interval: string; currentPeriodEnd: Date }[];
  membershipPurchases: {
    id: string;
    amountCents: number;
    createdAt: Date;
    plan: { name: string; slug: string; priceCents: number };
  }[];
  banRecords: { reason: string | null; createdAt: Date; bannedBy: { username: string } | null }[];
  supportTickets: { id: string; ticketNumber: string; subject: string; status: string }[];
  _count: { downloads: number; favorites: number; mods: number };
};

import { UserAchievementsPanel } from "@/components/admin/user-achievements-panel";
import type { getAdminAchievements, getUserAchievementsAdmin } from "@/actions/admin/achievements";
import { formatDateTime } from "@/lib/format-locale";

type UserAchievementAdmin = Extract<
  Awaited<ReturnType<typeof getUserAchievementsAdmin>>,
  { success: true }
>["data"][number];

type AchievementOption = Extract<
  Awaited<ReturnType<typeof getAdminAchievements>>,
  { success: true }
>["data"][number];

export function UserDetailPanel({
  locale,
  user,
  auditLogs,
  membershipPlans = [],
  permissionGroups = [],
  membershipState = null,
  billingHistory = [],
  emailLogs = [],
  userAchievements = [],
  allAchievements = [],
}: {
  locale: string;
  user: UserDetail;
  auditLogs: {
    id: string;
    action: string;
    createdAt: Date;
    actor: { username: string } | null;
  }[];
  membershipPlans?: { id: string; name: string; slug: string; priceCents?: number }[];
  permissionGroups?: { id: string; name: string; slug: string }[];
  membershipState?: {
    membershipType: MembershipTier;
    status: string;
    planSlug: string | null;
    renewalDate: Date | null;
    cancelDate: Date | null;
    isLifetime: boolean;
    stripeSubscriptionId: string | null;
  } | null;
  billingHistory?: {
    id: string;
    amountCents: number;
    createdAt: Date;
    stripePaymentId: string | null;
    plan: { name: string };
  }[];
  emailLogs?: {
    id: string;
    to: string;
    subject: string;
    templateKey: string | null;
    status: string;
    error: string | null;
    sentAt: Date | null;
    createdAt: Date;
  }[];
  userAchievements?: UserAchievementAdmin[];
  allAchievements?: AchievementOption[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.us");
  const tUi = useTranslations("admin.ui.userDetail");
  const ts = useTranslations("status.role");
  const appToast = useAppToast();
  const reasonId = useId();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);
  const [banReason, setBanReason] = useState("");
  const [adminEmail, setAdminEmail] = useState(user.email);

  async function run(action: () => Promise<{ success: boolean; error?: string }>, msg: string, after?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (r.success) {
        appToast.updated(msg);
        after?.();
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  const closeConfirm = () => {
    setConfirm(null);
    setBanReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-ink-muted">@{user.username} · {user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={user.role === "OWNER" || user.role === "ADMIN" ? "default" : "outline"}>{ts(user.role)}</Badge>
            {!isPlaceholderEmail(user.email) &&
              (user.emailVerified ? (
                <StatusBadge tone="success" label={t("emailVerified")} />
              ) : (
                <StatusBadge tone="warning" label={t("emailUnverified")} />
              ))}
            {user.isBanned && <StatusBadge tone="danger" label={t("stateBanned")} />}
            {user.deletedAt && <StatusBadge tone="neutral" label={t("stateDeleted")} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.deletedAt ? (
            <Button variant="outline" disabled={pending} onClick={() => run(() => restoreUser(user.id), t("restored"))}>
              {t("restore")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setUserPremium(user.id, user.role !== "PREMIUM"),
                    user.role === "PREMIUM" ? t("premiumRevoked") : t("premiumGranted")
                  )
                }
              >
                {user.role === "PREMIUM" ? t("revokePremium") : t("grantPremium")}
              </Button>
              {user.isBanned ? (
                <Button variant="outline" disabled={pending} onClick={() => run(() => unbanUser(user.id), t("unbanned"))}>
                  {t("unban")}
                </Button>
              ) : (
                <Button variant="outline" disabled={pending} onClick={() => setConfirm("ban")}>
                  {t("ban")}
                </Button>
              )}
              <Button variant="destructive" disabled={pending} onClick={() => setConfirm("delete")}>
                {t("softDelete")}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">{tUi("accessControlHeading")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">{tUi("roleLabel")}</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              value={user.role}
              disabled={pending}
              onChange={(e) =>
                run(
                  () => updateUserRole(user.id, e.target.value as UserRole),
                  tUi("roleUpdatedMsg")
                )
              }
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>{formatRoleLabel(role)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{tUi("permissionGroupLabel")}</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              value={user.permissionGroupId ?? ""}
              disabled={pending}
              onChange={(e) =>
                run(
                  () => assignUserPermissionGroup(user.id, e.target.value || null),
                  tUi("permissionGroupUpdatedMsg")
                )
              }
            >
              <option value="">{tUi("noneOption")}</option>
              {(permissionGroups ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">{tUi("statDownloads")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.downloads}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{tUi("statFavorites")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.favorites}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{tUi("statMods")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user._count.mods}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{tUi("statMemberSince")}</CardTitle></CardHeader><CardContent><p className="text-sm">{safeToLocaleDateString(new Date(user.createdAt))}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{tUi("discordHeading")}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {user.discordId ? (
              <>
                <p>{tUi("discordIdLabel", { id: user.discordId })}</p>
                {user.discordUsername && <p>@{user.discordUsername}</p>}
              </>
            ) : (
              <p>{tUi("notConnected")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{tUi("legacyMembershipHeading")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {user.membershipPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tUi("noLegacyPurchases")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {user.membershipPurchases.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.plan.name}</span>
                    <span className="text-muted-foreground">{safeToLocaleDateString(new Date(p.createdAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {membershipState && (
          <MembershipManager
            userId={user.id}
            locale={locale}
            state={membershipState}
            plans={membershipPlans.map((p) => ({ ...p, priceCents: p.priceCents ?? 0 }))}
            billingHistory={billingHistory}
          />
        )}

        <Card>
          <CardHeader><CardTitle>{tUi("legacySubscriptionsHeading")}</CardTitle></CardHeader>
          <CardContent>
            {user.subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tUi("noSubscriptionsLifetime")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {user.subscriptions.map((s) => (
                  <li key={s.id}>
                    {s.status} · {s.interval} · {tUi("endsLabel", { date: safeToLocaleDateString(new Date(s.currentPeriodEnd)) })}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{tUi("recentTicketsHeading")}</CardTitle></CardHeader>
          <CardContent>
            {user.supportTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tUi("noTickets")}</p>
            ) : (
              <ul className="space-y-2">
                {user.supportTickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/${locale}/admin/tickets/${t.id}`} className="text-sm hover:text-violet-bright">
                      {t.ticketNumber} — {t.subject} ({TICKET_STATUS_LABELS[t.status as keyof typeof TICKET_STATUS_LABELS]})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{tUi("emailHeading")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user.emailVerifiedAt && (
              <p className="text-xs text-muted-foreground">
                {tUi("verifiedOn", { date: safeToLocaleDateString(new Date(user.emailVerifiedAt)) })}
              </p>
            )}
            {!isPlaceholderEmail(user.email) && !user.emailVerified && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => adminResendVerification(user.id, locale), tUi("verificationEmailSentMsg"))
                }
              >
                {tUi("resendVerificationButton")}
              </Button>
            )}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="text-xs text-muted-foreground">{tUi("adminEmailOverrideLabel")}</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={pending}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || !adminEmail.trim()}
                  onClick={() =>
                    run(
                      () => adminUpdateUserEmail(user.id, adminEmail, false),
                      tUi("emailUpdatedUnverifiedMsg")
                    )
                  }
                >
                  {tUi("setEmailButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || !adminEmail.trim()}
                  onClick={() =>
                    run(
                      () => adminUpdateUserEmail(user.id, adminEmail, true),
                      tUi("emailUpdatedVerifiedMsg")
                    )
                  }
                >
                  {tUi("setAndVerifyButton")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{tUi("emailLogHeading")}</CardTitle></CardHeader>
          <CardContent>
            {!emailLogs?.length ? (
              <p className="text-sm text-muted-foreground">{tUi("noEmailsLogged")}</p>
            ) : (
              <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {emailLogs.map((log) => (
                  <li key={log.id} className="flex justify-between gap-4 border-b border-border/30 pb-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{log.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.templateKey ?? tUi("customTemplateFallback")} · {log.status}
                        {log.error ? ` · ${log.error}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {safeToLocaleDateString(new Date(log.sentAt ?? log.createdAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {allAchievements.length > 0 && (
          <UserAchievementsPanel
            userId={user.id}
            initialAchievements={userAchievements}
            allAchievements={allAchievements}
          />
        )}

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{tUi("auditLogHeading")}</CardTitle></CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tUi("noAuditEntries")}</p>
            ) : (
              <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex justify-between border-b border-border/30 pb-2">
                    <span>{log.action} {log.actor && <span className="text-muted-foreground">{tUi("byUsername", { username: log.actor.username })}</span>}</span>
                    <span className="text-muted-foreground">{formatDateTime(log.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && closeConfirm()}
        title={confirm === "ban" ? t("banTitle", { username: user.username }) : t("softDeleteTitle", { username: user.username })}
        description={confirm === "ban" ? t("banText") : t("softDeleteText")}
        confirmLabel={confirm === "ban" ? t("ban") : t("softDelete")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          confirm === "ban"
            ? run(() => banUser(user.id, banReason.trim() || undefined), t("banned"), closeConfirm)
            : run(() => softDeleteUser(user.id), t("deleted"), closeConfirm)
        }
      >
        {confirm === "ban" && (
          <>
            <label htmlFor={reasonId} className="label-text mb-1.5 block text-ink-muted">
              {t("banReason")}
            </label>
            <Input id={reasonId} value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={500} />
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
