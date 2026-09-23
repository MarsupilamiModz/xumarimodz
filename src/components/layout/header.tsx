"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Logo, type LogoBranding } from "@/components/brand/logo";
import { AuthButtons } from "@/components/layout/auth-buttons";
import { GamesHoverMenu } from "@/components/layout/games-hover-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { NavLabels } from "@/components/layout/nav-labels";
import type { NavUser } from "@/components/layout/user-nav";
import { DEFAULT_HEADER_MENU, type HeaderSettings } from "@/lib/branding-defaults";
import type { NavGameItem } from "@/lib/nav-games";
import type { PlatformLanguageOption } from "@/lib/languages";
import { cn } from "@/lib/utils";

const HeaderSearch = dynamic(
  () => import("@/components/search/header-search").then((m) => m.HeaderSearch),
  { ssr: false, loading: () => <span className="inline-block h-10 w-10" /> }
);

function resolveMenuHref(locale: string, href: string) {
  if (href.startsWith("http")) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `/${locale}${path === "/" ? "" : path}`;
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname || href.startsWith("http")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({
  locale,
  user,
  navLabels,
  header,
  branding,
  navGames = [],
  allGamesLabel = "All games",
  languages,
}: {
  locale: string;
  user: NavUser | null;
  navLabels: NavLabels;
  header?: HeaderSettings | null;
  branding?: LogoBranding | null;
  navGames?: NavGameItem[];
  allGamesLabel?: string;
  languages?: PlatformLanguageOption[];
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mobileNavId = useId();

  // Menü beim Seitenwechsel schließen; Esc schließt ebenfalls.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const labelMap: Record<string, string> = {
    games: navLabels.games,
    mods: navLabels.mods,
    collections: navLabels.collections,
    creators: navLabels.creators,
    partners: navLabels.partners,
    shop: navLabels.shop,
    leaderboards: navLabels.leaderboards,
    premium: navLabels.premium,
    "custom-orders": navLabels.customOrders,
  };

  // Menüpunkte kommen aus dem ACP (Branding → Header); Standard siehe DEFAULT_HEADER_MENU.
  const links = (header?.menuItems?.length ? header.menuItems : DEFAULT_HEADER_MENU)
    .filter((item) => !item.hidden)
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const href = resolveMenuHref(locale, item.href);
      return { href, label: labelMap[item.id] ?? item.label, active: isActivePath(pathname, href) };
    });

  // Nur "sticky" wird aus den ACP-Header-Einstellungen übernommen; Farbe, Höhe und Blur legt das Design fest.
  const sticky = header?.sticky !== false;

  return (
    <header
      className={cn(
        "z-50 border-b border-line bg-canvas",
        sticky ? "sticky top-0" : "relative"
      )}
    >
      <div className="page-container flex h-header items-center gap-6">
        <Link href={`/${locale}`} className="shrink-0 rounded-md" aria-label={branding?.siteTitle ?? undefined}>
          <Logo size="sm" branding={branding} />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden h-full items-stretch gap-5 md:flex">
          {links.map((l) =>
            l.href === `/${locale}/games` && navGames.length > 0 ? (
              <div key={l.href} className="flex items-center">
                <GamesHoverMenu
                  locale={locale}
                  label={l.label}
                  games={navGames}
                  allGamesLabel={allGamesLabel}
                />
              </div>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                aria-current={l.active ? "page" : undefined}
                className={cn(
                  "relative flex items-center text-sm font-medium transition-colors duration-fast",
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full",
                  l.active
                    ? "text-ink after:bg-violet-bright"
                    : "text-ink-muted hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <HeaderSearch locale={locale} />
          <LanguageSwitcher locale={locale} languages={languages} />
          <AuthButtons locale={locale} user={user} />
          {/* TODO(design): Warenkorb mit Zähler und "App herunterladen" folgen mit Kasse und Download-Seite. */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={mobileNavId}
            aria-label={open ? t("closeMenu") : t("openMenu")}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>

      <nav
        id={mobileNavId}
        aria-label={t("mainNav")}
        hidden={!open}
        className="border-t border-line bg-canvas md:hidden"
      >
        <ul className="page-container flex flex-col py-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={l.active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-md px-3 text-[15px] font-medium",
                  l.active ? "bg-violet-soft text-violet-bright" : "text-ink hover:bg-hover"
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {!user && (
            <li>
              <Link
                href={`/${locale}/register`}
                className="flex h-11 items-center rounded-md px-3 text-[15px] font-medium text-ink hover:bg-hover"
              >
                {t("register")}
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
