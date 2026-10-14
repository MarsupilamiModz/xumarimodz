"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { VersionChannel } from "@prisma/client";
import { formatBytes } from "@/lib/file-size";
import { formatDate, formatNumber } from "@/lib/format-locale";

type Version = {
  id: string;
  version: string;
  changelog: string | null;
  gameVersion: string | null;
  fileSize: bigint | number;
  channel: VersionChannel;
  isPrimary: boolean;
  isArchived: boolean;
  downloadCount: number;
  createdAt: Date;
};

type Props = {
  modId: string;
  versions: Version[];
};

export function ModVersionsPanel({ modId, versions }: Props) {
  const t = useTranslations("sharedUi.versions");
  const tMods = useTranslations("mods");
  const [pending, startTransition] = useTransition();

  function downloadVersion(versionId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/mods/${modId}/download?versionId=${versionId}`, {
        method: "POST",
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    });
  }

  const active = versions.filter((v) => !v.isArchived);
  const archived = versions.filter((v) => v.isArchived);

  if (versions.length === 0) return null;

  return (
    <SectionCard title={tMods("versions")}>
      <div className="space-y-3">
        {active.map((v) => (
          <VersionRow key={v.id} version={v} pending={pending} onDownload={downloadVersion} />
        ))}
        {archived.length > 0 && (
          <>
            <p className="label-text pt-2">{t("legacy")}</p>
            {archived.map((v) => (
              <VersionRow key={v.id} version={v} pending={pending} onDownload={downloadVersion} legacy />
            ))}
          </>
        )}
      </div>
    </SectionCard>
  );
}

function VersionRow({
  version,
  pending,
  onDownload,
  legacy,
}: {
  version: Version;
  pending: boolean;
  onDownload: (id: string) => void;
  legacy?: boolean;
}) {
  const t = useTranslations("sharedUi.versions");
  const locale = useLocale();
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line py-3 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{t("version", { version: version.version })}</span>
          {version.isPrimary && <StatusBadge tone="success" label={t("latest")} />}
          {version.channel === "BETA" && <Badge variant="outline">{t("beta")}</Badge>}
          {legacy && (
            <Badge variant="outline" className="gap-1">
              <RotateCcw className="h-3 w-3" aria-hidden /> {t("legacyBadge")}
            </Badge>
          )}
        </div>
        <p className="meta mt-1">
          {formatDate(version.createdAt, locale)}
          {" · "}
          {formatBytes(version.fileSize, locale)}
          {version.gameVersion && ` · ${version.gameVersion}`}
          {` · ${t("downloads", { count: formatNumber(version.downloadCount, locale) })}`}
        </p>
        {version.changelog && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{version.changelog}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => onDownload(version.id)}
      >
        <Download className="mr-1 h-4 w-4" aria-hidden />
        {version.isPrimary ? t("download") : t("rollback")}
      </Button>
    </div>
  );
}
