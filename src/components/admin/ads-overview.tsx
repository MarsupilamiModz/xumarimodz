"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveAdminAdSettings, toggleAdPlacement } from "@/actions/admin/ads";
import type { AdProviderSettings } from "@/lib/ads";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate, formatNumber } from "@/lib/format-locale";

const SLOTS = ["homepage", "listing", "mod-detail", "search", "category", "creator", "dashboard", "sidebar", "footer"] as const;

type Campaign = {
  id: string;
  name: string;
  location: string;
  format: string;
  width: number | null;
  height: number | null;
  isEnabled: boolean;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  impressions: number;
  clicks: number;
};

function useSave() {
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string) =>
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.updated(message);
      router.refresh();
    });
  return { pending, run };
}

function ToggleRow({ id, label, hint, checked, disabled, onChange }: { id: string; label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">{label}</label>
        {hint && <p className="meta mt-0.5">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/** Übersicht: Schalter, Werbeflächen mit Größen und Kampagnen-Tabelle – jede Änderung wird sofort gespeichert. */
export function AdsOverview({ locale, settings, campaigns }: { locale: string; settings: AdProviderSettings; campaigns: Campaign[] }) {
  const t = useTranslations("admin.ad");
  const { pending, run } = useSave();
  const [current, setCurrent] = useState(settings);

  function update(next: Partial<AdProviderSettings>) {
    const merged = { ...current, ...next };
    setCurrent(merged);
    run(() => saveAdminAdSettings(merged), t("saved"));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-raised px-4" aria-labelledby="ads-general">
        <h2 id="ads-general" className="section-title pt-4">{t("general")}</h2>
        <div className="divide-y divide-line">
          <ToggleRow id="ads-enabled" label={t("enabled")} checked={!!current.globalAdsEnabled} disabled={pending} onChange={(v) => update({ globalAdsEnabled: v })} />
          <ToggleRow id="ads-premium" label={t("premiumFree")} hint={t("premiumFreeHint")} checked={current.premiumAdFree !== false} disabled={pending} onChange={(v) => update({ premiumAdFree: v })} />
          <ToggleRow id="ads-popups" label={t("popups")} checked={!!current.popupAdsEnabled} disabled={pending} onChange={(v) => update({ popupAdsEnabled: v })} />
        </div>
        <p className="meta border-t border-line py-3">{t("appNote")}</p>
      </section>

      <section className="rounded-lg border border-line bg-raised" aria-labelledby="ads-slots">
        <h2 id="ads-slots" className="section-title flex h-12 items-center border-b border-line px-4">{t("slots")}</h2>
        <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {SLOTS.map((slot) => {
            const inSlot = campaigns.filter((c) => c.location === slot);
            const sizes = Array.from(new Set(inSlot.map((c) => (c.width && c.height ? `${c.width}×${c.height}` : t("auto")))));
            const enabled = current.placementEnabled?.[slot] !== false;
            return (
              <li key={slot} className="flex items-center justify-between gap-3 border-line px-4 py-3 sm:border-b">
                <div className="min-w-0">
                  <label htmlFor={`slot-${slot}`} className="text-[13px] font-semibold text-ink">{t(`slot.${slot}`)}</label>
                  <p className="meta truncate">
                    {t("slotCampaigns", { count: inSlot.length })}
                    {sizes.length > 0 && ` · ${t("slotSizes", { sizes: sizes.join(", ") })}`}
                  </p>
                </div>
                <Switch
                  id={`slot-${slot}`}
                  aria-label={t("slotToggle", { slot: t(`slot.${slot}`) })}
                  checked={enabled}
                  disabled={pending}
                  onCheckedChange={(v) => update({ placementEnabled: { ...(current.placementEnabled ?? {}), [slot]: v } })}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-raised" aria-labelledby="ads-campaigns">
        <h2 id="ads-campaigns" className="section-title flex h-12 items-center border-b border-line px-4">{t("campaigns")}</h2>
        {campaigns.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("noCampaigns")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <caption className="sr-only">{t("campaigns")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("colName")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colSlot")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colFormat")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colSize")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colPeriod")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colStats")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colActive")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-row-hover">
                    <td className="px-4 py-2 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-2 text-ink-muted">{(SLOTS as readonly string[]).includes(c.location) ? t(`slot.${c.location}`) : c.location}</td>
                    <td className="px-4 py-2 text-ink-muted">{c.format}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{c.width && c.height ? `${c.width}×${c.height}` : t("auto")}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">
                      {c.scheduleStart || c.scheduleEnd
                        ? `${c.scheduleStart ? formatDate(c.scheduleStart, locale) : "…"} – ${c.scheduleEnd ? formatDate(c.scheduleEnd, locale) : "…"}`
                        : t("always")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-muted">
                      {formatNumber(c.impressions, locale)} / {formatNumber(c.clicks, locale)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Switch
                        aria-label={t("campaignToggle", { name: c.name })}
                        checked={c.isEnabled}
                        disabled={pending}
                        onCheckedChange={(v) => run(() => toggleAdPlacement(c.id, v), t("saved"))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
