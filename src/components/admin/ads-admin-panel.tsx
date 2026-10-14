"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  saveAdminAdSettings,
  saveAdminSiteVerification,
  saveAdminHeadScripts,
  toggleAdPlacement,
} from "@/actions/admin/ads";
import type { AdFormat, AdProviderType } from "@prisma/client";
import type { AdProviderSettings } from "@/lib/ads";
import type { AdSenseReadinessReport } from "@/lib/ads-readiness";
import type { SiteVerificationSettings } from "@/lib/site-verification";
import type { HeadScriptsSettings } from "@/lib/head-scripts";
import { DEFAULT_ADSENSE_CLIENT_ID } from "@/lib/adsense-config";
import { formatDateTime, formatNumber } from "@/lib/format-locale";

const ROLE_LEVELS = [
  "GUEST",
  "USER",
  "premium-lite",
  "premium",
  "premium-max",
  "PREMIUM",
  "CREATOR",
  "PARTNER",
  "MODERATOR",
  "ADMIN",
  "OWNER",
] as const;

const PLACEMENT_PAGES = [
  { key: "homepage", labelKey: "placementHomepage" },
  { key: "listing", labelKey: "placementListing" },
  { key: "mod-detail", labelKey: "placementModDetail" },
  { key: "dashboard", labelKey: "placementDashboard" },
  { key: "sidebar", labelKey: "placementSidebar" },
  { key: "footer", labelKey: "placementFooter" },
  { key: "search", labelKey: "placementSearch" },
  { key: "creator", labelKey: "placementCreator" },
  { key: "category", labelKey: "placementCategory" },
] as const;

const ROLE_LEVEL_KEYS = {
  full: "roleLevelFull",
  reduced: "roleLevelReduced",
  none: "roleLevelNone",
} as const;

const TABS = [
  ["status", "tabStatus"],
  ["adsense", "tabAdsense"],
  ["microsoft", "tabMicrosoft"],
  ["verification", "tabVerification"],
  ["analytics", "tabAnalytics"],
  ["roles", "tabRoles"],
  ["placements", "tabPlacements"],
] as const;

type Props = {
  data: {
    settings: AdProviderSettings;
    placements: Array<{
      id: string;
      slug: string;
      name: string;
      location: string;
      format: AdFormat;
      provider: AdProviderType;
      isEnabled: boolean;
      impressions: number;
      clicks: number;
    }>;
    providers: Array<{ type: AdProviderType; name: string; isEnabled: boolean; config: unknown }>;
    totalImpressions: number;
    totalClicks: number;
    readiness: AdSenseReadinessReport;
    verification: SiteVerificationSettings;
    headScripts: HeadScriptsSettings;
  };
};

type Tab =
  | "status"
  | "adsense"
  | "microsoft"
  | "verification"
  | "analytics"
  | "roles"
  | "placements";

/** Feld mit sichtbarem Label. */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
    </div>
  );
}

