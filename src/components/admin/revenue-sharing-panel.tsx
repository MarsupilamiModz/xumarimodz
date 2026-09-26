"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveAdminRevenueShareSettings } from "@/actions/admin/revenue-sharing";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { bpsToPercent, type RevenueShareSettings } from "@/lib/revenue-sharing";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1-acp">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subheading")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{t("revenueToday")}</p>
          <p className="text-2xl font-bold tabular-nums">{formatCents(data.revenueTodayCents)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{t("revenue30d")}</p>
          <p className="text-2xl font-bold tabular-nums">{formatCents(data.revenue30dCents)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{t("openCommissions")}</p>
          <p className="text-2xl font-bold tabular-nums">{formatCents(data.openCommissionCents)}</p>
          <p className="text-xs text-muted-foreground">{t("entriesCount", { count: data.openCommissionCount })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">{t("pendingPayouts")}</p>
          <p className="text-2xl font-bold tabular-nums">{formatCents(data.pendingPayoutCents)}</p>
          <p className="text-xs text-muted-foreground">{t("payoutsCount", { count: data.pendingPayoutCount })}</p>
        </Card>
      </div>

      <Card className="p-6 max-w-xl">
        <h2 className="font-semibold mb-4">{t("globalRevenueSplit")}</h2>
        <form onSubmit={save} className="space-y-4">
          {(
            [
              ["creator", t("creatorShare")],
              ["designer", t("designerShare")],
              ["partner", t("partnerShare")],
              ["platform", t("platformShare")],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1"
              />
            </div>
          ))}
          <p className={`text-sm ${Math.abs(total - 100) < 0.01 ? "text-success" : "text-destructive"}`}>
            {t("totalMustEqual", { total: total.toFixed(1) })}
          </p>
          <p className="text-xs text-muted-foreground">
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
      </Card>
    </div>
  );
}
