import Script from "next/script";
import { GOOGLE_CONSENT_SCRIPT_ID } from "@/lib/adsense-config";

export function GoogleConsentDefault() {
  return (
    // Steht im Root-Layout (src/app/layout.tsx) – dort ist beforeInteractive im App Router vorgesehen; die Regel stammt aus dem pages-Router.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id={GOOGLE_CONSENT_SCRIPT_ID} strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted',
          wait_for_update: 500
        });
      `}
    </Script>
  );
}

export function updateGoogleConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
  }
  window.gtag("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
  });
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
