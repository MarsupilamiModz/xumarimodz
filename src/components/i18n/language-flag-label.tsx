"use client";

import type { PlatformLanguageOption } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Props = {
  language: Pick<PlatformLanguageOption, "code" | "name" | "flagIcon" | "nativeName" | "countryName">;
  showCountry?: boolean;
  compact?: boolean;
  className?: string;
};

export function LanguageFlagLabel({ language, showCountry, compact, className }: Props) {
  const label = language.nativeName ?? language.name;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Sprachkürzel statt Flaggen-Emoji */}
      <span
        className="inline-flex min-w-[28px] justify-center rounded-sm bg-elevated px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none text-ink-muted"
        aria-hidden
      >
        {language.code}
      </span>
      {compact && <span className="sr-only">{label}</span>}
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span>{label}</span>
          {showCountry && language.countryName ? (
            <span className="text-[11px] text-ink-muted">{language.countryName}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}
