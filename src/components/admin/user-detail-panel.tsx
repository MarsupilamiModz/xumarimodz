"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { useAppToast } from "@/hooks/use-app-toast";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";
import { Input } from "@/components/ui/input";
import { isPlaceholderEmail } from "@/lib/email/address";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAchievementsPanel } from "@/components/admin/user-achievements-panel";
import type { getAdminAchievements, getUserAchievementsAdmin } from "@/actions/admin/achievements";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format-locale";

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

type UserAchievementAdmin = Extract<
  Awaited<ReturnType<typeof getUserAchievementsAdmin>>,
  { success: true }
>["data"][number];

type AchievementOption = Extract<
  Awaited<ReturnType<typeof getAdminAchievements>>,
  { success: true }
>["data"][number];

const selectClass = "mt-1.5 h-9 w-full rounded-md border border-line-control bg-raised px-3 text-sm text-ink";

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
  const tb = useTranslations("admin.userDetail");
  const ts = useTranslations("status.role");
  const tTicket = useTranslations("status.ticket");
  const tSub = useTranslations("admin.ownerUserDetail.membershipStatus");
  const tMail = useTranslations("admin.ownerEmail.status");
  const appToast = useAppToast();
  const reasonId = useId();
  const groupId = useId();
  const roleId = useId();
  const emailId = useId();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);
  const [banReason, setBanReason] = useState("");
  const [adminEmail, setAdminEmail] = useState(user.email);

  /** Übersetzter Enum-Wert, unbekannte Werte unverändert. */
  const lbl = (tr: { has: (k: string) => boolean; (k: string): string }, value: string) => (tr.has(value) ? tr(value) : value);

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
          <p className="text-sm text-ink-muted">@{user.username} · {user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone="neutral" label={ts(user.role)} />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={tUi("statDownloads")} value={formatNumber(user._count.downloads, locale)} />
        <KpiTile label={tUi("statFavorites")} value={formatNumber(user._count.favorites, locale)} />
        <KpiTile label={tUi("statMods")} value={formatNumber(user._count.mods, locale)} />
        <KpiTile label={tUi("statMemberSince")} value={formatDate(user.createdAt, locale)} />
      </div>

      <SectionCard title={tUi("accessControlHeading")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={roleId} className="label-text">{tUi("roleLabel")}</label>
            <select
              id={roleId}
              className={selectClass}
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
                <option key={role} value={role}>{ts(role)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={groupId} className="label-text">{tUi("permissionGroupLabel")}</label>
            <select
              id={groupId}
              className={selectClass}
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
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={tUi("discordHeading")}>
          {user.discordId ? (
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-ink-muted">{tb("discordId")}</dt>
                <dd className="mono-id text-ink">{user.discordId}</dd>
              </div>
              {user.discordUsername && (
                <div className="flex gap-2">
                  <dt className="text-ink-muted">{tb("discordName")}</dt>
                  <dd className="text-ink">@{user.discordUsername}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">{tUi("notConnected")}</p>
          )}
        </SectionCard>

        <SectionCard title={tUi("legacyMembershipHeading")}>
          {user.membershipPurchases.length === 0 ? (
            <p className="text-sm text-ink-muted">{tUi("noLegacyPurchases")}</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {user.membershipPurchases.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span className="text-ink">{p.plan.name}</span>
                  <span className="tabular-nums text-ink-muted">{formatDate(p.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {membershipState && (
          <MembershipManager
            userId={user.id}
            locale={locale}
            state={membershipState}
            plans={membershipPlans.map((p) => ({ ...p, priceCents: p.priceCents ?? 0 }))}
            billingHistory={billingHistory}
          />
        )}

        <SectionCard title={tUi("legacySubscriptionsHeading")}>
          {user.subscriptions.length === 0 ? (
            <p className="text-sm text-ink-muted">{tUi("noSubscriptionsLifetime")}</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {user.subscriptions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 text-ink">
                    <StatusBadge tone={s.status === "ACTIVE" ? "success" : "neutral"} label={lbl(tSub, s.status)} />
                    {s.interval}
                  </span>
                  <span className="tabular-nums text-ink-muted">{tUi("endsLabel", { date: formatDate(s.currentPeriodEnd, locale) })}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={tUi("emailHeading")}>
          <div className="space-y-3 text-sm">
            {user.emailVerifiedAt && (
              <p className="meta">{tUi("verifiedOn", { date: formatDate(user.emailVerifiedAt, locale) })}</p>
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
            <div className="space-y-2 border-t border-line pt-3">
              <label htmlFor={emailId} className="label-text">{tUi("adminEmailOverrideLabel")}</label>
              <Input
                id={emailId}
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
          </div>
        </SectionCard>

        <SectionCard title={tUi("recentTicketsHeading")}>
          {user.supportTickets.length === 0 ? (
            <p className="text-sm text-ink-muted">{tUi("noTickets")}</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {user.supportTickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/${locale}/admin/tickets/${ticket.id}`} className="link min-w-0 truncate">
                    <span className="mono-id">{ticket.ticketNumber}</span> {ticket.subject}
                  </Link>
                  <StatusBadge tone="neutral" label={lbl(tTicket, ticket.status)} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={tUi("emailLogHeading")} className="lg:col-span-2">
          {!emailLogs?.length ? (
            <p className="text-sm text-ink-muted">{tUi("noEmailsLogged")}</p>
          ) : (
            <ul className="max-h-48 divide-y divide-line overflow-y-auto text-[13px]">
              {emailLogs.map((log) => (
                <li key={log.id} className="flex justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{log.subject}</p>
                    <p className="meta">
                      {log.templateKey ?? tUi("customTemplateFallback")} · {lbl(tMail, log.status)}
                      {log.error ? <span className="text-danger"> · {log.error}</span> : null}
                    </p>
                  </div>
                  <span className="meta shrink-0 tabular-nums">{formatDate(log.sentAt ?? log.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {allAchievements.length > 0 && (
          <div className="lg:col-span-2">
            <UserAchievementsPanel
              userId={user.id}
              initialAchievements={userAchievements}
              allAchievements={allAchievements}
            />
          </div>
        )}

        <SectionCard title={tUi("auditLogHeading")} className="lg:col-span-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-ink-muted">{tUi("noAuditEntries")}</p>
          ) : (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto text-[13px]">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-ink">
                    <span className="mono-id">{log.action}</span>{" "}
                    {log.actor && <span className="text-ink-muted">{tUi("byUsername", { username: log.actor.username })}</span>}
                  </span>
                  <span className="meta tabular-nums">{formatDateTime(log.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
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
