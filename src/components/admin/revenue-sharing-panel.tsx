"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { saveAdminRevenueShareSettings } from "@/actions/admin/revenue-sharing";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { bpsToPercent } from "@/lib/revenue-sharing-shared";
import type { RevenueShareSettings } from "@/lib/revenue-sharing";
import { formatCents } from "@/lib/affiliate";

type Dashboard = {
  settings: RevenueShareSettings;
  revenueTodayCents: number;
  revenue30dCents: number;
  pendingPayoutCents: number;
  pendingPayoutCount: number;
  openCommissionCents: number;
  openCommissionCount: number;
};

export function RevenueSharingPanel({ data }: { data: Dashboard }) {
  const t = useTranslations("admin.ui.revenueSharing");
  const locale = useLocale();
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    creator: String(data.settings.creatorShareBps / 100),
    designer: String(data.settings.designerShareBps / 100),
    partner: String(data.settings.partnerShareBps / 100),
    platform: String(data.settings.platformShareBps / 100),
  });

  const total =
    Number(form.creator || 0) +
    Number(form.designer || 0) +
    Number(form.partner || 0) +
    Number(form.platform || 0);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (Math.abs(total - 100) > 0.01) {
      appToast.error(t("sharesMustTotal"));
      return;
    }
    startTransition(async () => {
      const r = await saveAdminRevenueShareSettings({
        creatorShareBps: Math.round(Number(form.creator) * 100),
        designerShareBps: Math.round(Number(form.designer) * 100),
        partnerShareBps: Math.round(Number(form.partner) * 100),
        platformShareBps: Math.round(Number(form.platform) * 100),
      });
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  const ok = Math.abs(total - 100) < 0.01;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("revenueToday")} value={formatCents(data.revenueTodayCents, locale)} />
        <KpiTile label={t("revenue30d")} value={formatCents(data.revenue30dCents, locale)} />
        <KpiTile
          label={t("openCommissions")}
          value={formatCents(data.openCommissionCents, locale)}
          hint={t("entriesCount", { count: data.openCommissionCount })}
        />
        <KpiTile
          label={t("pendingPayouts")}
          value={formatCents(data.pendingPayoutCents, locale)}
          hint={t("payoutsCount", { count: data.pendingPayoutCount })}
        />
      </div>

      <SectionCard title={t("globalRevenueSplit")} className="max-w-xl">
        <form onSubmit={save} className="space-y-4">
          {(
            [
              ["creator", t("creatorShare")],
              ["designer", t("designerShare")],
              ["partner", t("partnerShare")],
              ["platform", t("platformShare")],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={`share-${key}`} className="label-text">{label}</label>
              <Input
                id={`share-${key}`}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="tabular-nums"
              />
            </div>
          ))}
          <div aria-live="polite">
            <StatusBadge tone={ok ? "success" : "danger"} label={t("totalMustEqual", { total: total.toFixed(1) })} />
          </div>
          <p className="meta">
            {t("currentSplit", {
              creator: bpsToPercent(data.settings.creatorShareBps),
              designer: bpsToPercent(data.settings.designerShareBps),
              partner: bpsToPercent(data.settings.partnerShareBps),
              platform: bpsToPercent(data.settings.platformShareBps),
            })}
          </p>
          <Button type="submit" disabled={pending}>
            {t("savePayoutSettings")}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
