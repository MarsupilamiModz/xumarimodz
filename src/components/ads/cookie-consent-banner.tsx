"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateGoogleConsent } from "@/components/ads/google-consent-mode";

const STORAGE_KEY = "xumari-cookie-consent";
/** Wird vom Link „Cookie-Einstellungen“ im Footer ausgelöst. */
export const OPEN_COOKIE_SETTINGS_EVENT = "xumari:open-cookie-settings";

type ConsentChoice = "accepted" | "rejected" | null;

function readConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Läuft vor dem ersten Paint: Wer schon entschieden hat, bekommt die Klasse und sieht den
 * serverseitig gerenderten Banner nie (kein Aufblitzen). Neue Besucher sehen ihn sofort mit
 * dem ersten Paint statt erst nach der Hydration – sonst wird er auf Mobilgeräten zum späten LCP.
 */
const PRE_PAINT_SCRIPT = `try{var v=localStorage.getItem("${STORAGE_KEY}");if(v==="accepted"||v==="rejected")document.documentElement.classList.add("cookie-decided")}catch(e){}`;

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

export function CookieConsentBanner() {
  const t = useTranslations("cookie");
  const locale = useLocale();
  // Startet sichtbar, damit Server und Client gleich rendern; ausgeblendet wird per Klasse bzw. nach dem Lesen.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const stored = readConsent();
    if (stored === "accepted") updateGoogleConsent(true);
    else if (stored === "rejected") updateGoogleConsent(false);
    if (stored) setVisible(false);

    const open = () => {
      document.documentElement.classList.remove("cookie-decided");
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  if (!visible) return null;

  const save = (choice: Exclude<ConsentChoice, null>) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    updateGoogleConsent(choice === "accepted");
    setVisible(false);
  };

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
    <div
      id="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-text"
      className="fixed inset-x-4 bottom-4 z-[100] rounded-xl border border-line bg-raised p-5 sm:left-auto sm:right-6 sm:max-w-md"
    >
      <h2 id="cookie-consent-title" className="text-base font-semibold text-ink">
        {t("title")}
      </h2>
      <p id="cookie-consent-text" className="mt-2 text-sm text-ink-muted">
        {t("text")}{" "}
        <Link href={`/${locale}/legal/privacy`} className="link">
          {t("privacy")}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Beide Optionen gleichwertig sichtbar – kein vorausgewähltes „Alle erlauben“. */}
        <Button variant="outline" onClick={() => save("rejected")}>
          {t("essentialOnly")}
        </Button>
        <Button variant="outline" onClick={() => save("accepted")}>
          {t("acceptAll")}
        </Button>
      </div>
    </div>
    </>
  );
}
