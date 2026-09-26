"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";

type LogRow = ModerationLogRow;

export function UserModerationPanel({
  locale,
  users,
  recentLogs,
  flagged,
}: {
  locale: string;
  users: ModerationUserRow[];
  recentLogs: LogRow[];
  flagged: number;
}) {
  const router = useRouter();
  const t = useTranslations("admin.ui.userModeration");
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
  const [search, setSearch] = useState("");

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast({ title: "toast.error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: successMsg });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1-acp">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("pageSubtitle", { count: flagged })}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("usersHeading")}</CardTitle>
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(`/${locale}/admin/moderation?search=${encodeURIComponent(search)}`);
                }
              }}
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedId(u.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/10 transition-colors ${
                    selectedId === u.id ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{formatDisplayName(u)}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end shrink-0">
                      {u.isBanned && <Badge variant="destructive">{t("badgeBanned")}</Badge>}
                      {u.isSuspended && <Badge variant="secondary">{t("badgeSuspended")}</Badge>}
                      {u.isMuted && <Badge variant="outline">{t("badgeMuted")}</Badge>}
                      {u.warningCount > 0 && (
                        <Badge variant="outline">{t("warningCountBadge", { count: u.warningCount })}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("moderationActionsHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">{t("selectUserHint")}</p>
            ) : (
              <>
                <div>
                  <p className="font-medium">{formatDisplayName(selected)}</p>
                  <Link
                    href={`/${locale}/admin/users/${selected.id}`}
                    className="text-xs text-violet-bright hover:underline"
                  >
                    {t("viewFullProfile")}
                  </Link>
                </div>

                <div className="space-y-2">
                  <label htmlFor="ban-reason" className="text-sm font-medium">
                    {t("reasonVisibleLabel")}
                  </label>
                  <Textarea
                    id="ban-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("describeViolationPlaceholder")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="internal-note" className="text-sm font-medium">
                    {t("internalNoteLabel")}
                  </label>
                  <Textarea
                    id="internal-note"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder={t("staffOnlyContextPlaceholder")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ban-duration" className="text-sm font-medium">
                    {t("banDurationLabel")}
                  </label>
                  <select
                    id="ban-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as typeof duration)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="1d">{t("duration1Day")}</option>
                    <option value="3d">{t("duration3Days")}</option>
                    <option value="7d">{t("duration7Days")}</option>
                    <option value="30d">{t("duration30Days")}</option>
                    <option value="permanent">{t("durationPermanent")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending || reason.length < 3}
                    onClick={() =>
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
                  >
                    {t("banButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateUnbanUser(selected.id), t("banLiftedMsg"))}
                  >
                    {t("unbanButton")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending || reason.length < 3}
                    onClick={() =>
                      run(() => moderateSuspendUser(selected.id, reason), t("userSuspendedMsg"))
                    }
                  >
                    {t("suspendButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateUnsuspendUser(selected.id), t("suspensionLiftedMsg"))}
                  >
                    {t("unsuspendButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateMuteUser(selected.id, reason), t("userMutedMsg"))}
                  >
                    {t("muteButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateUnmuteUser(selected.id), t("userUnmutedMsg"))}
                  >
                    {t("unmuteButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || reason.length < 3}
                    onClick={() => run(() => moderateWarnUser(selected.id, reason), t("warningIssuedMsg"))}
                  >
                    {t("warnButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateResetWarnings(selected.id), t("warningsResetMsg"))}
                  >
                    {t("resetWarningsButton")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending || reason.length < 3}
                    onClick={() =>
                      run(() => moderateSoftDeleteUser(selected.id, reason), t("accountDeletedMsg"))
                    }
                  >
                    {t("deleteButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => moderateRestoreUser(selected.id), t("accountRestoredMsg"))}
                  >
                    {t("restoreButton")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recentLogHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground">{t("noEventsRecorded")}</p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2"
                >
                  <div>
                    <span className="font-medium">{ACTION_LABELS[log.action]}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {log.user.username}
                      {log.actor ? ` · ${t("byUsername", { username: log.actor.username })}` : ""}
                    </span>
                    {log.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(log.createdAt, locale)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
