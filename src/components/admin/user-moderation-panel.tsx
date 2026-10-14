"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, UserSearch, Users } from "lucide-react";
import type { ModerationAction } from "@/lib/moderation-types";
import type { ModerationLogRow, ModerationUserRow } from "@/lib/moderation-store";
import {
  moderateBanUser,
  moderateMuteUser,
  moderateResetWarnings,
  moderateRestoreUser,
  moderateSoftDeleteUser,
  moderateSuspendUser,
  moderateUnbanUser,
  moderateUnmuteUser,
  moderateUnsuspendUser,
  moderateWarnUser,
} from "@/actions/admin/moderation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";

type LogRow = ModerationLogRow;
type Confirm = "ban" | "suspend" | "delete" | null;

export function UserModerationPanel({
  locale,
  users,
  recentLogs,
  search,
}: {
  locale: string;
  users: ModerationUserRow[];
  recentLogs: LogRow[];
  search?: string;
}) {
  const router = useRouter();
  const uid = useId();
  const t = useTranslations("admin.ui.userModeration");
  const tm = useTranslations("admin.moderationAdmin");
  const ACTION_LABELS: Record<ModerationAction, string> = {
    BAN_PERMANENT: t("actionBanPermanent"),
    BAN_TEMPORARY: t("actionBanTemporary"),
    UNBAN: t("actionUnban"),
    SUSPEND: t("actionSuspend"),
    UNSUSPEND: t("actionUnsuspend"),
    MUTE: t("actionMute"),
    UNMUTE: t("actionUnmute"),
    WARN: t("actionWarn"),
    RESET_WARNINGS: t("actionResetWarnings"),
    SOFT_DELETE: t("actionDeleteAccount"),
    RESTORE: t("actionRestoreAccount"),
    ROLE_CHANGE: t("actionRoleChange"),
  };
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [duration, setDuration] = useState<"1d" | "3d" | "7d" | "30d" | "permanent">("7d");
  const [confirm, setConfirm] = useState<Confirm>(null);

  const selected = users.find((u) => u.id === selectedId) ?? null;
  const reasonOk = reason.length >= 3;

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast({ title: "toast.error", description: result.error, variant: "destructive" });
        return;
      }
      setConfirm(null);
      toast({ title: successMsg });
      router.refresh();
    });
  }

  const selectedName = selected ? formatDisplayName(selected) : "";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title={t("usersHeading")}>
          <form method="get" action={`/${locale}/admin/moderation`} className="mb-4">
            <SearchField label={t("searchPlaceholder")} name="q" defaultValue={search} />
          </form>
          {users.length === 0 ? (
            <EmptyState icon={Users} title={tm("emptyTitle")} description={tm("emptyText")} />
          ) : (
            <ul className="-mx-5 max-h-[520px] divide-y divide-line overflow-y-auto border-t border-line">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    aria-pressed={selectedId === u.id}
                    className={cn(
                      "w-full px-5 py-3 text-left transition-colors duration-fast",
                      selectedId === u.id ? "bg-violet-soft" : "hover:bg-row-hover"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{formatDisplayName(u)}</p>
                        <p className="truncate text-xs text-ink-faint">{u.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {u.isBanned && <StatusBadge tone="danger" label={t("badgeBanned")} />}
                        {u.isSuspended && <StatusBadge tone="warning" label={t("badgeSuspended")} />}
                        {u.isMuted && <StatusBadge tone="neutral" label={t("badgeMuted")} />}
                        {u.warningCount > 0 && (
                          <StatusBadge tone="warning" label={t("warningCountBadge", { count: u.warningCount })} />
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t("moderationActionsHeading")}>
          {!selected ? (
            <EmptyState icon={UserSearch} title={tm("noSelection")} description={t("selectUserHint")} className="py-8" />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-ink">{selectedName}</p>
                <Link href={`/${locale}/admin/users/${selected.id}`} className="link text-xs">
                  {t("viewFullProfile")}
                </Link>
              </div>

              <div>
                <label htmlFor={`${uid}-reason`} className="label-text mb-1.5 block">
                  {t("reasonVisibleLabel")}
                </label>
                <Textarea
                  id={`${uid}-reason`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("describeViolationPlaceholder")}
                  aria-describedby={`${uid}-reason-hint`}
                  rows={2}
                />
                <p id={`${uid}-reason-hint`} className="meta mt-1">{tm("reasonHint")}</p>
              </div>
              <div>
                <label htmlFor={`${uid}-note`} className="label-text mb-1.5 block">
                  {t("internalNoteLabel")}
                </label>
                <Textarea
                  id={`${uid}-note`}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder={t("staffOnlyContextPlaceholder")}
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-duration`} className="label-text mb-1.5 block">
                  {t("banDurationLabel")}
                </label>
                <select
                  id={`${uid}-duration`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as typeof duration)}
                  className={cn(controlClassName, "h-9")}
                >
                  <option value="1d">{t("duration1Day")}</option>
                  <option value="3d">{t("duration3Days")}</option>
                  <option value="7d">{t("duration7Days")}</option>
                  <option value="30d">{t("duration30Days")}</option>
                  <option value="permanent">{t("durationPermanent")}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-danger" disabled={pending || !reasonOk} onClick={() => setConfirm("ban")}>
                  {t("banButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateUnbanUser(selected.id), t("banLiftedMsg"))}>
                  {t("unbanButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending || !reasonOk} onClick={() => setConfirm("suspend")}>
                  {t("suspendButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateUnsuspendUser(selected.id), t("suspensionLiftedMsg"))}>
                  {t("unsuspendButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateMuteUser(selected.id, reason), t("userMutedMsg"))}>
                  {t("muteButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateUnmuteUser(selected.id), t("userUnmutedMsg"))}>
                  {t("unmuteButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending || !reasonOk} onClick={() => run(() => moderateWarnUser(selected.id, reason), t("warningIssuedMsg"))}>
                  {t("warnButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateResetWarnings(selected.id), t("warningsResetMsg"))}>
                  {t("resetWarningsButton")}
                </Button>
                <Button variant="ghost" size="sm" className="text-danger" disabled={pending || !reasonOk} onClick={() => setConfirm("delete")}>
                  {t("deleteButton")}
                </Button>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => moderateRestoreUser(selected.id), t("accountRestoredMsg"))}>
                  {t("restoreButton")}
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t("recentLogHeading")}>
        {recentLogs.length === 0 ? (
          <EmptyState icon={History} title={t("noEventsRecorded")} className="py-8" />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <span className="font-medium text-ink">{ACTION_LABELS[log.action]}</span>
                  <span className="text-ink-muted">
                    {" "}
                    · {log.user.username}
                    {log.actor ? ` · ${t("byUsername", { username: log.actor.username })}` : ""}
                  </span>
                  {log.reason && <p className="meta mt-0.5">{log.reason}</p>}
                </div>
                <span className="text-xs tabular-nums text-ink-faint">{formatDateTime(log.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {selected && (
        <>
          <ConfirmDialog
            open={confirm === "ban"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title={tm("banTitle", { name: selectedName })}
            description={duration === "permanent" ? tm("banTextPermanent") : tm("banText")}
            confirmLabel={t("banButton")}
            variant="destructive"
            loading={pending}
            onConfirm={() =>
              run(
                () =>
                  moderateBanUser({
                    userId: selected.id,
                    reason,
                    internalNote: internalNote || undefined,
                    duration,
                  }),
                t("userBannedMsg")
              )
            }
          />
          <ConfirmDialog
            open={confirm === "suspend"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title={tm("suspendTitle", { name: selectedName })}
            description={tm("suspendText")}
            confirmLabel={t("suspendButton")}
            variant="destructive"
            loading={pending}
            onConfirm={() => run(() => moderateSuspendUser(selected.id, reason), t("userSuspendedMsg"))}
          />
          <ConfirmDialog
            open={confirm === "delete"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title={tm("deleteTitle", { name: selectedName })}
            description={tm("deleteText")}
            confirmLabel={t("deleteButton")}
            variant="destructive"
            loading={pending}
            onConfirm={() => run(() => moderateSoftDeleteUser(selected.id, reason), t("accountDeletedMsg"))}
          />
        </>
      )}
    </div>
  );
}
