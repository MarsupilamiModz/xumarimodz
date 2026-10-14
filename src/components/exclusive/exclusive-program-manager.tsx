"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import {
  reviewExclusiveApplication,
  uploadExclusiveBuild,
  createExclusiveInviteCode,
  toggleExclusiveProgram,
  getExclusiveDownloadUrl,
} from "@/actions/exclusive";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
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

const APPLICATION_STATUS_TONE: Record<ExclusiveApplicationStatus, StatusTone> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "danger",
  WAITLIST: "warning",
};

const labelClass = "label-text mb-1.5 block text-ink-muted";

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
  const tp = useTranslations("creatorPages.exclusive");
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
      <PageHeader
        level="h2"
        className="mb-0"
        title={program.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{program.mod.title}</span>
            <StatusBadge tone="info" label={programTypeLabel(program.type, t)} />
            <StatusBadge
              tone={program.isActive ? "success" : "neutral"}
              label={program.isActive ? t("active") : t("inactive")}
            />
            {program.maxSlots != null && (
              <span className="meta tabular-nums">
                {t("slotsFilled", { current: program.currentCount, max: program.maxSlots })}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-ink">
              <Switch
                checked={program.isActive}
                onCheckedChange={(v) =>
                  startTransition(async () => {
                    const r = await toggleExclusiveProgram(program.id, v);
                    if (r.success) appToast.saved();
                  })
                }
              />
              {tp("programActive")}
            </label>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/exclusive/${program.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t("publicApplyPage")}
                <span className="sr-only"> ({tp("openInNewTab")})</span>
              </Link>
            </Button>
          </>
        }
      />
      {program.description && <p className="max-w-2xl text-sm text-ink">{program.description}</p>}

      <SectionCard title={t("privateBuildsTitle")}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-44">
              <label htmlFor="build-version" className={labelClass}>{tp("buildVersion")}</label>
              <Input
                id="build-version"
                placeholder={t("versionPlaceholder")}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <label htmlFor="build-expires" className={labelClass}>{tp("buildExpires")}</label>
              <Input id="build-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="build-file" className={labelClass}>{tp("buildFile")}</label>
              <input id="build-file" ref={fileRef} type="file" className="block w-full text-sm text-ink-muted" />
            </div>
            <Button size="sm" disabled={pending} aria-busy={pending} onClick={uploadBuild}>{t("uploadBuild")}</Button>
          </div>
          {program.builds.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noBuilds")}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {program.builds.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[13px] text-ink">
                  <span className="min-w-0 break-all">
                    {t("buildLine", { version: b.version, fileName: b.fileName, size: (b.fileSize / 1024 / 1024).toFixed(1) })}
                  </span>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => downloadBuild(b.id)}>
                    {t("download")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={t("inviteCodesTitle")}
        action={
          <Button size="sm" variant="outline" disabled={pending} onClick={generateInvite}>{t("generateCode")}</Button>
        }
      >
        {program.inviteCodes.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("noInviteCodes")}</p>
        ) : (
          <ul className="mono-id space-y-1 text-sm text-ink-muted">
            {program.inviteCodes.map((c) => (
              <li key={c.id}>{t("inviteCodeLine", { code: c.code, uses: c.uses, max: c.maxUses || "∞" })}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("applicationsTitle", { count: program.applications.length })}>
        {program.applications.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("noApplications")}</p>
        ) : (
          <ul className="space-y-3" aria-label={tp("applicationsCaption")}>
            {program.applications.map((a) => (
              <li key={a.id} className="space-y-2 rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{a.user.displayName ?? a.user.username}</span>
                  <StatusBadge tone={APPLICATION_STATUS_TONE[a.status]} label={applicationStatusLabel(a.status, t)} />
                  {a.user.discordId && <StatusBadge tone="neutral" label={t("discordLinked")} />}
                </div>
                {a.message && <p className="text-sm text-ink-muted">{a.message}</p>}
                {a.status === "PENDING" || a.status === "WAITLIST" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => review(a.id, "APPROVED")}>{t("approve")}</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => review(a.id, "REJECTED")}>{t("reject")}</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
