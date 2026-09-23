"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { locales, localeLabels, localeFlags, type Locale } from "@/i18n/config";
import { persistUserLocale } from "@/actions/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageFlagLabel } from "@/components/i18n/language-flag-label";
import type { PlatformLanguageOption } from "@/lib/languages";

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

  const [switching, startSwitch] = useTransition();

  function switchLocale(next: Locale) {
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

  const current = options.find((l) => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tNav("language")} disabled={switching}>
          <span className="text-base leading-none" aria-hidden>
            {current?.flagIcon ?? "🌐"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 min-w-[11rem] overflow-y-auto">
        {options.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code as Locale)}
            className={locale === l.code ? "font-semibold text-violet-bright" : ""}
          >
            <LanguageFlagLabel language={l} showCountry />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
