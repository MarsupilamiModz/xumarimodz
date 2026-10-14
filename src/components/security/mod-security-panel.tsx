import { getLocale, getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SecurityBadge } from "@/components/security/security-badge";
import { formatDate } from "@/lib/format-locale";
import { getPublicSecurityLevel } from "@/lib/security/status";
import type { FileScanStatus } from "@prisma/client";

type Props = {
  scanStatus: FileScanStatus;
  scannedAt?: Date | null;
  isTrusted?: boolean;
  locale?: string;
};

export async function ModSecurityPanel({ scanStatus, scannedAt, isTrusted = false, locale }: Props) {
  const t = await getTranslations("security");
  const displayLocale = locale ?? (await getLocale());
  const levelKey = getPublicSecurityLevel(scanStatus, isTrusted);
  const verified = scanStatus === "CLEAN" || scanStatus === "APPROVED";

  return (
    <SectionCard>
      <h2 className="section-title mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
        {t("panel.title")}
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {verified && (
            <>
              <StatusBadge tone="success" label={t("badges.virusTotalPassed")} />
              {scanStatus === "APPROVED" && <StatusBadge tone="success" label={t("badges.manuallyVerified")} />}
              <StatusBadge tone="success" label={t("badges.safeDownload")} />
              <StatusBadge tone="success" label={t("badges.secureStorage")} />
            </>
          )}
          {!verified && <SecurityBadge scanStatus={scanStatus} isTrusted={isTrusted} />}
        </div>

        {verified && <StatusBadge tone="success" label={t("badges.verifiedSafe")} />}

        {isTrusted && verified && <p className="meta">{t("badges.trustedByTeam")}</p>}

        <div className="meta space-y-1 border-t border-line pt-3">
          {scannedAt && (
            <p>
              {t("panel.lastScan")}: {formatDate(scannedAt, displayLocale)}
            </p>
          )}
          <p>
            {t("panel.securityLevel")}: {t(`badges.${levelKey}` as `badges.${typeof levelKey}`)}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
