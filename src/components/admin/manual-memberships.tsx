"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { adminGrantMembershipByUsername, adminRevokeManualMembership } from "@/actions/admin/user-membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";

const DURATIONS = ["30", "90", "365", "unlimited"] as const;

export function GrantMembershipForm({ plans }: { plans: { id: string; name: string }[] }) {
  const t = useTranslations("admin.mg");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("30");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await adminGrantMembershipByUsername(username, planId, duration === "unlimited" ? null : Number(duration));
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setUsername("");
      appToast.created(t("granted"));
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="section-title mb-4">{t("grant")}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={`${uid}-user`} className="label-text mb-1.5 block text-ink-muted">{t("user")}</label>
          <Input id={`${uid}-user`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@" required autoComplete="off" />
        </div>
        <div>
          <label htmlFor={`${uid}-plan`} className="label-text mb-1.5 block text-ink-muted">{t("plan")}</label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger id={`${uid}-plan`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ChipTabs
          label={t("duration")}
          value={duration}
          options={DURATIONS.map((d) => ({ value: d, label: d === "unlimited" ? t("unlimited") : t("days", { count: Number(d) }) }))}
          onChange={(v) => setDuration(v as (typeof DURATIONS)[number])}
        />
        <Button type="submit" disabled={pending || !username.trim() || !planId}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("grant")}
        </Button>
      </form>
    </section>
  );
}

export function RevokeMembershipButton({ userId, username }: { userId: string; username: string }) {
  const t = useTranslations("admin.mg");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        {t("revoke")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("revokeTitle", { username })}
        description={t("revokeText")}
        confirmLabel={t("revoke")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await adminRevokeManualMembership(userId);
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setOpen(false);
            appToast.updated(t("revoked"));
            router.refresh();
          })
        }
      />
    </>
  );
}
