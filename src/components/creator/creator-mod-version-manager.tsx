"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { History } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  archiveModVersion,
  restoreModVersion,
  setModVersionPrimary,
  setModVersionChannel,
} from "@/actions/mods";
import type { FileScanStatus, VersionChannel } from "@prisma/client";
import { formatBytes } from "@/lib/file-size";
import { formatDate } from "@/lib/format-locale";

type Version = {
  id: string;
  version: string;
  changelog: string | null;
  gameVersion: string | null;
  fileSize: bigint | number;
  channel: VersionChannel;
  isPrimary: boolean;
  isArchived: boolean;
  scanStatus: FileScanStatus;
  downloadCount: number;
  createdAt: Date;
};

const SCAN_TONE: Record<FileScanStatus, StatusTone> = {
  PENDING: "pending",
  SCANNING: "pending",
  CLEAN: "success",
  APPROVED: "success",
  SUSPICIOUS: "warning",
  MALWARE: "danger",
  REJECTED: "danger",
  MANUAL_REVIEW: "warning",
  FAILED: "danger",
};

export function CreatorModVersionManager({ versions }: { modId?: string; versions: Version[] }) {
  const t = useTranslations("creatorPages.modEditor");
  const tt = useTranslations("toast");
  const locale = useLocale();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<Version | null>(null);

  function act(fn: () => Promise<{ success: boolean; error?: string }>, label: string, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        appToast.raw({ title: label });
        after?.();
        router.refresh();
      } else appToast.error(r.error ?? tt("error"));
    });
  }

  return (
    <SectionCard title={t("versionsTitle")}>
      {versions.length === 0 ? (
        <EmptyState icon={History} title={t("versionsEmptyTitle")} description={t("versionsEmptyText")} className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {versions.map((v) => (
            <li key={v.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">v{v.version}</span>
                {v.isPrimary && <StatusBadge tone="success" label={t("latest")} />}
                {v.channel === "BETA" && <StatusBadge tone="info" label={t("beta")} />}
                {v.isArchived && <StatusBadge tone="neutral" label={t("archived")} />}
                <StatusBadge tone={SCAN_TONE[v.scanStatus]} label={t(`scan.${v.scanStatus}`)} />
              </div>
              <p className="meta mt-1 tabular-nums">
                {formatDate(v.createdAt, locale)}
                {" · "}
                {formatBytes(v.fileSize)}
                {v.gameVersion && ` · ${v.gameVersion}`}
                {" · "}
                {t("downloads", { count: v.downloadCount })}
              </p>
              {v.changelog && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{v.changelog}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {!v.isPrimary && !v.isArchived && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setModVersionPrimary(v.id), t("setLatestDone"))}>
                    {t("setLatest")}
                  </Button>
                )}
                {!v.isArchived ? (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setArchiveTarget(v)}>
                    {t("archive")}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => restoreModVersion(v.id), t("restoredDone"))}>
                    {t("restore")}
                  </Button>
                )}
                {v.channel !== "BETA" && !v.isArchived && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setModVersionChannel(v.id, "BETA"), t("betaDone"))}>
                    {t("markBeta")}
                  </Button>
                )}
                {v.channel === "BETA" && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setModVersionChannel(v.id, "STABLE"), t("stableDone"))}>
                    {t("markStable")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t("archiveTitle", { version: archiveTarget?.version ?? "" })}
        description={t("archiveText")}
        confirmLabel={t("archive")}
        loading={pending}
        onConfirm={() => {
          if (!archiveTarget) return;
          const id = archiveTarget.id;
          act(() => archiveModVersion(id), t("archivedDone"), () => setArchiveTarget(null));
        }}
      />
    </SectionCard>
  );
}
