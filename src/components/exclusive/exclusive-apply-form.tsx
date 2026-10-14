"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { applyToExclusiveProgram } from "@/actions/exclusive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";

type Program = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  maxSlots: number | null;
  currentCount: number;
  waitlistEnabled: boolean;
  ndaRequired: boolean;
  discordRequired: boolean;
  mod: { title: string; slug: string; game: { name: string } };
  author: { username: string; displayName: string | null };
};

type Application = {
  status: string;
} | null;

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "danger",
  WAITLIST: "info",
};

export function ExclusiveApplyForm({
  program,
  existingApplication,
}: {
  program: Program;
  existingApplication: Application;
}) {
  const t = useTranslations("publicPages.exclusive");
  const tx = useTranslations("common.cx.exclusiveProgram");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [ndaAccepted, setNdaAccepted] = useState(false);

  const statusLabel: Record<string, string> = {
    PENDING: tx("statusPending"),
    APPROVED: tx("statusApproved"),
    REJECTED: tx("statusRejected"),
    WAITLIST: tx("statusWaitlist"),
  };
  const typeLabel: Record<string, string> = {
    CLOSED_ALPHA: tx("programTypeClosedAlpha"),
    CLOSED_BETA: tx("programTypeClosedBeta"),
    INVITE_ONLY: tx("programTypeInviteOnly"),
  };

  if (existingApplication) {
    return (
      <SectionCard>
        <StatusBadge
          tone={STATUS_TONE[existingApplication.status] ?? "neutral"}
          label={statusLabel[existingApplication.status] ?? existingApplication.status}
        />
        <p className="mt-3 text-sm text-ink-muted">{t("alreadyApplied")}</p>
      </SectionCard>
    );
  }

  const submit = () => {
    const fd = new FormData();
    fd.set("message", message);
    fd.set("inviteCode", inviteCode);
    fd.set("ndaAccepted", String(ndaAccepted));
    startTransition(async () => {
      const r = await applyToExclusiveProgram(program.id, fd);
      if (r.success) appToast.saved();
      else appToast.error(r.error);
    });
  };

  const atCapacity = program.maxSlots != null && program.currentCount >= program.maxSlots;

  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{typeLabel[program.type] ?? program.type}</Badge>
        {atCapacity && program.waitlistEnabled && <StatusBadge tone="info" label={t("waitlistOpen")} />}
        {program.maxSlots != null && (
          <Badge variant="outline" className="tabular-nums">
            {tx("slotsFilled", { current: program.currentCount, max: program.maxSlots })}
          </Badge>
        )}
      </div>
      {program.description && <p className="whitespace-pre-wrap text-sm text-ink-muted">{program.description}</p>}

      {program.discordRequired && <StatusBadge tone="warning" label={t("discordRequired")} />}

      <div className="space-y-1.5">
        <label htmlFor="exclusive-message" className="label-text">{t("messageLabel")}</label>
        <Textarea id="exclusive-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="exclusive-invite" className="label-text">{t("inviteCodeLabel")}</label>
        <Input
          id="exclusive-invite"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="font-mono"
          placeholder="EX-XXXXXXXX"
        />
      </div>

      {program.ndaRequired && (
        <label htmlFor="exclusive-nda" className="flex items-start gap-3 text-sm text-ink">
          <Switch id="exclusive-nda" checked={ndaAccepted} onCheckedChange={setNdaAccepted} />
          <span>{t("ndaLabel")}</span>
        </label>
      )}

      <Button disabled={pending} onClick={submit} className="w-full">
        {atCapacity && program.waitlistEnabled ? t("joinWaitlist") : t("apply")}
      </Button>
    </SectionCard>
  );
}
