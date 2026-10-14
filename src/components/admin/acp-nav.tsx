"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export type AcpNavLink = { href: string; label: string; count?: number; countTone?: "warning" };
export type AcpNavGroup = { id: string; title: string; links: AcpNavLink[] };

const STORAGE_KEY = "acp-nav-open";

function isActive(pathname: string, base: string, href: string) {
  const full = `${base}${href}`;
  if (href === "") return pathname === base;
  return pathname === full || pathname.startsWith(`${full}/`);
}

function readStored(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function NavBody({
  groups,
  base,
  pathname,
  locale,
  userName,
  userRole,
  openTickets,
  searchRef,
  onNavigate,
}: {
  groups: AcpNavGroup[];
  base: string;
  pathname: string;
  locale: string;
  userName: string;
  userRole: string;
  openTickets: number;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const searchId = useId();
  const [query, setQuery] = useState("");

  // Aktuellen Bereich finden: „Allgemein“ und dieser Bereich sind standardmäßig offen.
  const activeGroup = groups.find((g) => g.links.some((l) => isActive(pathname, base, l.href)))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setOpen({ ...readStored(), general: true, ...(activeGroup ? { [activeGroup]: true } : {}) });
  }, [activeGroup]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Speichern ist optional */
      }
      return next;
    });

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, links: q ? g.links.filter((l) => l.label.toLowerCase().includes(q)) : g.links }))
        .filter((g) => g.links.length > 0),
    [groups, q]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4">
        <Link href={`${base}`} onClick={onNavigate} className="flex items-center gap-2 rounded-md px-1 py-1">
          <Logo size="sm" showText={false} />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold text-ink">ACP</span>
            <span className="block truncate text-xs text-ink-faint">{t("acpSubtitle")}</span>
          </span>
        </Link>

        <div className="relative mt-4">
          <label htmlFor={searchId} className="sr-only">{t("menuSearch")}</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={t("menuSearch")}
            className="h-8 w-full rounded-md border border-line-control bg-elevated pl-8 pr-12 text-[13px] text-ink placeholder:text-ink-faint"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-sm border border-line px-1 font-sans text-[10px] text-ink-faint">
            {t("menuSearchHint")}
          </kbd>
        </div>
      </div>

      <nav aria-label={t("acpSubtitle")} className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 && <p className="meta px-2 py-3">{t("menuNoResults")}</p>}
        <ul className="space-y-1">
          {filtered.map((group) => {
            const expanded = q ? true : !!open[group.id];
            const listId = `acp-group-${group.id}`;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  onClick={() => toggle(group.id)}
                  disabled={!!q}
                  className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-semibold uppercase tracking-wide text-ink-faint hover:text-ink disabled:cursor-default"
                >
                  <span className="flex items-center gap-2">
                    {group.title}
                    <span className="font-normal normal-case tabular-nums" aria-label={t("sectionEntries", { count: group.links.length })}>
                      {group.links.length}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-fast", expanded && "rotate-180")} aria-hidden />
                </button>
                <ul id={listId} hidden={!expanded} className="mt-0.5 space-y-px">
                  {group.links.map((link) => {
                    const active = isActive(pathname, base, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={`${base}${link.href}`}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex h-[30px] items-center justify-between gap-2 rounded-md pl-3 pr-2 text-[13px] transition-colors duration-fast",
                            active
                              ? "bg-hover font-semibold text-ink before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-[3px] before:rounded-full before:bg-violet"
                              : "text-ink-muted hover:bg-hover hover:text-ink"
                          )}
                        >
                          <span className="truncate">{link.label}</span>
                          {link.count != null && (
                            <span
                              className={cn(
                                "shrink-0 rounded-sm px-1.5 text-[11px] font-semibold tabular-nums",
                                link.countTone === "warning" && link.count > 0 ? "bg-warning-soft text-warning" : "text-ink-faint"
                              )}
                            >
                              {link.count}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <Link href={`/${locale}`} className="flex h-[30px] items-center gap-2 rounded-md px-2 text-[13px] text-ink-muted hover:bg-hover hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t("backToSite")}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{userName}</p>
            <p className="text-xs text-ink-faint">{userRole}</p>
          </div>
          <Link
            href={`${base}/tickets`}
            onClick={onNavigate}
            aria-label={t("openTickets", { count: openTickets })}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {openTickets > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-warning px-1 text-center text-[10px] font-bold leading-4 text-canvas tabular-nums">
                {openTickets > 99 ? "99+" : openTickets}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** ACP-Seitenleiste: fest 232px ab 1024px, darunter Menü-Button mit Schublade. */
export function AcpNav(props: {
  groups: AcpNavGroup[];
  base: string;
  locale: string;
  userName: string;
  userRole: string;
  openTickets: number;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname() ?? "";
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerSearchRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Strg/⌘+K fokussiert die Menüsuche (auf kleinen Bildschirmen öffnet es die Schublade).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) searchRef.current?.focus();
        else {
          setDrawerOpen(true);
          setTimeout(() => drawerSearchRef.current?.focus(), 0);
        }
      }
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <>
      <aside className="sticky top-header hidden h-[calc(100vh-var(--header-height))] w-acp-sidebar shrink-0 border-r border-line bg-sidebar lg:block">
        <NavBody {...props} pathname={pathname} searchRef={searchRef} />
      </aside>

      <div className="flex h-12 items-center border-b border-line bg-sidebar px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="acp-drawer"
          className="flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-ink hover:bg-hover"
        >
          <Menu className="h-4 w-4" aria-hidden />
          ACP
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("acpSubtitle")}>
          <button type="button" className="absolute inset-0 bg-canvas/80" aria-label={t("closeMenu")} onClick={() => setDrawerOpen(false)} />
          <div id="acp-drawer" className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-sidebar">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t("closeMenu")}
              className="absolute right-2 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-hover"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <NavBody {...props} pathname={pathname} searchRef={drawerSearchRef} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
