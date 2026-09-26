"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { SafeImage } from "@/components/ui/safe-image";
import { Logo } from "@/components/brand/logo";
import {
  saveAdminBranding,
  saveAdminHeaderSettings,
  saveAdminFooterSettings,
  saveAdminSeoSettings,
  saveAdminPageContent,
  removeBrandingAsset,
} from "@/actions/admin/branding";
import { saveAdminHeadScripts } from "@/actions/admin/ads";
import type { HeadScriptsSettings } from "@/lib/head-scripts";
import { uploadViaApi } from "@/lib/upload-client";
import { formatUploadErrorMessage } from "@/lib/upload-errors";
import {
  ICON_LIBRARY,
  PAGE_CONTENT_FIELDS,
  SUPPORTED_LOCALES,
  type BrandingAssetSettings,
  type HeaderSettings,
  type FooterSettings,
  type SeoSettings,
  type PageContentStore,
  type PageId,
} from "@/lib/branding-cms";
import { localeLabels, type Locale } from "@/i18n/config";

type Tab = "identity" | "assets" | "header" | "footer" | "content" | "seo" | "headScripts" | "preview";

type Props = {
  initial: {
    branding: BrandingAssetSettings;
    header: HeaderSettings;
    footer: FooterSettings;
    seo: SeoSettings;
    pageContent: PageContentStore;
    headScripts: HeadScriptsSettings;
  };
};

const TAB_IDS: Tab[] = ["identity", "assets", "header", "footer", "content", "seo", "headScripts", "preview"];

