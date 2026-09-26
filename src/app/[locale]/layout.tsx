import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getMessages, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { isValidLocale, locales, type Locale } from "@/i18n/config";
import { getSafeLocale } from "@/lib/i18n/safe-locale";
import { IntlProvider } from "@/components/i18n/intl-provider";
import { AsyncHeader } from "@/components/layout/async-header";
import { AsyncFooter } from "@/components/layout/async-footer";
import { Toaster } from "@/components/ui/toaster";
import { AuthSyncLazy } from "@/components/auth/auth-sync-lazy";
import { LocaleHtmlLang } from "@/components/layout/locale-html-lang";
import { ScrollRestoration } from "@/components/layout/scroll-restoration";
import { AdProviderScripts } from "@/components/ads/ad-provider-scripts";
import { AdPopupSlot } from "@/components/ads/ad-popup-slot";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { getCmsSeo } from "@/lib/page-content";
import { PlatformVisitTracker } from "@/components/analytics/platform-visit-tracker";
import { GlobalSearchShell } from "@/components/search/global-search-shell";
import { GlobalSiteBanners } from "@/components/banners/global-site-banners";
import { isDynamicServerUsageError } from "@/lib/is-dynamic-server-error";
import { CookieConsentSlot } from "@/components/ads/cookie-consent-slot";

const PlatformAudioShell = dynamic(
  () =>
    import("@/components/audio/platform-audio-shell").then((m) => ({
      default: m.PlatformAudioShell,
    }))
);

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getCmsSeo(locale);
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    twitter: {
      card: seo.twitterCard,
      title: seo.ogTitle,
      description: seo.ogDescription,
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  if (!isValidLocale(rawLocale)) {
    redirect(`/${locale}`);
  }
  setRequestLocale(locale);
  let messages;
  try {
    messages = await getMessages();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("[layout] getMessages failed", err);
    }
    messages = {};
  }
  // ACP-Texte (~100 KB) nicht an jede öffentliche Seite schicken; /admin und /designer
  // liefern sie über einen eigenen Provider nach (AdminIntlProvider).
  const { admin: _adminMessages, ...clientMessages } = messages as Record<string, unknown>;

  return (
    <IntlProvider locale={locale} messages={clientMessages as typeof messages}>
      <LocaleHtmlLang locale={locale} />
      <ScrollRestoration />
      <PlatformVisitTracker />
      <AdProviderScripts />
      <AdPopupSlot />
      <AuthSyncLazy />
      <GlobalSearchShell locale={locale}>
        <div className="flex min-h-screen flex-col">
          <AsyncHeader locale={locale} />
          <GlobalSiteBanners />
          <PlatformAudioShell>
            <main className="flex-1">{children}</main>
          </PlatformAudioShell>
          <AdLocationSlot location="footer" className="page-container pb-4" />
          <AsyncFooter locale={locale} />
        </div>
      </GlobalSearchShell>
      <Toaster />
      <CookieConsentSlot />
    </IntlProvider>
  );
}
