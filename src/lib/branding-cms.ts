import { getSiteSetting, setSiteSettingSafe } from "@/lib/site-settings";
import type { Locale } from "@/i18n/config";
import {
  CMS_KEYS,
  DEFAULT_BRANDING_ASSETS,
  DEFAULT_SEO,
  type BrandingAssetSettings,
  type PageContentStore,
  type PageId,
  type SeoLocaleSettings,
  type SeoSettings,
} from "@/lib/branding-cms-shared";
import type { FooterSettings, HeaderSettings } from "@/lib/branding-defaults";
import { DEFAULT_FOOTER, DEFAULT_HEADER } from "@/lib/branding-defaults";

export * from "@/lib/branding-cms-shared";

async function readLegacyBranding(): Promise<Partial<BrandingAssetSettings>> {
  const legacy = await getSiteSetting<Partial<BrandingAssetSettings>>("branding", {});
  return legacy;
}

export async function getBrandingAssetSettings(): Promise<BrandingAssetSettings> {
  const [stored, legacy] = await Promise.all([
    getSiteSetting<Partial<BrandingAssetSettings>>(CMS_KEYS.branding, {}),
    readLegacyBranding(),
  ]);
  return { ...DEFAULT_BRANDING_ASSETS, ...legacy, ...stored };
}

export async function saveBrandingAssetSettings(settings: BrandingAssetSettings) {
  const saved = await setSiteSettingSafe(CMS_KEYS.branding, settings);
  if (!saved.ok) throw new Error(saved.error);
  await setSiteSettingSafe("branding", settings);
}

export async function getHeaderSettings() {
  return getSiteSetting<HeaderSettings>(CMS_KEYS.header, DEFAULT_HEADER);
}

export async function saveHeaderSettings(settings: HeaderSettings) {
  const saved = await setSiteSettingSafe(CMS_KEYS.header, settings);
  if (!saved.ok) throw new Error(saved.error);
}

export async function getFooterSettings() {
  return getSiteSetting<FooterSettings>(CMS_KEYS.footer, DEFAULT_FOOTER);
}

export async function saveFooterSettings(settings: FooterSettings) {
  const saved = await setSiteSettingSafe(CMS_KEYS.footer, settings);
  if (!saved.ok) throw new Error(saved.error);
}

export async function getSeoSettings() {
  return getSiteSetting<SeoSettings>(CMS_KEYS.seo, DEFAULT_SEO);
}

export async function saveSeoSettings(settings: SeoSettings) {
  const saved = await setSiteSettingSafe(CMS_KEYS.seo, settings);
  if (!saved.ok) throw new Error(saved.error);
}

export async function getPageContentStore() {
  return getSiteSetting<PageContentStore>(CMS_KEYS.pageContent, {});
}

export async function savePageContentStore(store: PageContentStore) {
  const saved = await setSiteSettingSafe(CMS_KEYS.pageContent, store);
  if (!saved.ok) throw new Error(saved.error);
}

export function resolvePageContent(
  store: PageContentStore,
  page: PageId,
  locale: Locale,
  field: string,
  fallback: string
): string {
  const pageData = store[page];
  if (!pageData) return fallback;
  const localized = pageData[locale]?.[field];
  if (localized?.trim()) return localized;
  const en = pageData.en?.[field];
  if (en?.trim()) return en;
  return fallback;
}

export function resolveSeoForLocale(settings: SeoSettings, locale: Locale): SeoLocaleSettings {
  const override = settings.locales[locale] ?? {};
  return { ...settings.global, ...override };
}

export type PublicBrandingBundle = {
  branding: BrandingAssetSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  seo: SeoSettings;
  pageContent: PageContentStore;
};

export async function loadPublicBrandingBundle(): Promise<PublicBrandingBundle> {
  const [branding, header, footer, seo, pageContent] = await Promise.all([
    getBrandingAssetSettings(),
    getHeaderSettings(),
    getFooterSettings(),
    getSeoSettings(),
    getPageContentStore(),
  ]);
  return { branding, header, footer, seo, pageContent };
}

export function syncIconVariantsFromFavicon(
  branding: BrandingAssetSettings,
  faviconUrl: string
): BrandingAssetSettings {
  return {
    ...branding,
    faviconUrl,
    appleTouchIconUrl: faviconUrl,
    androidIconUrl: faviconUrl,
    pwaIconUrl: faviconUrl,
    mobileIconUrl: faviconUrl,
  };
}