export function BrandingCenterPanel({ initial }: Props) {
  const t = useTranslations("admin.ui.brandingCenter");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("identity");
  const [branding, setBranding] = useState(initial.branding);
  const [header, setHeader] = useState(initial.header);
  const [footer, setFooter] = useState(initial.footer);
  const [seo, setSeo] = useState(initial.seo);
  const [pageContent, setPageContent] = useState(initial.pageContent);
  const [headScripts, setHeadScripts] = useState(initial.headScripts);
  const [contentPage, setContentPage] = useState<PageId>("homepage");
  const [contentLocale, setContentLocale] = useState<Locale>("en");
  const [seoLocale, setSeoLocale] = useState<Locale | "global">("global");

  const previewBundle = useMemo(
    () => ({ branding, header, footer }),
    [branding, header, footer]
  );

  function upload(type: string, file: File) {
    startTransition(async () => {
      try {
        const result = await uploadViaApi({
          file,
          purpose: "branding-asset",
          brandingAssetType: type,
        });
        const fieldMap: Partial<Record<string, keyof BrandingAssetSettings>> = {
          logo: "logoUrl",
          "logo-dark": "logoDarkUrl",
          favicon: "faviconUrl",
          loading: "loadingLogoUrl",
          mobile: "mobileIconUrl",
          symbol: "siteSymbolUrl",
        };
        const field = fieldMap[type];
        if (field) {
          setBranding((b) => ({
            ...b,
            [field]: result.url,
            ...(type === "favicon"
              ? {
                  appleTouchIconUrl: result.url,
                  androidIconUrl: result.url,
                  pwaIconUrl: result.url,
                }
              : {}),
          }));
        }
        appToast.uploaded();
        router.refresh();
      } catch (err) {
        appToast.error(formatUploadErrorMessage(err));
      }
    });
  }

  function removeAsset(field: keyof BrandingAssetSettings) {
    startTransition(async () => {
      const r = await removeBrandingAsset(field);
      if (r.success) {
        setBranding((b) => ({
          ...b,
          [field]: null,
          ...(field === "faviconUrl"
            ? { appleTouchIconUrl: null, androidIconUrl: null, pwaIconUrl: null }
            : {}),
        }));
        appToast.saved();
      } else appToast.error(r.error);
    });
  }

  function setPageField(field: string, value: string) {
    setPageContent((prev) => ({
      ...prev,
      [contentPage]: {
        ...prev[contentPage],
        [contentLocale]: {
          ...(prev[contentPage]?.[contentLocale] ?? {}),
          [field]: value,
        },
      },
    }));
  }

  const seoFields = seoLocale === "global" ? seo.global : { ...seo.global, ...seo.locales[seoLocale] };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TAB_IDS.map((id) => (
          <Button key={id} size="sm" variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
            {t(`tabs.${id}`)}
          </Button>
        ))}
      </div>

      {tab === "identity" && (
        <Card className="p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold">{t("identity.heading")}</h3>
          <label className="text-sm">{t("identity.websiteName")}</label>
          <Input value={branding.siteTitle} onChange={(e) => setBranding((b) => ({ ...b, siteTitle: e.target.value }))} />
          <label className="text-sm">{t("identity.shortName")}</label>
          <Input value={branding.siteShortName} onChange={(e) => setBranding((b) => ({ ...b, siteShortName: e.target.value }))} />
          <label className="text-sm">{t("identity.browserTitle")}</label>
          <Input value={branding.browserTitle} onChange={(e) => setBranding((b) => ({ ...b, browserTitle: e.target.value }))} />
          <label className="text-sm">{t("identity.tagline")}</label>
          <Input value={branding.siteTagline} onChange={(e) => setBranding((b) => ({ ...b, siteTagline: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">{t("identity.primaryColor")}</label>
              <Input type="color" value={branding.primaryColor} onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm">{t("identity.accentColor")}</label>
              <Input type="color" value={branding.accentColor} onChange={(e) => setBranding((b) => ({ ...b, accentColor: e.target.value }))} />
            </div>
          </div>
          <Button

            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminBranding(branding);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("identity.save")}
          </Button>
        </Card>
      )}

      {tab === "assets" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">{t("assets.logoManager")}</h3>
            <AssetRow label={t("assets.mainLogo")} url={branding.logoUrl} onUpload={(f) => upload("logo", f)} onRemove={() => removeAsset("logoUrl")} removeLabel={t("assets.remove")} />
            <AssetRow label={t("assets.darkLogo")} url={branding.logoDarkUrl} onUpload={(f) => upload("logo-dark", f)} onRemove={() => removeAsset("logoDarkUrl")} removeLabel={t("assets.remove")} />
            <label className="text-sm">{t("assets.logoCropFocus")}</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              value={branding.logoObjectPosition}
              onChange={(e) => setBranding((b) => ({ ...b, logoObjectPosition: e.target.value }))}
            >
              {(["center", "top", "bottom", "left", "right"] as const).map((v) => (
                <option key={v} value={v}>{t(`assets.position.${v}`)}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t("assets.logoFormatsHint")}</p>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">{t("assets.faviconHeading")}</h3>
            <AssetRow label={t("assets.favicon")} url={branding.faviconUrl} onUpload={(f) => upload("favicon", f)} onRemove={() => removeAsset("faviconUrl")} removeLabel={t("assets.remove")} />
            <p className="text-xs text-muted-foreground">
              {t("assets.faviconHint")}
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <IconPreview label={t("assets.apple")} url={branding.appleTouchIconUrl} />
              <IconPreview label={t("assets.android")} url={branding.androidIconUrl} />
              <IconPreview label={t("assets.pwa")} url={branding.pwaIconUrl} />
            </div>
          </Card>

          <Card className="p-6 space-y-4 lg:col-span-2">
            <h3 className="font-semibold">{t("assets.symbolHeading")}</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Logo branding={branding} />
              <Badge variant="outline">{t("assets.livePreview")}</Badge>
            </div>
            <label className="text-sm">{t("assets.symbolMode")}</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              value={branding.siteSymbolMode}
              onChange={(e) => setBranding((b) => ({ ...b, siteSymbolMode: e.target.value as BrandingAssetSettings["siteSymbolMode"] }))}
            >
              <option value="letter">{t("assets.symbolModeLetter")}</option>
              <option value="library">{t("assets.symbolModeLibrary")}</option>
              <option value="image">{t("assets.symbolModeImage")}</option>
            </select>
            {branding.siteSymbolMode === "letter" && (
              <>
                <Input maxLength={2} value={branding.siteSymbolLetter} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolLetter: e.target.value }))} />
                <Input type="color" value={branding.siteSymbolColor} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolColor: e.target.value }))} />
              </>
            )}
            {branding.siteSymbolMode === "library" && (
              <>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                  value={branding.siteSymbolLibrary ?? "sparkles"}
                  onChange={(e) => setBranding((b) => ({ ...b, siteSymbolLibrary: e.target.value }))}
                >
                  {ICON_LIBRARY.map((icon) => (
                    <option key={icon.id} value={icon.id}>{icon.label}</option>
                  ))}
                </select>
                <Input type="color" value={branding.siteSymbolColor} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolColor: e.target.value }))} />
              </>
            )}
            {branding.siteSymbolMode === "image" && (
              <AssetRow label={t("assets.symbolImage")} url={branding.siteSymbolUrl} onUpload={(f) => upload("symbol", f)} onRemove={() => removeAsset("siteSymbolUrl")} removeLabel={t("assets.remove")} />
            )}
            <Button

              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await saveAdminBranding(branding);
                  if (r.success) appToast.saved();
                  else appToast.error(r.error);
                })
              }
            >
              {t("assets.saveSymbols")}
            </Button>
          </Card>
        </div>
      )}

      {tab === "header" && (
        <Card className="p-6 space-y-4 max-w-3xl">
          <h3 className="font-semibold">{t("header.heading")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={header.sticky} onChange={(e) => setHeader((h) => ({ ...h, sticky: e.target.checked }))} />
              {t("header.sticky")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={header.blur} onChange={(e) => setHeader((h) => ({ ...h, blur: e.target.checked }))} />
              {t("header.blur")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={header.transparent} onChange={(e) => setHeader((h) => ({ ...h, transparent: e.target.checked }))} />
              {t("header.transparent")}
            </label>
            <div>
              <label className="text-sm">{t("header.heightPx")}</label>
              <Input type="number" value={header.height} onChange={(e) => setHeader((h) => ({ ...h, height: Number(e.target.value) }))} />
            </div>
          </div>
          <Input placeholder={t("header.backgroundColorPlaceholder")} value={header.backgroundColor} onChange={(e) => setHeader((h) => ({ ...h, backgroundColor: e.target.value }))} />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("header.menuItems")}</p>
            {header.menuItems.map((item, idx) => (
              <div key={item.id} className="grid sm:grid-cols-4 gap-2 items-center border border-border/30 rounded-md p-2">
                <Input value={item.label} onChange={(e) => {
                  const items = [...header.menuItems];
                  items[idx] = { ...item, label: e.target.value };
                  setHeader((h) => ({ ...h, menuItems: items }));
                }} />
                <Input value={item.href} onChange={(e) => {
                  const items = [...header.menuItems];
                  items[idx] = { ...item, href: e.target.value };
                  setHeader((h) => ({ ...h, menuItems: items }));
                }} />
                <Input type="number" value={item.order} onChange={(e) => {
                  const items = [...header.menuItems];
                  items[idx] = { ...item, order: Number(e.target.value) };
                  setHeader((h) => ({ ...h, menuItems: items }));
                }} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={item.hidden} onChange={(e) => {
                    const items = [...header.menuItems];
                    items[idx] = { ...item, hidden: e.target.checked };
                    setHeader((h) => ({ ...h, menuItems: items }));
                  }} />
                  {t("header.hidden")}
                </label>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setHeader((h) => ({
                  ...h,
                  menuItems: [
                    ...h.menuItems,
                    { id: `custom-${Date.now()}`, label: t("header.newLinkLabel"), href: "/", hidden: false, order: h.menuItems.length },
                  ],
                }))
              }
            >
              {t("header.addMenuItem")}
            </Button>
          </div>
          <Button

            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminHeaderSettings(header);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("header.save")}
          </Button>
        </Card>
      )}

      {tab === "footer" && (
        <Card className="p-6 space-y-4 max-w-3xl">
          <h3 className="font-semibold">{t("footer.heading")}</h3>
          <Textarea value={footer.tagline} onChange={(e) => setFooter((f) => ({ ...f, tagline: e.target.value }))} placeholder={t("footer.tagline")} rows={2} />
          <Input value={footer.copyright} onChange={(e) => setFooter((f) => ({ ...f, copyright: e.target.value }))} placeholder={t("footer.copyrightSuffix")} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder={t("footer.discordUrl")} value={footer.socialLinks.discord ?? ""} onChange={(e) => setFooter((f) => ({ ...f, socialLinks: { ...f.socialLinks, discord: e.target.value } }))} />
            <Input placeholder={t("footer.twitterUrl")} value={footer.socialLinks.twitter ?? ""} onChange={(e) => setFooter((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
          </div>
          {footer.sections.map((section, sIdx) => (
            <div key={section.id} className="border border-border/30 rounded-lg p-3 space-y-2">
              <Input value={section.title} onChange={(e) => {
                const sections = [...footer.sections];
                sections[sIdx] = { ...section, title: e.target.value };
                setFooter((f) => ({ ...f, sections }));
              }} />
              {section.links.map((link, lIdx) => (
                <div key={link.id} className="grid sm:grid-cols-3 gap-2">
                  <Input value={link.label} onChange={(e) => {
                    const sections = [...footer.sections];
                    const links = [...section.links];
                    links[lIdx] = { ...link, label: e.target.value };
                    sections[sIdx] = { ...section, links };
                    setFooter((f) => ({ ...f, sections }));
                  }} />
                  <Input value={link.href} onChange={(e) => {
                    const sections = [...footer.sections];
                    const links = [...section.links];
                    links[lIdx] = { ...link, href: e.target.value };
                    sections[sIdx] = { ...section, links };
                    setFooter((f) => ({ ...f, sections }));
                  }} />
                  <Input type="number" value={link.order} onChange={(e) => {
                    const sections = [...footer.sections];
                    const links = [...section.links];
                    links[lIdx] = { ...link, order: Number(e.target.value) };
                    sections[sIdx] = { ...section, links };
                    setFooter((f) => ({ ...f, sections }));
                  }} />
                </div>
              ))}
            </div>
          ))}
          <Button
           
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminFooterSettings(footer);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("footer.save")}
          </Button>
        </Card>
      )}

      {tab === "content" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{t("content.heading")}</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PAGE_CONTENT_FIELDS) as PageId[]).map((page) => (
              <Button key={page} size="sm" variant={contentPage === page ? "default" : "outline"} onClick={() => setContentPage(page)}>
                {page}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LOCALES.map((loc) => (
              <Button key={loc} size="sm" variant={contentLocale === loc ? "default" : "outline"} onClick={() => setContentLocale(loc)}>
                {localeLabels[loc]}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 max-w-2xl">
            {PAGE_CONTENT_FIELDS[contentPage].map((field) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground">{field}</label>
                <Textarea
                  rows={field.includes("Title") || field.includes("Badge") ? 1 : 2}
                  value={pageContent[contentPage]?.[contentLocale]?.[field] ?? ""}
                  onChange={(e) => setPageField(field, e.target.value)}
                  placeholder={t("content.overridePlaceholder", { field, locale: contentLocale })}
                />
              </div>
            ))}
          </div>
          <Button
           
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminPageContent(pageContent);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("content.save")}
          </Button>
        </Card>
      )}

      {tab === "seo" && (
        <Card className="p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold">{t("seo.heading")}</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={seoLocale === "global" ? "default" : "outline"} onClick={() => setSeoLocale("global")}>{t("seo.global")}</Button>
            {SUPPORTED_LOCALES.map((loc) => (
              <Button key={loc} size="sm" variant={seoLocale === loc ? "default" : "outline"} onClick={() => setSeoLocale(loc)}>
                {localeLabels[loc]}
              </Button>
            ))}
          </div>
          {(["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const).map((field) => (
            <div key={field}>
              <label className="text-xs text-muted-foreground">{field}</label>
              {field.includes("Description") ? (
                <Textarea
                  rows={2}
                  value={seoFields[field] ?? ""}
                  onChange={(e) => {
                    if (seoLocale === "global") {
                      setSeo((s) => ({ ...s, global: { ...s.global, [field]: e.target.value } }));
                    } else {
                      setSeo((s) => ({
                        ...s,
                        locales: {
                          ...s.locales,
                          [seoLocale]: { ...s.locales[seoLocale], [field]: e.target.value },
                        },
                      }));
                    }
                  }}
                />
              ) : (
                <Input
                  value={seoFields[field] ?? ""}
                  onChange={(e) => {
                    if (seoLocale === "global") {
                      setSeo((s) => ({ ...s, global: { ...s.global, [field]: e.target.value } }));
                    } else {
                      setSeo((s) => ({
                        ...s,
                        locales: {
                          ...s.locales,
                          [seoLocale]: { ...s.locales[seoLocale], [field]: e.target.value },
                        },
                      }));
                    }
                  }}
                />
              )}
            </div>
          ))}
          <label className="text-sm">{t("seo.twitterCard")}</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
            value={seoFields.twitterCard}
            onChange={(e) => {
              const val = e.target.value as "summary" | "summary_large_image";
              if (seoLocale === "global") {
                setSeo((s) => ({ ...s, global: { ...s.global, twitterCard: val } }));
              } else {
                setSeo((s) => ({
                  ...s,
                  locales: { ...s.locales, [seoLocale]: { ...s.locales[seoLocale], twitterCard: val } },
                }));
              }
            }}
          >
            <option value="summary">{t("seo.twitterCardSummary")}</option>
            <option value="summary_large_image">{t("seo.twitterCardSummaryLargeImage")}</option>
          </select>
          <AssetRow
            label={t("seo.ogImage")}
            removeLabel={t("assets.remove")}
            url={seoFields.ogImageUrl}
            onUpload={async (f) => {
              try {
                const result = await uploadViaApi({
                  file: f,
                  purpose: "branding-asset",
                  brandingAssetType: "og",
                });
                const url = result.url;
                if (seoLocale === "global") {
                  setSeo((s) => ({ ...s, global: { ...s.global, ogImageUrl: url } }));
                } else {
                  setSeo((s) => ({
                    ...s,
                    locales: { ...s.locales, [seoLocale]: { ...s.locales[seoLocale], ogImageUrl: url } },
                  }));
                }
              } catch (err) {
                appToast.error(formatUploadErrorMessage(err));
              }
            }}
            onRemove={() => {
              if (seoLocale === "global") {
                setSeo((s) => ({ ...s, global: { ...s.global, ogImageUrl: null } }));
              } else {
                setSeo((s) => ({
                  ...s,
                  locales: { ...s.locales, [seoLocale]: { ...s.locales[seoLocale], ogImageUrl: null } },
                }));
              }
            }}
          />
          <Button
           
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminSeoSettings(seo);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("seo.save")}
          </Button>
        </Card>
      )}

      {tab === "headScripts" && (
        <Card className="p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold">{t("headScripts.heading")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("headScripts.hint")}
          </p>
          <div className="space-y-3">
            <label className="text-sm font-medium">{t("headScripts.customMetaTag")}</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder={t("headScripts.metaNamePlaceholder")}
                value={headScripts.metaTags[0]?.name ?? ""}
                onChange={(e) =>
                  setHeadScripts((h) => ({
                    ...h,
                    metaTags: [
                      {
                        id: "custom-meta",
                        name: e.target.value,
                        content: h.metaTags[0]?.content ?? "",
                      },
                    ],
                  }))
                }
              />
              <Input
                placeholder={t("headScripts.metaContentPlaceholder")}
                value={headScripts.metaTags[0]?.content ?? ""}
                onChange={(e) =>
                  setHeadScripts((h) => ({
                    ...h,
                    metaTags: [
                      {
                        id: "custom-meta",
                        name: h.metaTags[0]?.name ?? "",
                        content: e.target.value,
                      },
                    ],
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("headScripts.bodyScriptSnippet")}</label>
            <Textarea
              className="mt-1 font-mono text-xs"
              rows={6}
              placeholder={t("headScripts.bodyScriptPlaceholder")}
              value={headScripts.scriptSnippets[0]?.html ?? ""}
              onChange={(e) =>
                setHeadScripts((h) => ({
                  ...h,
                  scriptSnippets: [
                    {
                      id: "body-custom",
                      label: "Custom body script",
                      html: e.target.value,
                      enabled: Boolean(e.target.value.trim()),
                      placement: "body",
                    },
                  ],
                }))
              }
            />
          </div>
          <Button
           
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveAdminHeadScripts(headScripts);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("headScripts.save")}
          </Button>
        </Card>
      )}

      {tab === "preview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">{t("preview.headerPreview")}</h3>
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <div
                className={`flex items-center justify-between px-4 ${previewBundle.header.blur ? " bg-background/80" : "bg-background"}`}
                style={{ height: previewBundle.header.height }}
              >
                <Logo size="sm" branding={previewBundle.branding} />
                <span className="text-xs text-muted-foreground">{t("preview.navItemsAuth")}</span>
              </div>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">{t("preview.footerPreview")}</h3>
            <div className="rounded-lg border border-border/40 p-4 text-sm space-y-2">
              <Logo branding={previewBundle.branding} />
              <p className="text-muted-foreground">{previewBundle.footer.tagline}</p>
              <p className="text-xs text-muted-foreground">© {previewBundle.branding.siteTitle}. {previewBundle.footer.copyright}</p>
            </div>
          </Card>
          <Card className="p-6 space-y-2 lg:col-span-2">
            <h3 className="font-semibold">{t("preview.homepageHeroPreview")}</h3>
            <p className="text-xs text-violet-bright">{pageContent.homepage?.[contentLocale]?.heroBadge ?? t("preview.badgeFallback")}</p>
            <h4 className="text-2xl font-bold">{pageContent.homepage?.[contentLocale]?.heroTitle ?? previewBundle.branding.siteTitle}</h4>
            <p className="text-muted-foreground">{pageContent.homepage?.[contentLocale]?.heroSubtitle ?? previewBundle.branding.siteTagline}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function AssetRow({
  label,
  url,
  onUpload,
  onRemove,
  removeLabel,
}: {
  label: string;
  url: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border/40 bg-muted/20">
        <SafeImage src={url} alt="" fill className="object-contain" sizes="48px" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <Input type="file" accept="image/*,.svg" className="text-xs" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }} />
        {url && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={onRemove}>
            {removeLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function IconPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto h-10 w-10 rounded border border-border/40 overflow-hidden">
        <SafeImage src={url} alt="" fill className="object-contain" sizes="40px" />
      </div>
      <p className="mt-1">{label}</p>
    </div>
  );
}
