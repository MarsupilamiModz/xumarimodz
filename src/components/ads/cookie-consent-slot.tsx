import { CookieConsentBanner } from "@/components/ads/cookie-consent-banner";
import { shouldLoadGlobalAdSense } from "@/components/ads/global-site-ads";

/** Cookie-Banner nur, wenn der Consent-Modus im ACP aktiv ist. */
export async function CookieConsentSlot() {
  const { consentMode } = await shouldLoadGlobalAdSense().catch(() => ({ consentMode: true }));
  return consentMode ? <CookieConsentBanner /> : null;
}
