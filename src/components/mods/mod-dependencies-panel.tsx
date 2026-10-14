"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/page-header";
import { AlertTriangle, XCircle } from "lucide-react";
import type { Locale } from "@/i18n/config";

type Dep = {
  id: string;
  isRequired: boolean;
  minVersion: string | null;
  notes: string | null;
  dependency: {
    id: string;
    slug: string;
    title: string;
    status: string;
    game: { name: string; slug: string };
    versions: { version: string; gameVersion: string | null }[];
  };
};

type Props = {
  locale: Locale;
  required: Dep[];
  optional: Dep[];
  conflicts?: Dep[];
  missing: Dep[];
};

export function ModDependenciesPanel({ locale, required, optional, conflicts = [], missing }: Props) {
  const t = useTranslations("sharedUi.dependencies");
  const [pending, startTransition] = useTransition();
  const [showMissing, setShowMissing] = useState(missing.length > 0);

  function downloadDependencies() {
    startTransition(async () => {
      const ids = missing.map((m) => m.dependency.id);
      if (ids.length === 0) return;

      for (const id of ids) {
        const res = await fetch(`/api/mods/${id}/download`, { method: "POST" });
        if (res.ok) {
          const { url } = await res.json();
          window.open(url, "_blank");
        }
      }

      await fetch("/api/mods/dependencies/bulk-favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modIds: ids }),
      });

      toast({ title: "toast.dependenciesAdded" });
      setShowMissing(false);
    });
  }

  if (required.length === 0 && optional.length === 0 && conflicts.length === 0) return null;

  return (
    <SectionCard title={t("title")}>
      <div className="space-y-4">
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft p-4">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <div>
                <p className="text-sm font-medium text-danger">{t("incompatible")}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {conflicts.map((d) => (
                    <li key={d.id}>
                      <Link href={`/${locale}/mods/${d.dependency.slug}`} className="link">
                        {d.dependency.title}
                      </Link>
                      {d.notes && <span className="text-ink-muted"> – {d.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {showMissing && missing.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{t("requires")}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {missing.map((d) => (
                    <li key={d.id}>
                      <Link href={`/${locale}/mods/${d.dependency.slug}`} className="link">
                        {d.dependency.title}
                      </Link>
                      {d.minVersion && (
                        <span className="text-ink-muted"> {t("minVersionHint", { version: d.minVersion })}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Button size="sm" className="mt-3" disabled={pending} onClick={downloadDependencies}>
                  {t("downloadRequired")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {required.length > 0 && (
          <div>
            <p className="label-text mb-2">{t("required")}</p>
            <ul className="space-y-2">
              {required.map((d) => (
                <DependencyRow key={d.id} locale={locale} dep={d} />
              ))}
            </ul>
          </div>
        )}

        {optional.length > 0 && (
          <div>
            <p className="label-text mb-2">{t("optional")}</p>
            <ul className="space-y-2">
              {optional.map((d) => (
                <DependencyRow key={d.id} locale={locale} dep={d} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function DependencyRow({ locale, dep }: { locale: Locale; dep: Dep }) {
  const t = useTranslations("sharedUi.dependencies");
  const v = dep.dependency.versions[0];
  return (
    <li className="flex items-center justify-between border-b border-line pb-2 text-sm last:border-0">
      <Link
        href={`/${locale}/mods/${dep.dependency.slug}`}
        className="font-medium text-ink hover:text-violet-bright"
      >
        {dep.dependency.title}
      </Link>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {v && <span>{t("version", { version: v.version })}</span>}
        {v?.gameVersion && <Badge variant="outline">{v.gameVersion}</Badge>}
        {dep.minVersion && <span>{t("minVersion", { version: dep.minVersion })}</span>}
      </div>
    </li>
  );
}
