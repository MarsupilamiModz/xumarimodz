"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Upload } from "lucide-react";
import { importUiTranslations, saveUiTranslation } from "@/actions/admin/localization";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

/** Eingabefeld einer Übersetzung: speichert bei Enter/Verlassen; fehlende Texte sind gelb umrandet. */
export function TranslationCell({ locale, entryKey, value, missing }: { locale: string; entryKey: string; value: string; missing: boolean }) {
  const t = useTranslations("admin.lo");
  const appToast = useAppToast();
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(value);
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  function commit() {
    if (text === saved) return;
    startTransition(async () => {
      const r = await saveUiTranslation(locale, entryKey, text);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setSaved(text);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    });
  }

  const isMissing = missing && !saved.trim();
  return (
    <span className="relative block">
      <textarea
        aria-label={t("valueFor", { key: entryKey })}
        value={text}
        rows={Math.min(4, Math.max(1, Math.ceil(text.length / 60)))}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        className={cn(
          "w-full resize-y rounded-md border bg-elevated px-2.5 py-1.5 text-[13px] text-ink transition-colors duration-fast",
          isMissing ? "border-warning" : "border-line-control hover:border-ink-faint"
        )}
      />
      <span className="pointer-events-none absolute right-2 top-2 text-ink-faint" aria-live="polite">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : justSaved ? <Check className="h-3.5 w-3.5 text-success" aria-label={t("saved")} /> : null}
      </span>
    </span>
  );
}

export function TranslationImport({ locale }: { locale: string }) {
  const t = useTranslations("admin.lo");
  const router = useRouter();
  const appToast = useAppToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          startTransition(async () => {
            const r = await importUiTranslations(locale, await file.text());
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            appToast.updated(t("imported", r.data));
            router.refresh();
          });
        }}
      />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {t("import")}
      </Button>
    </>
  );
}
