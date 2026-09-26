"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  reviewExclusiveApplication,
  uploadExclusiveBuild,
  createExclusiveInviteCode,
  toggleExclusiveProgram,
  getExclusiveDownloadUrl,
} from "@/actions/exclusive";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/use-app-toast";
import type { ExclusiveApplicationStatus } from "@prisma/client";

type Program = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  maxSlots: number | null;
  currentCount: number;
  isActive: boolean;
  ndaRequired: boolean;
  discordRequired: boolean;
  mod: { title: string; slug: string };
  builds: { id: string; version: string; fileName: string; fileSize: number; expiresAt: Date | null; createdAt: Date }[];
  applications: {
    id: string;
    status: ExclusiveApplicationStatus;
    message: string | null;
    ndaAccepted: boolean;
    inviteCode: string | null;
    createdAt: Date;
    user: { id: string; username: string; displayName: string | null; discordId: string | null };
  }[];
  inviteCodes: { id: string; code: string; maxUses: number; uses: number; expiresAt: Date | null }[];
};

const PROGRAM_TYPE_KEYS: Record<string, string> = {
  CLOSED_ALPHA: "programTypeClosedAlpha",
  CLOSED_BETA: "programTypeClosedBeta",
  INVITE_ONLY: "programTypeInviteOnly",
};

const APPLICATION_STATUS_KEYS: Record<string, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  WAITLIST: "statusWaitlist",
};

function programTypeLabel(type: string, t: (key: string) => string) {
  const key = PROGRAM_TYPE_KEYS[type];
  return key ? t(key) : type.replace("_", " ");
}

function applicationStatusLabel(status: string, t: (key: string) => string) {
  const key = APPLICATION_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export function ExclusiveProgramManager({ locale, program }: { locale: string; program: Program }) {
  const t = useTranslations("common.cx.exclusiveProgram");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const review = (applicationId: string, status: ExclusiveApplicationStatus) => {
    startTransition(async () => {
      const r = await reviewExclusiveApplication(applicationId, status);
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const uploadBuild = () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !version.trim()) {
      appToast.error(t("fileVersionRequired"));
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("version", version.trim());
    if (expiresAt) fd.set("expiresAt", expiresAt);
    startTransition(async () => {
      const r = await uploadExclusiveBuild(program.id, fd);
      if (r.success) {
        appToast.saved();
        setVersion("");
        setExpiresAt("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const generateInvite = () => {
    startTransition(async () => {
      const r = await createExclusiveInviteCode(program.id);
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const downloadBuild = (buildId: string) => {
    startTransition(async () => {
      const r = await getExclusiveDownloadUrl(buildId);
      if (r.success) window.open(r.data.url, "_blank");
      else appToast.error(r.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="premium">{programTypeLabel(program.type, t)}</Badge>
            <Badge variant={program.isActive ? "free" : "outline"}>{program.isActive ? t("active") : t("inactive")}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{program.title}</h2>
          <p className="text-sm text-muted-foreground">{program.mod.title}</p>
          {program.description && <p className="mt-2 text-sm">{program.description}</p>}
          {program.maxSlots != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("slotsFilled", { current: program.currentCount, max: program.maxSlots })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={program.isActive}
              onCheckedChange={(v) =>
                startTransition(async () => {
                  const r = await toggleExclusiveProgram(program.id, v);
                  if (r.success) appToast.saved();
                })
              }
            />
            {t("active")}
          </label>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/exclusive/${program.id}`} target="_blank">
              {t("publicApplyPage")}
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">{t("privateBuildsTitle")}</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder={t("versionPlaceholder")} value={version} onChange={(e) => setVersion(e.target.value)} className="max-w-[180px]" />
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="max-w-[220px]" />
          <input ref={fileRef} type="file" className="text-sm" />
          <Button size="sm" disabled={pending} onClick={uploadBuild}>{t("uploadBuild")}</Button>
        </div>
        {program.builds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBuilds")}</p>
        ) : (
          <ul className="space-y-2">
            {program.builds.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-border/30 pb-2">
                <span>{t("buildLine", { version: b.version, fileName: b.fileName, size: (b.fileSize / 1024 / 1024).toFixed(1) })}</span>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => downloadBuild(b.id)}>
                  {t("download")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t("inviteCodesTitle")}</h3>
          <Button size="sm" variant="outline" disabled={pending} onClick={generateInvite}>{t("generateCode")}</Button>
        </div>
        {program.inviteCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInviteCodes")}</p>
        ) : (
          <ul className="space-y-1 font-mono text-sm text-ink-muted">
            {program.inviteCodes.map((c) => (
              <li key={c.id}>{t("inviteCodeLine", { code: c.code, uses: c.uses, max: c.maxUses || "∞" })}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">{t("applicationsTitle", { count: program.applications.length })}</h3>
        {program.applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noApplications")}</p>
        ) : (
          <ul className="space-y-3">
            {program.applications.map((a) => (
              <li key={a.id} className="rounded-lg border border-border/30 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.user.displayName ?? a.user.username}</span>
                  <Badge variant="outline">{applicationStatusLabel(a.status, t)}</Badge>
                  {a.user.discordId && <Badge variant="free">{t("discordLinked")}</Badge>}
                </div>
                {a.message && <p className="text-sm text-muted-foreground">{a.message}</p>}
                {a.status === "PENDING" || a.status === "WAITLIST" ? (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={pending} onClick={() => review(a.id, "APPROVED")}>{t("approve")}</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => review(a.id, "REJECTED")}>{t("reject")}</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
