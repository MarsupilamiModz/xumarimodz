"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { locales, localeLabels, localeFlags, type Locale } from "@/i18n/config";
import { persistUserLocale } from "@/actions/locale";
import { Button } from "@/components/ui/button";
import { LanguageFlagLabel } from "@/components/i18n/language-flag-label";
import type { PlatformLanguageOption } from "@/lib/languages";
import { cn } from "@/lib/utils";

/**
 * Sprachwahl im Header als schlankes Menü ohne Radix (spart ~25 KB Start-JS auf jeder Seite).
 * Tastatur: Enter/Leertaste öffnet, Pfeiltasten wählen, Esc schließt und gibt den Fokus zurück.
 */
export function LanguageSwitcher({
  locale,
  languages,
}: {
  locale: string;
  languages?: PlatformLanguageOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [switching, startSwitch] = useTransition();

  const options =
    languages?.length
      ? languages
      : locales.map((l) => ({
          code: l,
          name: localeLabels[l],
          nativeName: localeLabels[l],
          countryName: "",
          flagIcon: localeFlags[l],
          isActive: true,
        }));

  function switchLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startSwitch(() => {
      document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;sameSite=lax`;
      const segments = pathname.split("/");
      if (locales.includes(segments[1] as Locale)) {
        segments[1] = next;
      } else {
        segments.splice(1, 0, next);
      }
      void persistUserLocale(next);
      router.replace(segments.join("/") || `/${next}`);
      router.refresh();
    });
  }

  // Beim Öffnen den aktiven Eintrag fokussieren; Klick außerhalb schließt.
  useEffect(() => {
    if (!open) return;
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>("button[role=menuitemradio]");
    const active = Array.from(items ?? []).find((b) => b.getAttribute("aria-checked") === "true") ?? items?.[0];
    active?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[role=menuitemradio]") ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const current = options.find((l) => l.code === locale);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        aria-label={tNav("language")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={switching}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="text-xs font-semibold uppercase" aria-hidden>
          {current?.code ?? locale}
        </span>
      </Button>
      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={tNav("language")}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 max-h-72 min-w-[11rem] overflow-y-auto rounded-lg border border-line bg-raised p-1"
        >
          {options.map((l) => {
            const selected = locale === l.code;
            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  tabIndex={-1}
                  onClick={() => switchLocale(l.code as Locale)}
                  className={cn(
                    "flex h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm outline-none transition-colors duration-fast hover:bg-hover focus-visible:bg-hover",
                    selected ? "font-semibold text-violet-bright" : "text-ink"
                  )}
                >
                  <LanguageFlagLabel language={l} showCountry />
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
