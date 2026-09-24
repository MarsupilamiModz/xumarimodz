import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { shouldLoadGlobalAdSense } from "@/components/ads/global-site-ads";

async function FooterWithBranding({ locale }: { locale: string }) {
  const [bundle, ads] = await Promise.all([
    getCachedPublicBranding(),
    shouldLoadGlobalAdSense().catch(() => ({ consentMode: true })),
  ]);
  return (
    <Footer
      locale={locale}
      footer={bundle.footer}
      branding={bundle.branding}
      showCookieSettings={ads.consentMode}
    />
  );
}

export function AsyncFooter({ locale }: { locale: string }) {
  return (
    <Suspense fallback={<footer className="h-48 border-t border-line bg-footer" />}>
      <FooterWithBranding locale={locale} />
    </Suspense>
  );
}
