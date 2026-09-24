"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import type { UserRole } from "@prisma/client";
import {
  banUser,
  permanentlyDeleteUser,
  setUserPremium,
  softDeleteUser,
  unbanUser,
  updateUserRole,
} from "@/actions/admin/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { ASSIGNABLE_ROLES } from "@/lib/permission-types";

type Confirm = "ban" | "delete" | "permanent" | null;

/** Zeilenaktionen der ACP-Nutzerliste. Sperren und Löschen laufen über Bestätigungsdialoge; die Actions schreiben das Audit-Log. */
export function UserRowActions({
  locale,
  user,
}: {
  locale: string;
  user: { id: string; username: string; role: UserRole; isBanned: boolean; isPremium: boolean; deleted: boolean };
}) {
  const t = useTranslations("admin.us");
  const ts = useTranslations("status.role");
  const appToast = useAppToast();
  const router = useRouter();
  const reasonId = useId();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState("");

  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.updated(message);
      after?.();
      router.refresh();
    });
  }

  const close = () => {
    setConfirm(null);
    setReason("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative z-10 h-[30px] w-[30px]" aria-label={t("actions", { username: user.username })} disabled={pending}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/admin/users/${user.id}`}>{t("viewProfile")}</Link>
          </DropdownMenuItem>
          {!user.deleted && (
            <>
              <DropdownMenuSeparator />
              {ASSIGNABLE_ROLES.filter((r) => r !== user.role).map((role) => (
                <DropdownMenuItem key={role} onSelect={() => run(() => updateUserRole(user.id, role), t("roleChanged"))}>
                  {t("setRole", { role: ts(role) })}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  run(() => setUserPremium(user.id, !user.isPremium), user.isPremium ? t("premiumRevoked") : t("premiumGranted"))
                }
              >
                {user.isPremium ? t("revokePremium") : t("grantPremium")}
              </DropdownMenuItem>
              {user.isBanned ? (
                <DropdownMenuItem onSelect={() => run(() => unbanUser(user.id), t("unbanned"))}>{t("unban")}</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirm("ban")}>{t("ban")}</DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setConfirm("delete")}>{t("softDelete")}</DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem className="text-danger" onSelect={() => setConfirm("permanent")}>
            {t("permanentDelete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm === "ban" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={t("banTitle", { username: user.username })}
          description={t("banText")}
          confirmLabel={t("ban")}
          variant="destructive"
          loading={pending}
          onConfirm={() => run(() => banUser(user.id, reason.trim() || undefined), t("banned"), close)}
        >
          <label htmlFor={reasonId} className="label-text mb-1.5 block text-ink-muted">
            {t("banReason")}
          </label>
          <Input id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          open={confirm !== null}
          onOpenChange={(o) => !o && close()}
          title={confirm === "permanent" ? t("permanentTitle", { username: user.username }) : t("softDeleteTitle", { username: user.username })}
          description={confirm === "permanent" ? t("permanentText") : t("softDeleteText")}
          confirmLabel={confirm === "permanent" ? t("permanentDelete") : t("softDelete")}
          variant="destructive"
          loading={pending}
          onConfirm={() =>
            run(() => (confirm === "permanent" ? permanentlyDeleteUser(user.id) : softDeleteUser(user.id)), t("deleted"), close)
          }
        />
      )}
    </>
  );
}