/** Schalter mit Text links, ganze Zeile klickbar. */
function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked?: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-ink">
      {label}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function AdsAdminPanel({ data }: Props) {
  const t = useTranslations("admin.ui.adsAdmin");
  const tp = useTranslations("admin.panelAds");
  const tRole = useTranslations("status.role");
  const locale = useLocale();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(data.settings);
  const [verification, setVerification] = useState(data.verification);
  const [headScripts, setHeadScripts] = useState(data.headScripts);
  const [tab, setTab] = useState<Tab>("status");

  const rpm =
    data.totalImpressions > 0
      ? formatNumber(Math.round((data.totalClicks / data.totalImpressions) * 1000 * 100) / 100, locale)
      : "—";
  const ctr =
    data.totalImpressions > 0
      ? `${formatNumber(Math.round((data.totalClicks / data.totalImpressions) * 100 * 100) / 100, locale)} %`
      : "—";

  // Rollen in Großbuchstaben kommen aus status.role, Premium-Stufen und Gäste aus admin.panelAds.role.
  const roleLabel = (role: string) =>
    tp.has(`role.${role}`) ? tp(`role.${role}`) : tRole.has(role) ? tRole(role) : role;

  const save = () =>
    startTransition(async () => {
      const r = await saveAdminAdSettings(settings);
      if (r.success) appToast.saved();
      else appToast.error(r.error);
    });

  return (
    <div className="space-y-6">
      <ChipTabs
        label={tp("tabsLabel")}
        value={tab}
        options={TABS.map(([id, labelKey]) => ({ value: id, label: t(labelKey) }))}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === "status" && (
        <SectionCard
          title={t("readinessTitle")}
          description={t("publisherLabel", { id: data.readiness.publisherId || DEFAULT_ADSENSE_CLIENT_ID })}
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.readiness.checks.map((check) => (
              <li key={check.id} className="flex items-start justify-between gap-2 rounded-lg border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">{check.label}</p>
                  <p className="meta mt-1">{check.detail}</p>
                </div>
                <StatusBadge tone={check.ok ? "success" : "danger"} label={check.ok ? t("checkOk") : t("checkError")} />
              </li>
            ))}
          </ul>
          {data.readiness.warnings.length > 0 && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-warning-soft p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div className="space-y-1">
                {data.readiness.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </div>
          )}
          <p className="meta mt-4">
            {t("lastCheckLabel")} {formatDateTime(data.readiness.lastCheckedAt, locale)} ·{" "}
            <a className="link" href={data.readiness.adsTxtUrl} target="_blank" rel="noreferrer">
              {data.readiness.adsTxtUrl}
            </a>
            {data.readiness.adsTxtReachable ? t("reachableSuffix") : t("notReachableSuffix")}
          </p>
          <p className="meta mt-1">
            {t("staticFileLabel")} <a className="link" href="/ads.txt" target="_blank" rel="noreferrer">/ads.txt</a>
          </p>
        </SectionCard>
      )}

      {tab === "analytics" && (
        <section className="space-y-3">
          <h2 className="section-title">{t("analyticsTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label={t("impressions")} value={formatNumber(data.totalImpressions, locale)} />
            <KpiTile label={t("clicks")} value={formatNumber(data.totalClicks, locale)} />
            <KpiTile label={t("ctr")} value={ctr} />
            <KpiTile label={t("rpmProxy")} value={rpm} />
          </div>
          <p className="meta">{t("analyticsHint")}</p>
        </section>
      )}

      {tab === "verification" && (
        <>
          <SectionCard title={t("verificationTitle")}>
            <div className="space-y-4">
              <Field id="ads-verify-google" label={t("googleSearchConsolePlaceholder")}>
                <Input
                  id="ads-verify-google"
                  className="mono-id"
                  value={verification.googleSiteVerification ?? ""}
                  onChange={(e) => setVerification((v) => ({ ...v, googleSiteVerification: e.target.value }))}
                />
              </Field>
              <Field id="ads-verify-adsense" label={t("googleAdsensePlaceholder")}>
                <Input
                  id="ads-verify-adsense"
                  className="mono-id"
                  value={verification.googleAdsenseVerification ?? ""}
                  onChange={(e) => setVerification((v) => ({ ...v, googleAdsenseVerification: e.target.value }))}
                />
              </Field>
              <Field id="ads-verify-bing" label={t("bingPlaceholder")}>
                <Input
                  id="ads-verify-bing"
                  className="mono-id"
                  value={verification.bingSiteVerification ?? ""}
                  onChange={(e) => setVerification((v) => ({ ...v, bingSiteVerification: e.target.value }))}
                />
              </Field>
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await saveAdminSiteVerification(verification);
                    if (r.success) appToast.saved(t("verificationSavedToast"));
                    else appToast.error(r.error);
                  })
                }
              >
                {t("saveVerificationTags")}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t("headScriptsTitle")} description={t("headScriptsHint")}>
            <div className="space-y-4">
              <Field id="ads-head-script" label={tp("scriptSnippet")}>
                <Textarea
                  id="ads-head-script"
                  rows={4}
                  className="mono-id"
                  value={headScripts.scriptSnippets[0]?.html ?? ""}
                  onChange={(e) =>
                    setHeadScripts((h) => ({
                      ...h,
                      scriptSnippets: [
                        {
                          id: "custom-analytics",
                          label: "Custom Analytics",
                          html: e.target.value,
                          enabled: Boolean(e.target.value.trim()),
                          placement: "body",
                        },
                      ],
                    }))
                  }
                />
              </Field>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await saveAdminHeadScripts(headScripts);
                    if (r.success) appToast.saved(t("headScriptsSavedToast"));
                    else appToast.error(r.error);
                  })
                }
              >
                {t("saveHeadScripts")}
              </Button>
            </div>
          </SectionCard>
        </>
      )}

      {tab === "adsense" && (
        <SectionCard title={t("adsenseTitle")}>
          <div className="space-y-4">
            <SwitchRow
              label={t("globalScriptLabel")}
              checked={settings.adsenseGlobalScriptEnabled !== false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseGlobalScriptEnabled: v }))}
            />
            <SwitchRow
              label={t("consentModeLabel")}
              checked={settings.consentModeEnabled !== false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, consentModeEnabled: v }))}
            />
            <SwitchRow
              label={t("enableAdSlots")}
              checked={settings.adsenseEnabled ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseEnabled: v }))}
            />
            <SwitchRow
              label={t("autoAds")}
              checked={settings.adsenseAutoAds ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseAutoAds: v }))}
            />
            <Field id="ads-publisher-id" label={t("publisherIdPlaceholder")}>
              <Input
                id="ads-publisher-id"
                className="mono-id"
                value={settings.adsenseClientId ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, adsenseClientId: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLACEMENT_PAGES.map((p) => (
                <Field key={p.key} id={`ads-slot-${p.key}`} label={t("slotIdPlaceholder", { page: t(p.labelKey) })}>
                  <Input
                    id={`ads-slot-${p.key}`}
                    className="mono-id"
                    value={settings.adsenseSlotIds?.[p.key] ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        adsenseSlotIds: { ...(s.adsenseSlotIds ?? {}), [p.key]: e.target.value },
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
            <Button disabled={pending} onClick={save}>
              {t("saveAdsenseSettings")}
            </Button>
          </div>
        </SectionCard>
      )}

      {tab === "microsoft" && (
        <SectionCard title={t("microsoftTitle")}>
          <div className="space-y-4">
            <SwitchRow
              label={t("enableMicrosoftAds")}
              checked={settings.microsoftEnabled ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, microsoftEnabled: v }))}
            />
            <Field id="ads-ms-account" label={t("accountIdPlaceholder")}>
              <Input
                id="ads-ms-account"
                className="mono-id"
                value={settings.microsoftAccountId ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, microsoftAccountId: e.target.value }))}
              />
            </Field>
            <Field id="ads-ms-uet" label={t("uetTrackingPlaceholder")}>
              <Input
                id="ads-ms-uet"
                className="mono-id"
                value={settings.microsoftTrackingId ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, microsoftTrackingId: e.target.value }))}
              />
            </Field>
            <Field id="ads-ms-conversion" label={t("conversionIdPlaceholder")}>
              <Input
                id="ads-ms-conversion"
                className="mono-id"
                value={settings.microsoftConversionId ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, microsoftConversionId: e.target.value }))}
              />
            </Field>
            <Button disabled={pending} onClick={save}>
              {t("saveMicrosoftSettings")}
            </Button>
          </div>
        </SectionCard>
      )}

      {tab === "roles" && (
        <SectionCard title={t("roleControlTitle")} description={t("roleLevelsHint")}>
          <div className="space-y-4">
            <div className="divide-y divide-line rounded-lg border border-line">
              {ROLE_LEVELS.map((role) => (
                <fieldset key={role} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 text-sm">
                  <legend className="sr-only">{roleLabel(role)}</legend>
                  <span aria-hidden className="w-32 font-medium text-ink">{roleLabel(role)}</span>
                  {(["full", "reduced", "none"] as const).map((level) => (
                    <label key={level} className="flex items-center gap-1.5 text-ink">
                      <input
                        type="radio"
                        name={`role-${role}`}
                        checked={(settings.roleAdLevels?.[role] ?? "full") === level}
                        onChange={() =>
                          setSettings((s) => ({
                            ...s,
                            roleAdLevels: { ...(s.roleAdLevels ?? {}), [role]: level },
                          }))
                        }
                      />
                      {t(ROLE_LEVEL_KEYS[level])}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            <Button disabled={pending} onClick={save}>
              {t("saveRoleSettings")}
            </Button>
          </div>
        </SectionCard>
      )}

      {tab === "placements" && (
        <>
          <SectionCard title={t("multiNetworkTitle")}>
            <div className="space-y-4">
              <SwitchRow
                label={t("enableAdsGlobally")}
                checked={settings.globalAdsEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, globalAdsEnabled: v }))}
              />
              <SwitchRow
                label={t("popupAds")}
                checked={settings.popupAdsEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, popupAdsEnabled: v }))}
              />
              <p className="meta">
                {t("providerPriority", { list: (settings.adProviderPriority ?? ["ADSENSE", "MICROSOFT"]).join(" → ") })}
              </p>
              <Button disabled={pending} onClick={save}>
                {t("saveAllSettings")}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t("placementControlsTitle")}>
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {PLACEMENT_PAGES.map((p) => (
                  <label key={p.key} className="flex items-center justify-between gap-4 rounded-lg border border-line p-3 text-sm text-ink">
                    {t(p.labelKey)}
                    <Switch
                      checked={settings.placementEnabled?.[p.key] !== false}
                      onCheckedChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          placementEnabled: { ...(s.placementEnabled ?? {}), [p.key]: v },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <Button variant="outline" disabled={pending} onClick={save}>
                {t("savePlacementToggles")}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t("adSlotInventoryTitle")}>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {data.placements.map((ad) => (
                <li key={ad.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-[200px] flex-1">
                    <p className="font-medium text-ink">{ad.name}</p>
                    <p className="meta">
                      <span className="mono-id">{ad.location}</span> · {ad.format} · {ad.provider}
                    </p>
                  </div>
                  <span className="meta tabular-nums">{t("viewsCount", { count: ad.impressions })}</span>
                  <span className="meta tabular-nums">{t("clicksCount", { count: ad.clicks })}</span>
                  <Switch
                    aria-label={tp("placementToggle", { name: ad.name })}
                    checked={ad.isEnabled}
                    onCheckedChange={(v) =>
                      startTransition(async () => {
                        // Ergebnis prüfen: vorher blieb ein Fehler unbemerkt (Schalter zeigte den neuen Zustand).
                        const r = await toggleAdPlacement(ad.id, v);
                        if (r.success) router.refresh();
                        else appToast.error(r.error);
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}
