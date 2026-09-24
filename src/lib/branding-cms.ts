import { colors } from "@/styles/tokens";
import { getSiteSetting, setSiteSettingSafe } from "@/lib/site-settings";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_HEADER_MENU,
  type FooterLink,
  type FooterSection,
  type FooterSettings,
  type HeaderMenuItem,
  type HeaderSettings,
} from "@/lib/branding-defaults";

export { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_HEADER_MENU };
export type { FooterLink, FooterSection, FooterSettings, HeaderMenuItem, HeaderSettings };

/** SiteSetting keys — logical tables for branding CMS */
export const CMS_KEYS = {
  branding: "branding_settings",
  header: "header_settings",
  footer: "footer_settings",
  seo: "seo_settings",
  pageContent: "page_content",
} as const;

export type SiteSymbolMode = "letter" | "image" | "library";

export type BrandingAssetSettings = {
  siteTitle: string;
  siteShortName: string;
  browserTitle: string;
  siteTagline: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  appleTouchIconUrl: string | null;
  androidIconUrl: string | null;
  pwaIconUrl: string | null;
  loadingLogoUrl: string | null;
  mobileIconUrl: string | null;
  siteSymbolMode: SiteSymbolMode;
  siteSymbolLetter: string;
  siteSymbolUrl: string | null;
  siteSymbolLibrary: string | null;
  siteSymbolColor: string;
  logoObjectPosition: string;
  footerText: string | null;
  primaryColor: string;
  accentColor: string;
};

export type SeoLocaleSettings = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  twitterCard: "summary" | "summary_large_image";
};

export type SeoSettings = {
  global: SeoLocaleSettings;
  locales: Partial<Record<Locale, Partial<SeoLocaleSettings>>>;
};

export type PageId =
  | "homepage"
  | "premium"
  | "shop"
  | "games"
  | "mods"
  | "creators"
  | "partners"
  | "support"
  | "become-creator"
  | "become-partner";

export type LocalizedPageFields = Record<string, string>;

export type PageContentStore = Partial<
  Record<PageId, Partial<Record<Locale, LocalizedPageFields>>>
>;

export const ICON_LIBRARY = [
  { id: "sparkles", label: "Sparkles" },
  { id: "crown", label: "Crown" },
  { id: "gamepad", label: "Gamepad" },
  { id: "zap", label: "Zap" },
  { id: "star", label: "Star" },
  { id: "flame", label: "Flame" },
  { id: "shield", label: "Shield" },
  { id: "rocket", label: "Rocket" },
] as const;

export const DEFAULT_BRANDING_ASSETS: BrandingAssetSettings = {
  siteTitle: "Xumari Modz",
  siteShortName: "Xumari",
  browserTitle: "Xumari Modz — Premium Gaming Mods",
  siteTagline: "Premium gaming mods marketplace",
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  appleTouchIconUrl: null,
  androidIconUrl: null,
  pwaIconUrl: null,
  loadingLogoUrl: null,
  mobileIconUrl: null,
  siteSymbolMode: "letter",
  siteSymbolLetter: "X",
  siteSymbolUrl: null,
  siteSymbolLibrary: "sparkles",
  siteSymbolColor: colors.violet,
  logoObjectPosition: "center",
  footerText: "© Xumari Modz. All rights reserved.",
  primaryColor: colors.violet,
  accentColor: colors.violetBright,
};

export const DEFAULT_SEO: SeoSettings = {
  global: {
    metaTitle: "Xumari Modz — Premium Gaming Mods Marketplace",
    metaDescription:
      "Discover, download, and support premium mods for GTA V, FiveM, Minecraft, ETS2, BeamNG, Assetto Corsa and more.",
    ogTitle: "Xumari Modz",
    ogDescription: "Premium gaming mods marketplace",
    ogImageUrl: null,
    twitterCard: "summary_large_image",
  },
  locales: {},
};

export const PAGE_CONTENT_FIELDS: Record<PageId, string[]> = {
  homepage: [
    "heroBadge",
    "heroTitle",
    "heroSubtitle",
    "browseMods",
    "goPremium",
    "premiumBanner",
    "premiumBannerDesc",
    "statsMods",
    "statsGames",
    "statsCreators",
    // Neues Design: Hero-Bild (URL), Funktionen und FAQ (leere FAQ-Frage = Eintrag ausgeblendet)
    "heroDownload",
    "heroImageUrl",
    "featuresTitle",
    ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`feature${n}Title`, `feature${n}Text`]),
    "faqTitle",
    ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`faq${n}Q`, `faq${n}A`]),
  ],
  premium: ["heroTitle", "heroSubtitle", "ctaText", "featuresIntro", "benefitsIntro"],
  shop: ["heroTitle", "heroSubtitle", "categoryIntro"],
  games: ["introText", "featuredText", "seoContent"],
  mods: ["defaultDescription", "warningText", "downloadNotice", "installNotice"],
  creators: ["introTitle", "introText", "explanationText"],
  partners: ["introTitle", "introText", "requirementsText", "commissionText"],
  support: ["introText", "faqIntro", "ticketInstructions"],
  "become-creator": ["heroTitle", "heroSubtitle", "applicationIntro"],
  "become-partner": ["heroTitle", "heroSubtitle", "applicationIntro"],
};

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

export const SUPPORTED_LOCALES = locales;
