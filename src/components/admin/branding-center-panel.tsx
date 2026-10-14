"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
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
} from "@/lib/branding-cms-shared";
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
const selectClass = cn(controlClassName, "h-9");

function Field({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label-text mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export function BrandingCenterPanel({ initial }: Props) {
  const t = useTranslations("admin.ui.brandingCenter");
  const tp = useTranslations("admin.brandingPage");
  const uid = useId();
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
      <ChipTabs
        label={tp("tabsLabel")}
        value={tab}
        options={TAB_IDS.map((id) => ({ value: id, label: t(`tabs.${id}`) }))}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === "identity" && (
        <SectionCard title={t("identity.heading")} className="max-w-2xl">
          <div className="space-y-4">
            <Field id={`${uid}-site-title`} label={t("identity.websiteName")}>
              <Input id={`${uid}-site-title`} value={branding.siteTitle} onChange={(e) => setBranding((b) => ({ ...b, siteTitle: e.target.value }))} />
            </Field>
            <Field id={`${uid}-short-name`} label={t("identity.shortName")}>
              <Input id={`${uid}-short-name`} value={branding.siteShortName} onChange={(e) => setBranding((b) => ({ ...b, siteShortName: e.target.value }))} />
            </Field>
            <Field id={`${uid}-browser-title`} label={t("identity.browserTitle")}>
              <Input id={`${uid}-browser-title`} value={branding.browserTitle} onChange={(e) => setBranding((b) => ({ ...b, browserTitle: e.target.value }))} />
            </Field>
            <Field id={`${uid}-tagline`} label={t("identity.tagline")}>
              <Input id={`${uid}-tagline`} value={branding.siteTagline} onChange={(e) => setBranding((b) => ({ ...b, siteTagline: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field id={`${uid}-primary`} label={t("identity.primaryColor")}>
                <Input id={`${uid}-primary`} type="color" value={branding.primaryColor} onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))} />
              </Field>
              <Field id={`${uid}-accent`} label={t("identity.accentColor")}>
                <Input id={`${uid}-accent`} type="color" value={branding.accentColor} onChange={(e) => setBranding((b) => ({ ...b, accentColor: e.target.value }))} />
              </Field>
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
          </div>
        </SectionCard>
      )}

      {tab === "assets" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={t("assets.logoManager")}>
            <div className="space-y-4">
              <AssetRow label={t("assets.mainLogo")} url={branding.logoUrl} onUpload={(f) => upload("logo", f)} onRemove={() => removeAsset("logoUrl")} removeLabel={t("assets.remove")} />
              <AssetRow label={t("assets.darkLogo")} url={branding.logoDarkUrl} onUpload={(f) => upload("logo-dark", f)} onRemove={() => removeAsset("logoDarkUrl")} removeLabel={t("assets.remove")} />
              <Field id={`${uid}-logo-pos`} label={t("assets.logoCropFocus")}>
                <select
                  id={`${uid}-logo-pos`}
                  className={selectClass}
                  value={branding.logoObjectPosition}
                  onChange={(e) => setBranding((b) => ({ ...b, logoObjectPosition: e.target.value }))}
                >
                  {(["center", "top", "bottom", "left", "right"] as const).map((v) => (
                    <option key={v} value={v}>{t(`assets.position.${v}`)}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-ink-faint">{t("assets.logoFormatsHint")}</p>
            </div>
          </SectionCard>

          <SectionCard title={t("assets.faviconHeading")}>
            <div className="space-y-4">
              <AssetRow label={t("assets.favicon")} url={branding.faviconUrl} onUpload={(f) => upload("favicon", f)} onRemove={() => removeAsset("faviconUrl")} removeLabel={t("assets.remove")} />
              <p className="text-xs text-ink-faint">{t("assets.faviconHint")}</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-ink-muted">
                <IconPreview label={t("assets.apple")} url={branding.appleTouchIconUrl} />
                <IconPreview label={t("assets.android")} url={branding.androidIconUrl} />
                <IconPreview label={t("assets.pwa")} url={branding.pwaIconUrl} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("assets.symbolHeading")} className="lg:col-span-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Logo branding={branding} />
                <span className="meta">{t("assets.livePreview")}</span>
              </div>
              <Field id={`${uid}-symbol-mode`} label={t("assets.symbolMode")}>
                <select
                  id={`${uid}-symbol-mode`}
                  className={selectClass}
                  value={branding.siteSymbolMode}
                  onChange={(e) => setBranding((b) => ({ ...b, siteSymbolMode: e.target.value as BrandingAssetSettings["siteSymbolMode"] }))}
                >
                  <option value="letter">{t("assets.symbolModeLetter")}</option>
                  <option value="library">{t("assets.symbolModeLibrary")}</option>
                  <option value="image">{t("assets.symbolModeImage")}</option>
                </select>
              </Field>
              {branding.siteSymbolMode === "letter" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${uid}-symbol-letter`} label={tp("symbolLetter")}>
                    <Input id={`${uid}-symbol-letter`} maxLength={2} value={branding.siteSymbolLetter} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolLetter: e.target.value }))} />
                  </Field>
                  <Field id={`${uid}-symbol-color`} label={tp("symbolColor")}>
                    <Input id={`${uid}-symbol-color`} type="color" value={branding.siteSymbolColor} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolColor: e.target.value }))} />
                  </Field>
                </div>
              )}
              {branding.siteSymbolMode === "library" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${uid}-symbol-icon`} label={tp("symbolIcon")}>
                    <select
                      id={`${uid}-symbol-icon`}
                      className={selectClass}
                      value={branding.siteSymbolLibrary ?? "sparkles"}
                      onChange={(e) => setBranding((b) => ({ ...b, siteSymbolLibrary: e.target.value }))}
                    >
                      {ICON_LIBRARY.map((icon) => (
                        <option key={icon.id} value={icon.id}>{icon.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id={`${uid}-symbol-color-lib`} label={tp("symbolColor")}>
                    <Input id={`${uid}-symbol-color-lib`} type="color" value={branding.siteSymbolColor} onChange={(e) => setBranding((b) => ({ ...b, siteSymbolColor: e.target.value }))} />
                  </Field>
                </div>
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
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "header" && (
        <SectionCard title={t("header.heading")} className="max-w-3xl">
          <div className="space-y-4">
            <div className="grid items-end gap-4 sm:grid-cols-2">
              <Checkbox checked={header.sticky} onCheckedChange={(v) => setHeader((h) => ({ ...h, sticky: v }))} label={t("header.sticky")} />
              <Checkbox checked={header.blur} onCheckedChange={(v) => setHeader((h) => ({ ...h, blur: v }))} label={t("header.blur")} />
              <Checkbox checked={header.transparent} onCheckedChange={(v) => setHeader((h) => ({ ...h, transparent: v }))} label={t("header.transparent")} />
              <Field id={`${uid}-header-height`} label={t("header.heightPx")}>
                <Input id={`${uid}-header-height`} type="number" className="tabular-nums" value={header.height} onChange={(e) => setHeader((h) => ({ ...h, height: Number(e.target.value) }))} />
              </Field>
            </div>
            <Field id={`${uid}-header-bg`} label={t("header.backgroundColorPlaceholder")}>
              <Input id={`${uid}-header-bg`} className="font-mono" value={header.backgroundColor} onChange={(e) => setHeader((h) => ({ ...h, backgroundColor: e.target.value }))} />
            </Field>
            <div className="space-y-2">
              <p className="label-text">{t("header.menuItems")}</p>
              {header.menuItems.map((item, idx) => (
                <div key={item.id} className="grid items-center gap-2 rounded-md border border-line p-2 sm:grid-cols-4">
                  <Input aria-label={tp("menuLabel", { n: idx + 1 })} value={item.label} onChange={(e) => {
                    const items = [...header.menuItems];
                    items[idx] = { ...item, label: e.target.value };
                    setHeader((h) => ({ ...h, menuItems: items }));
                  }} />
                  <Input aria-label={tp("menuHref", { n: idx + 1 })} className="font-mono" value={item.href} onChange={(e) => {
                    const items = [...header.menuItems];
                    items[idx] = { ...item, href: e.target.value };
                    setHeader((h) => ({ ...h, menuItems: items }));
                  }} />
                  <Input aria-label={tp("menuOrder", { n: idx + 1 })} type="number" className="tabular-nums" value={item.order} onChange={(e) => {
                    const items = [...header.menuItems];
                    items[idx] = { ...item, order: Number(e.target.value) };
                    setHeader((h) => ({ ...h, menuItems: items }));
                  }} />
                  <Checkbox
                    checked={item.hidden}
                    onCheckedChange={(v) => {
                      const items = [...header.menuItems];
                      items[idx] = { ...item, hidden: v };
                      setHeader((h) => ({ ...h, menuItems: items }));
                    }}
                    label={t("header.hidden")}
                  />
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
          </div>
        </SectionCard>
      )}

      {tab === "footer" && (
        <SectionCard title={t("footer.heading")} className="max-w-3xl">
          <div className="space-y-4">
            <Field id={`${uid}-footer-tagline`} label={t("footer.tagline")}>
              <Textarea id={`${uid}-footer-tagline`} value={footer.tagline} onChange={(e) => setFooter((f) => ({ ...f, tagline: e.target.value }))} rows={2} />
            </Field>
            <Field id={`${uid}-footer-copy`} label={t("footer.copyrightSuffix")}>
              <Input id={`${uid}-footer-copy`} value={footer.copyright} onChange={(e) => setFooter((f) => ({ ...f, copyright: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${uid}-footer-discord`} label={t("footer.discordUrl")}>
                <Input id={`${uid}-footer-discord`} value={footer.socialLinks.discord ?? ""} onChange={(e) => setFooter((f) => ({ ...f, socialLinks: { ...f.socialLinks, discord: e.target.value } }))} />
              </Field>
              <Field id={`${uid}-footer-twitter`} label={t("footer.twitterUrl")}>
                <Input id={`${uid}-footer-twitter`} value={footer.socialLinks.twitter ?? ""} onChange={(e) => setFooter((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
              </Field>
            </div>
            {footer.sections.map((section, sIdx) => (
              <div key={section.id} className="space-y-2 rounded-lg border border-line p-3">
                <Input aria-label={tp("sectionTitle", { n: sIdx + 1 })} className="font-medium" value={section.title} onChange={(e) => {
                  const sections = [...footer.sections];
                  sections[sIdx] = { ...section, title: e.target.value };
                  setFooter((f) => ({ ...f, sections }));
                }} />
                {section.links.map((link, lIdx) => (
                  <div key={link.id} className="grid gap-2 sm:grid-cols-3">
                    <Input aria-label={tp("linkLabel", { n: lIdx + 1 })} value={link.label} onChange={(e) => {
                      const sections = [...footer.sections];
                      const links = [...section.links];
                      links[lIdx] = { ...link, label: e.target.value };
                      sections[sIdx] = { ...section, links };
                      setFooter((f) => ({ ...f, sections }));
                    }} />
                    <Input aria-label={tp("linkHref", { n: lIdx + 1 })} className="font-mono" value={link.href} onChange={(e) => {
                      const sections = [...footer.sections];
                      const links = [...section.links];
                      links[lIdx] = { ...link, href: e.target.value };
                      sections[sIdx] = { ...section, links };
                      setFooter((f) => ({ ...f, sections }));
                    }} />
                    <Input aria-label={tp("linkOrder", { n: lIdx + 1 })} type="number" className="tabular-nums" value={link.order} onChange={(e) => {
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
          </div>
        </SectionCard>
      )}

      {tab === "content" && (
        <SectionCard title={t("content.heading")}>
          <div className="space-y-4">
            <ChipTabs
              label={tp("contentPage")}
              value={contentPage}
              options={(Object.keys(PAGE_CONTENT_FIELDS) as PageId[]).map((page) => ({ value: page, label: tp(`pages.${page}`) }))}
              onChange={(v) => setContentPage(v as PageId)}
            />
            <ChipTabs
              label={tp("contentLocale")}
              value={contentLocale}
              options={SUPPORTED_LOCALES.map((loc) => ({ value: loc, label: localeLabels[loc] }))}
              onChange={(v) => setContentLocale(v as Locale)}
            />
            <div className="grid max-w-2xl gap-4">
              {PAGE_CONTENT_FIELDS[contentPage].map((field) => (
                <div key={field}>
                  <label htmlFor={`${uid}-content-${field}`} className="mono-id mb-1.5 block">{field}</label>
                  <Textarea
                    id={`${uid}-content-${field}`}
                    rows={field.includes("Title") || field.includes("Badge") ? 1 : 2}
                    className={field.includes("Title") || field.includes("Badge") ? "min-h-0" : undefined}
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
          </div>
        </SectionCard>
      )}

      {tab === "seo" && (
        <SectionCard title={t("seo.heading")} className="max-w-2xl">
          <div className="space-y-4">
            <ChipTabs
              label={tp("seoScope")}
              value={seoLocale}
              options={[
                { value: "global", label: t("seo.global") },
                ...SUPPORTED_LOCALES.map((loc) => ({ value: loc, label: localeLabels[loc] })),
              ]}
              onChange={(v) => setSeoLocale(v as Locale | "global")}
            />
            {(["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const).map((field) => {
              const id = `${uid}-seo-${field}`;
              const onChange = (value: string) => {
                if (seoLocale === "global") {
                  setSeo((s) => ({ ...s, global: { ...s.global, [field]: value } }));
                } else {
                  setSeo((s) => ({
                    ...s,
                    locales: {
                      ...s.locales,
                      [seoLocale]: { ...s.locales[seoLocale], [field]: value },
                    },
                  }));
                }
              };
              return (
                <Field key={field} id={id} label={tp(`seoFields.${field}`)}>
                  {field.includes("Description") ? (
                    <Textarea id={id} rows={2} value={seoFields[field] ?? ""} onChange={(e) => onChange(e.target.value)} />
                  ) : (
                    <Input id={id} value={seoFields[field] ?? ""} onChange={(e) => onChange(e.target.value)} />
                  )}
                </Field>
              );
            })}
            <Field id={`${uid}-twitter-card`} label={t("seo.twitterCard")}>
              <select
                id={`${uid}-twitter-card`}
                className={selectClass}
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
            </Field>
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
          </div>
        </SectionCard>
      )}

      {tab === "headScripts" && (
        <SectionCard title={t("headScripts.heading")} description={t("headScripts.hint")} className="max-w-2xl">
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="label-text mb-1.5">{t("headScripts.customMetaTag")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label={t("headScripts.metaNamePlaceholder")}
                  placeholder={t("headScripts.metaNamePlaceholder")}
                  className="font-mono"
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
                  aria-label={t("headScripts.metaContentPlaceholder")}
                  placeholder={t("headScripts.metaContentPlaceholder")}
                  className="font-mono"
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
            </fieldset>
            <Field id={`${uid}-body-script`} label={t("headScripts.bodyScriptSnippet")}>
              <Textarea
                id={`${uid}-body-script`}
                className="font-mono text-xs"
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
            </Field>
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
          </div>
        </SectionCard>
      )}

      {tab === "preview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={t("preview.headerPreview")}>
            <div className="overflow-hidden rounded-lg border border-line">
              <div
                className={cn("flex items-center justify-between px-4", previewBundle.header.blur ? "bg-canvas/80" : "bg-canvas")}
                style={{ height: previewBundle.header.height }}
              >
                <Logo size="sm" branding={previewBundle.branding} />
                <span className="text-xs text-ink-muted">{t("preview.navItemsAuth")}</span>
              </div>
            </div>
          </SectionCard>
          <SectionCard title={t("preview.footerPreview")}>
            <div className="space-y-2 rounded-lg border border-line p-4 text-sm">
              <Logo branding={previewBundle.branding} />
              <p className="text-ink-muted">{previewBundle.footer.tagline}</p>
              <p className="text-xs text-ink-faint">© {previewBundle.branding.siteTitle}. {previewBundle.footer.copyright}</p>
            </div>
          </SectionCard>
          <SectionCard title={t("preview.homepageHeroPreview")} className="lg:col-span-2">
            <div className="space-y-2">
              <p className="text-xs text-violet-bright">{pageContent.homepage?.[contentLocale]?.heroBadge ?? t("preview.badgeFallback")}</p>
              <p className="text-2xl font-bold text-ink">{pageContent.homepage?.[contentLocale]?.heroTitle ?? previewBundle.branding.siteTitle}</p>
              <p className="text-ink-muted">{pageContent.homepage?.[contentLocale]?.heroSubtitle ?? previewBundle.branding.siteTagline}</p>
            </div>
          </SectionCard>
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
  const id = useId();
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-elevated">
        <SafeImage src={url} alt="" fill className="object-contain" sizes="48px" />
      </div>
      <div className="flex-1 space-y-1">
        <label htmlFor={id} className="label-text block">{label}</label>
        <Input id={id} type="file" accept="image/*,.svg" className="text-xs" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }} />
        {url && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-danger" onClick={onRemove}>
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
      <div className="relative mx-auto h-10 w-10 overflow-hidden rounded-md border border-line">
        <SafeImage src={url} alt="" fill className="object-contain" sizes="40px" />
      </div>
      <p className="mt-1">{label}</p>
    </div>
  );
}
