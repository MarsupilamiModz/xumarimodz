"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  enrollMfa,
  verifyAndEnableMfa,
  disableMfa,
  regenerateBackupCodes,
  listMfaFactors,
} from "@/actions/security";
import { SectionCard } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/format-locale";
import { Key, ShieldCheck } from "lucide-react";

type Dashboard = {
  mfaEnabled: boolean;
  mfaEnabledAt: Date | null;
  mfaRequired: boolean;
  backupCodesRemaining: number;
  failedLoginAttempts: number;
  recentEvents: {
    id: string;
    eventType: string;
    createdAt: Date;
    ipHash: string | null;
  }[];
};

export function SecurityDashboardPanel({
  locale,
  initial,
}: {
  locale: string;
  initial: Dashboard;
}) {
  const t = useTranslations("accountPages.security");
  const [dashboard] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  function startEnroll() {
    startTransition(async () => {
      const r = await enrollMfa();
      if (r.success) {
        setEnrollData({ factorId: r.data.factorId, qrCode: r.data.qrCode, secret: r.data.secret });
      } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
    });
  }

  function confirmEnroll() {
    if (!enrollData) return;
    startTransition(async () => {
      const r = await verifyAndEnableMfa(enrollData.factorId, verifyCode);
      if (r.success) {
        setBackupCodes(r.data.backupCodes);
        setEnrollData(null);
        toast({ title: "toast.twoFaEnabled" });
        window.location.reload();
      } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
    });
  }

  function loadFactors() {
    startTransition(async () => {
      const r = await listMfaFactors();
      if (r.success && r.data.factors.length > 0) {
        setFactorId(r.data.factors[0].id);
      }
    });
  }

  function disable() {
    if (!factorId) {
      loadFactors();
      return;
    }
    startTransition(async () => {
      const r = await disableMfa(factorId);
      if (r.success) {
        toast({ title: "toast.twoFaDisabled" });
        window.location.reload();
      } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
    });
  }

  function regenCodes() {
    startTransition(async () => {
      const r = await regenerateBackupCodes();
      if (r.success) {
        setBackupCodes(r.data.backupCodes);
        toast({ title: "toast.backupCodesRegenerated" });
      } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard
        title={t("mfaTitle")}
        description={dashboard.mfaEnabled ? t("mfaOnText") : t("mfaOffText")}
        action={
          dashboard.mfaEnabled ? (
            <StatusBadge tone="success" label={t("enabled")} />
          ) : dashboard.mfaRequired ? (
            <StatusBadge tone="danger" label={t("required")} />
          ) : (
            <StatusBadge tone="neutral" label={t("notEnabled")} />
          )
        }
      >
        <div className="space-y-4">
          {dashboard.mfaEnabledAt && (
            <p className="meta">{t("enabledSince", { date: formatDate(dashboard.mfaEnabledAt, locale) })}</p>
          )}

          {!dashboard.mfaEnabled && !enrollData && (
            <Button disabled={pending} onClick={startEnroll}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {t("enable")}
            </Button>
          )}

          {enrollData && (
            <div className="space-y-3 rounded-lg border border-line p-4">
              <p className="text-sm text-ink">{t("scanQr")}</p>
              <div
                role="img"
                aria-label={t("qrLabel")}
                className="inline-block rounded bg-qr-background p-2"
                dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
              />
              <div>
                <p className="label-text">{t("secretLabel")}</p>
                <p className="mono-id mt-1 break-all">{enrollData.secret}</p>
              </div>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyCode.length >= 6) confirmEnroll();
                }}
              >
                <div className="space-y-1.5">
                  <label htmlFor="mfa-code" className="label-text">
                    {t("codeLabel")}
                  </label>
                  <Input
                    id="mfa-code"
                    placeholder={t("codePlaceholder")}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button type="submit" disabled={pending || verifyCode.length < 6}>
                  {t("verify")}
                </Button>
              </form>
            </div>
          )}

          {dashboard.mfaEnabled && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={regenCodes}>
                <Key className="h-4 w-4" aria-hidden />
                {t("regenerate", { count: dashboard.backupCodesRemaining })}
              </Button>
              {!dashboard.mfaRequired && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!factorId) loadFactors();
                    setConfirmDisable(true);
                  }}
                >
                  {t("disable")}
                </Button>
              )}
            </div>
          )}

          {backupCodes && (
            <div className="rounded-lg bg-warning-soft p-4">
              <p className="mb-2 text-sm font-medium text-ink">{t("backupTitle")}</p>
              <ul className="mono-id grid grid-cols-2 gap-1 text-ink">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={t("activityTitle")}
        description={t("failedLogins", { count: dashboard.failedLoginAttempts })}
      >
        <DataTable
          caption={t("activityTitle")}
          rows={dashboard.recentEvents}
          rowKey={(e) => e.id}
          empty={<EmptyState title={t("emptyTitle")} description={t("emptyText")} />}
          columns={[
            {
              key: "event",
              header: t("colEvent"),
              width: "minmax(0,1fr)",
              cell: (e) =>
                t.has(`event.${e.eventType}`) ? t(`event.${e.eventType}`) : e.eventType.replace(/_/g, " "),
            },
            {
              key: "date",
              header: t("colDate"),
              width: "160px",
              align: "right",
              cell: (e) => <span className="text-ink-muted">{formatDateTime(e.createdAt, locale)}</span>,
            },
          ]}
        />
      </SectionCard>

      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title={t("disableTitle")}
        description={t("disableText")}
        confirmLabel={t("disableConfirm")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          disable();
          if (factorId) setConfirmDisable(false);
        }}
      />
    </div>
  );
}
