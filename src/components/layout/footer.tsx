"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openCookieSettings } from "@/components/ads/cookie-consent-banner";
import { useTranslations } from "next-intl";
import { Logo, type LogoBranding } from "@/components/brand/logo";
import { DEFAULT_FOOTER, type FooterSettings } from "@/lib/branding-defaults";
import { getLanguageDisplayCatalog } from "@/lib/language-catalog";
import { LanguageFlagLabel } from "@/components/i18n/language-flag-label";
import { cn } from "@/lib/utils";

function resolveHref(locale: string, href: string) {
  if (href.startsWith("http")) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `/${locale}${path === "/" ? "" : path}`;
}

type FooterColumn = { id: string; title: string; links: { id: string; label: string; href: string }[] };

const linkClass = "text-sm text-ink-muted transition-colors duration-fast hover:text-ink";

const SECTION_TITLE_KEYS: Record<string, string> = {
  product: "product",
  platform: "product",
  community: "community",
  help: "help",
  support: "help",
  legal: "legal",
};

const LINK_LABEL_KEYS: Record<string, string> = {
  mods: "browseMods",
  games: "games",
  collections: "collections",
  premium: "premium",
  shop: "shop",
  creators: "creators",
  "become-creator": "becomeCreator",
  partners: "partners",
  leaderboards: "leaderboards",
  tutorials: "tutorials",
  news: "news",
  team: "team",
  faq: "faq",
  support: "supportTickets",
  contact: "contact",
  "custom-orders": "customWork",
  developers: "developers",
  imprint: "imprint",
  privacy: "privacy",
  terms: "termsShort",
  withdrawal: "withdrawal",
  dmca: "dmca",
};

// TODO(content): /legal/imprint und /legal/withdrawal zeigen einen Platzhalter – Rechtstexte liefern.
const REQUIRED_LEGAL_LINKS = [
  { id: "imprint", href: "/legal/imprint", order: -2 },
  { id: "privacy", href: "/legal/privacy", order: -1 },
  { id: "terms", href: "/legal/terms", order: 0 },
  { id: "withdrawal", href: "/legal/withdrawal", order: 1 },
];

export function Footer({
  locale,
  footer,
  branding,
  showCookieSettings = false,
}: {
  locale: string;
  footer?: FooterSettings | null;
  branding?: LogoBranding | null;
  showCookieSettings?: boolean;
}) {
  const t = useTranslations("footer");
  const pathname = usePathname() ?? "";
  const siteName = branding?.siteTitle ?? "Xumari Modz";
  // Unveränderte englische Standardtexte aus dem CMS durch die Übersetzung ersetzen.
  const cmsTagline = footer?.tagline?.trim();
  const cmsCopyright = footer?.copyright?.trim();
  const tagline = cmsTagline && cmsTagline !== DEFAULT_FOOTER.tagline ? cmsTagline : t("tagline");
  const copyright =
    cmsCopyright && cmsCopyright !== DEFAULT_FOOTER.copyright ? cmsCopyright : t("rights");

  // Spalten kommen aus dem ACP (Branding → Footer, Standard siehe DEFAULT_FOOTER).
  // Bekannte IDs werden übersetzt; eigene Einträge behalten ihren Text.
  const columns: FooterColumn[] = [...(footer?.sections ?? DEFAULT_FOOTER.sections)]
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const links = [...section.links]
        .sort((a, b) => a.order - b.order)
        .map((link) => ({
          ...link,
          label: LINK_LABEL_KEYS[link.id] ? t(LINK_LABEL_KEYS[link.id]) : link.label,
        }));
      if (section.id === "legal") {
        // Pflichtangaben immer anzeigen, auch wenn sie im ACP fehlen.
        for (const required of REQUIRED_LEGAL_LINKS) {
          if (!links.some((l) => l.id === required.id || l.href === required.href)) {
            links.push({ ...required, label: t(LINK_LABEL_KEYS[required.id]) });
          }
        }
      }
      return {
        id: section.id,
        title: SECTION_TITLE_KEYS[section.id] ? t(SECTION_TITLE_KEYS[section.id]) : section.title,
        links,
      };
    });

  const socials = [
    footer?.socialLinks?.discord && { label: "Discord", href: footer.socialLinks.discord },
    footer?.socialLinks?.twitter && { label: "X", href: footer.socialLinks.twitter },
    footer?.socialLinks?.youtube && { label: "YouTube", href: footer.socialLinks.youtube },
  ].filter(Boolean) as { label: string; href: string }[];

  const languages = getLanguageDisplayCatalog().filter((l) => l.isActive);

  // Im ACP gibt es keinen Webseiten-Footer (feste Sidebar bis zum Seitenende).
  if (/^\/[a-z]{2}\/admin(\/|$)/.test(pathname)) return null;

  return (
    <footer className="border-t border-line bg-footer">
      <div className="page-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo branding={branding} size="sm" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">{tagline}</p>
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className={linkClass}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {columns.map((column) => (
          <nav key={column.id} aria-label={column.title}>
            <h2 className="mb-4 text-[13px] font-semibold text-ink">{column.title}</h2>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.id}>
                  <Link href={resolveHref(locale, link.href)} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.id === "legal" && showCookieSettings && (
                <li>
                  <button type="button" onClick={openCookieSettings} className={linkClass}>
                    {t("cookieSettings")}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="page-container flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-[13px] text-ink-muted">
            <p>
              © {new Date().getFullYear()} {siteName}. {copyright}
            </p>
            <p>{t("disclaimer")}</p>
          </div>
          {languages.length > 1 && (
            <nav aria-label={t("languages")}>
              <ul className="flex flex-wrap gap-1">
                {languages.map((l) => (
                  <li key={l.code}>
                    <Link
                      href={`/${l.code}`}
                      hrefLang={l.code}
                      aria-current={locale === l.code ? "true" : undefined}
                      className={cn(
                        "inline-flex rounded-md px-2 py-1 text-xs transition-colors duration-fast hover:bg-hover",
                        locale === l.code ? "text-violet-bright" : "text-ink-muted"
                      )}
                    >
                      <LanguageFlagLabel language={l} compact />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
