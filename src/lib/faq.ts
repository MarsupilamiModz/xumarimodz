import { getTranslations } from "next-intl/server";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { resolvePageContent } from "@/lib/branding-cms";
import type { Locale } from "@/i18n/config";

export type FaqEntry = { q: string; a: string };

const DEFAULT_COUNT = 4;
const MAX_COUNT = 6;

/**
 * FAQ für Startseite und /faq. Einträge 1–4 haben übersetzte Standardtexte,
 * 5–6 erscheinen nur, wenn sie im ACP (Inhalte → Startseite) gesetzt sind.
 */
export async function getFaqEntries(locale: Locale): Promise<FaqEntry[]> {
  const [t, cms] = await Promise.all([getTranslations({ locale, namespace: "landing" }), getCachedPublicBranding()]);
  const field = (name: string, fallback: string) =>
    resolvePageContent(cms.pageContent, "homepage", locale, name, fallback).trim();

  return Array.from({ length: MAX_COUNT }, (_, i) => i + 1)
    .map((n) => {
      const hasDefault = n <= DEFAULT_COUNT;
      return {
        q: field(`faq${n}Q`, hasDefault ? t(`faq${n}Q`) : ""),
        a: field(`faq${n}A`, hasDefault ? t(`faq${n}A`) : ""),
      };
    })
    .filter((f) => f.q && f.a);
}
