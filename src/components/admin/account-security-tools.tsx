"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { addIpBan, removeIpBan, revokeTeamSession, saveSecurityRules } from "@/actions/admin/account-security";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/use-app-toast";

function useAction() {
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      after?.();
      appToast.updated(message);
      router.refresh();
    });
  return { pending, run };
}

export function EndSessionButton({ sessionId, username }: { sessionId: string; username: string }) {
  const t = useTranslations("admin.sc");
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        {t("endSession")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("endTitle", { username })}
        description={t("endText")}
        confirmLabel={t("endSession")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => revokeTeamSession(sessionId), t("ended"), () => setOpen(false))}
      />
    </>
  );
}

export function IpBanForm() {
  const t = useTranslations("admin.sc");
  const uid = useId();
  const { pending, run } = useAction();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addIpBan(ip, reason), t("banned"), () => {
          setIp("");
          setReason("");
        });
      }}
    >
      <div>
        <label htmlFor={`${uid}-ip`} className="label-text mb-1.5 block text-ink-muted">{t("ip")}</label>
        <Input id={`${uid}-ip`} value={ip} onChange={(e) => setIp(e.target.value)} required inputMode="text" autoComplete="off" className="font-mono" />
      </div>
      <div>
        <label htmlFor={`${uid}-reason`} className="label-text mb-1.5 block text-ink-muted">{t("reason")}</label>
        <Input id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </div>
      <Button type="submit" disabled={pending || !ip.trim()}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("ban")}
      </Button>
    </form>
  );
}

export function UnbanButton({ hash, masked }: { hash: string; masked: string }) {
  const t = useTranslations("admin.sc");
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        {t("unban")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("unbanTitle", { ip: masked })}
        description={t("unbanText")}
        confirmLabel={t("unban")}
        loading={pending}
        onConfirm={() => run(() => removeIpBan(hash), t("unbanned"), () => setOpen(false))}
      />
    </>
  );
}

export function PasswordRulesForm({
  initial,
}: {
  initial: { passwordMinLength: number; passwordRequireNumber: boolean; passwordRequireSymbol: boolean; passwordRequireMixedCase: boolean };
}) {
  const t = useTranslations("admin.sc");
  const uid = useId();
  const { pending, run } = useAction();
  const [rules, setRules] = useState(initial);
  const dirty = JSON.stringify(rules) !== JSON.stringify(initial);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSecurityRules(rules), t("saved"));
      }}
    >
      <div className="max-w-[160px]">
        <label htmlFor={`${uid}-min`} className="label-text mb-1.5 block text-ink-muted">{t("minLength")}</label>
        <Input
          id={`${uid}-min`}
          type="number"
          min={8}
          max={64}
          value={rules.passwordMinLength}
          onChange={(e) => setRules((r) => ({ ...r, passwordMinLength: Number(e.target.value) }))}
          className="tabular-nums"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Checkbox checked={rules.passwordRequireNumber} onCheckedChange={(v) => setRules((r) => ({ ...r, passwordRequireNumber: v }))} label={t("requireNumber")} />
        <Checkbox checked={rules.passwordRequireSymbol} onCheckedChange={(v) => setRules((r) => ({ ...r, passwordRequireSymbol: v }))} label={t("requireSymbol")} />
        <Checkbox checked={rules.passwordRequireMixedCase} onCheckedChange={(v) => setRules((r) => ({ ...r, passwordRequireMixedCase: v }))} label={t("requireMixedCase")} />
      </div>
      <Button type="submit" disabled={pending || !dirty || rules.passwordMinLength < 8 || rules.passwordMinLength > 64}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("save")}
      </Button>
    </form>
  );
}
