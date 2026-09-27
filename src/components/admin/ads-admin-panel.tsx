"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { safeToLocaleString } from "@/lib/i18n/safe-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/format-locale";

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

export function AdsAdminPanel({ data }: Props) {
  const t = useTranslations("admin.ui.adsAdmin");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(data.settings);
  const [verification, setVerification] = useState(data.verification);
  const [headScripts, setHeadScripts] = useState(data.headScripts);
  const [tab, setTab] = useState<Tab>("status");

  const rpm =
    data.totalImpressions > 0
      ? ((data.totalClicks / data.totalImpressions) * 1000).toFixed(2)
      : "—";

  const save = () =>
    startTransition(async () => {
      const r = await saveAdminAdSettings(settings);
      if (r.success) appToast.saved();
      else appToast.error(r.error);
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, labelKey]) => (
          <Button key={id} variant={tab === id ? "default" : "outline"} size="sm" onClick={() => setTab(id)}>
            {t(labelKey)}
          </Button>
        ))}
      </div>

      {tab === "status" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("readinessTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("publisherLabel", { id: data.readiness.publisherId || DEFAULT_ADSENSE_CLIENT_ID })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.readiness.checks.map((check) => (
              <div
                key={check.id}
                className="rounded-lg border border-border/40 p-3 flex items-start justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
                </div>
                <StatusBadge tone={check.ok ? "success" : "danger"} label={check.ok ? t("checkOk") : t("checkError")} />
              </div>
            ))}
          </div>
          {data.readiness.warnings.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              {data.readiness.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("lastCheckLabel")} {formatDateTime(data.readiness.lastCheckedAt)} ·{" "}
            <a className="underline" href={data.readiness.adsTxtUrl} target="_blank" rel="noreferrer">
              {data.readiness.adsTxtUrl}
            </a>
            {data.readiness.adsTxtReachable ? t("reachableSuffix") : t("notReachableSuffix")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("staticFileLabel")} <a className="underline" href="/ads.txt" target="_blank" rel="noreferrer">/ads.txt</a>
          </p>
        </Card>
      )}

      {tab === "analytics" && (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold">{t("analyticsTitle")}</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{t("impressions")}</p>
              <p className="text-2xl font-bold">{safeToLocaleString(data.totalImpressions)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{t("clicks")}</p>
              <p className="text-2xl font-bold">{safeToLocaleString(data.totalClicks)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{t("ctr")}</p>
              <p className="text-2xl font-bold">
                {data.totalImpressions > 0
                  ? `${((data.totalClicks / data.totalImpressions) * 100).toFixed(2)}%`
                  : "—"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{t("rpmProxy")}</p>
              <p className="text-2xl font-bold">{rpm}</p>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">{t("analyticsHint")}</p>
        </Card>
      )}

      {tab === "verification" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("verificationTitle")}</h3>
          <Input
            placeholder={t("googleSearchConsolePlaceholder")}
            value={verification.googleSiteVerification ?? ""}
            onChange={(e) => setVerification((v) => ({ ...v, googleSiteVerification: e.target.value }))}
          />
          <Input
            placeholder={t("googleAdsensePlaceholder")}
            value={verification.googleAdsenseVerification ?? ""}
            onChange={(e) => setVerification((v) => ({ ...v, googleAdsenseVerification: e.target.value }))}
          />
          <Input
            placeholder={t("bingPlaceholder")}
            value={verification.bingSiteVerification ?? ""}
            onChange={(e) => setVerification((v) => ({ ...v, bingSiteVerification: e.target.value }))}
          />
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

          <hr className="border-border/40" />
          <h4 className="font-medium text-sm">{t("headScriptsTitle")}</h4>
          <p className="text-xs text-muted-foreground">{t("headScriptsHint")}</p>
          <Textarea
            placeholder={t("scriptSnippetPlaceholder")}
            rows={4}
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
        </Card>
      )}

      {tab === "adsense" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("adsenseTitle")}</h3>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("globalScriptLabel")}
            <Switch
              checked={settings.adsenseGlobalScriptEnabled !== false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseGlobalScriptEnabled: v }))}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("consentModeLabel")}
            <Switch
              checked={settings.consentModeEnabled !== false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, consentModeEnabled: v }))}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("enableAdSlots")}
            <Switch
              checked={settings.adsenseEnabled ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseEnabled: v }))}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("autoAds")}
            <Switch
              checked={settings.adsenseAutoAds ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, adsenseAutoAds: v }))}
            />
          </label>
          <Input
            placeholder={t("publisherIdPlaceholder")}
            value={settings.adsenseClientId ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, adsenseClientId: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {PLACEMENT_PAGES.map((p) => (
              <Input
                key={p.key}
                placeholder={t("slotIdPlaceholder", { page: t(p.labelKey) })}
                value={settings.adsenseSlotIds?.[p.key] ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    adsenseSlotIds: { ...(s.adsenseSlotIds ?? {}), [p.key]: e.target.value },
                  }))
                }
              />
            ))}
          </div>
          <Button disabled={pending} onClick={save}>
            {t("saveAdsenseSettings")}
          </Button>
        </Card>
      )}

      {tab === "microsoft" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("microsoftTitle")}</h3>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("enableMicrosoftAds")}
            <Switch
              checked={settings.microsoftEnabled ?? false}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, microsoftEnabled: v }))}
            />
          </label>
          <Input
            placeholder={t("accountIdPlaceholder")}
            value={settings.microsoftAccountId ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, microsoftAccountId: e.target.value }))}
          />
          <Input
            placeholder={t("uetTrackingPlaceholder")}
            value={settings.microsoftTrackingId ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, microsoftTrackingId: e.target.value }))}
          />
          <Input
            placeholder={t("conversionIdPlaceholder")}
            value={settings.microsoftConversionId ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, microsoftConversionId: e.target.value }))}
          />
          {tab === "microsoft" && (
            <Button disabled={pending} onClick={save}>
              {t("saveMicrosoftSettings")}
            </Button>
          )}
        </Card>
      )}

      {tab === "placements" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("multiNetworkTitle")}</h3>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("enableAdsGlobally")}
            <Switch
              checked={settings.globalAdsEnabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, globalAdsEnabled: v }))}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            {t("popupAds")}
            <Switch
              checked={settings.popupAdsEnabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, popupAdsEnabled: v }))}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {t("providerPriority", { list: (settings.adProviderPriority ?? ["ADSENSE", "MICROSOFT"]).join(" → ") })}
          </p>
          <Button disabled={pending} onClick={save}>
            {t("saveAllSettings")}
          </Button>
        </Card>
      )}

      {tab === "roles" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("roleControlTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("roleLevelsHint")}</p>
          <div className="space-y-3">
            {ROLE_LEVELS.map((role) => (
              <div key={role} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-28 font-medium">{role}</span>
                {(["full", "reduced", "none"] as const).map((level) => (
                  <label key={level} className="flex items-center gap-1">
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
              </div>
            ))}
          </div>
          <Button disabled={pending} onClick={save}>
            {t("saveRoleSettings")}
          </Button>
        </Card>
      )}

      {(tab === "placements") && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("placementControlsTitle")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLACEMENT_PAGES.map((p) => (
              <label key={p.key} className="flex items-center justify-between gap-4 text-sm rounded-lg border border-border/40 p-3">
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
          {tab === "placements" && (
            <Button disabled={pending} onClick={save}>
              {t("savePlacementToggles")}
            </Button>
          )}
        </Card>
      )}

      {(tab === "placements") && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("adSlotInventoryTitle")}</h3>
          <div className="space-y-2">
            {data.placements.map((ad) => (
              <div key={ad.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 p-3 text-sm">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium">{ad.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ad.location} · {ad.format} · {ad.provider}
                  </p>
                </div>
                <Badge variant="outline">{t("viewsCount", { count: ad.impressions })}</Badge>
                <Badge variant="outline">{t("clicksCount", { count: ad.clicks })}</Badge>
                <Switch
                  checked={ad.isEnabled}
                  onCheckedChange={(v) =>
                    startTransition(async () => {
                      await toggleAdPlacement(ad.id, v);
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
