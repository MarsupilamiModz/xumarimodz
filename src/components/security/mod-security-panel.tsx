import { getTranslations } from "next-intl/server";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import { getPublicSecurityLevel } from "@/lib/security/status";
import type { FileScanStatus } from "@prisma/client";

type Props = {
  scanStatus: FileScanStatus;
  scannedAt?: Date | null;
  isTrusted?: boolean;
  locale?: string;
};

export async function ModSecurityPanel({ scanStatus, scannedAt, isTrusted = false }: Props) {
  const t = await getTranslations("security");
  const levelKey = getPublicSecurityLevel(scanStatus, isTrusted);
  const verified = scanStatus === "CLEAN" || scanStatus === "APPROVED";

  return (
    <Card className="glass border-success/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          {t("panel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {verified && (
            <>
              <span className="text-success">{t("panel.virusTotalPassed")}</span>
              {scanStatus === "APPROVED" && (
                <span className="text-success">{t("panel.manuallyVerified")}</span>
              )}
              <span className="text-success">{t("panel.safeDownload")}</span>
              <span className="text-success">{t("panel.secureStorage")}</span>
            </>
          )}
          {!verified && <SecurityBadge scanStatus={scanStatus} isTrusted={isTrusted} />}
        </div>

        {verified && (
          <p className="font-medium text-success">✓ {t("badges.verifiedSafe")}</p>
        )}

        {isTrusted && verified && (
          <p className="text-xs text-muted-foreground">{t("panel.trustedByTeam")}</p>
        )}

        <div className="border-t border-border/30 pt-3 space-y-1 text-xs text-muted-foreground">
          {scannedAt && (
            <p>
              {t("panel.lastScan")}: {safeToLocaleDateString(scannedAt)}
            </p>
          )}
          <p>
            {t("panel.securityLevel")}: {t(`badges.${levelKey}` as `badges.${typeof levelKey}`)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
