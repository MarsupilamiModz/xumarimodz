"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ownerClearTranslationCache,
  ownerProcessTranslationQueue,
  ownerRetranslateAllMods,
  ownerSyncMissingUiKeys,
} from "@/actions/admin/translation-center";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";
import type { TranslationAuditResult } from "@/lib/i18n-audit";

type Props = {
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    approved: number;
    engine: {
      provider: string;
      openai: boolean;
      deepl: boolean;
      google: boolean;
      azure: boolean;
      autoApprove: boolean;
    };
  };
  cache: { dbEntries: number };
  missing: {
    uiMissingKeys: number;
    runtimeMissing: number;
    locales: { locale: string; missing: number }[];
    topRuntimeKeys: { key: string; count: number }[];
  };
  audit: TranslationAuditResult;
};

export function TranslationCenterPanel({ queue, cache, missing, audit }: Props) {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.ownerTranslations");
  const ts = useTranslations("ui.status");
  const locale = useLocale();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ success: boolean; error?: string; data?: unknown }>) => {
    startTransition(async () => {
      const r = await fn();
      if (r.success) appToast.saved();
      else appToast.error(r.error);
    });
  };

  const engines = [
    { name: "OpenAI", on: queue.engine.openai },
    { name: "DeepL", on: queue.engine.deepl },
    { name: "Google", on: queue.engine.google },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("translationQueue")} value={formatNumber(queue.pending, locale)} hint={t("translationPending")} />
        <KpiTile label={t("translationApproved")} value={formatNumber(queue.approved, locale)} />
        <KpiTile label={t("translationCache")} value={formatNumber(cache.dbEntries, locale)} />
        <KpiTile
          label={t("translationMissingUi")}
          value={formatNumber(missing.uiMissingKeys, locale)}
          tone={missing.uiMissingKeys > 0 ? "warning" : undefined}
        />
      </div>

      <SectionCard title={t("translationEngine")} description={tp("provider", { provider: queue.engine.provider })}>
        <ul className="flex flex-wrap gap-2" aria-label={t("translationEngine")}>
          {engines.map((e) => (
            <li key={e.name} className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[13px] text-ink">
              {e.name}
              <StatusBadge tone={e.on ? "success" : "neutral"} label={e.on ? ts("active") : ts("inactive")} />
            </li>
          ))}
          <li>
            <StatusBadge
              tone={queue.engine.autoApprove ? "success" : "pending"}
              label={queue.engine.autoApprove ? t("translationAutoApprove") : t("translationManualApprove")}
            />
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(ownerProcessTranslationQueue)}>
            {t("translationProcessQueue")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(ownerRetranslateAllMods)}>
            {t("translationRetranslateMods")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(ownerClearTranslationCache)}>
            {t("translationClearCache")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(ownerSyncMissingUiKeys)}>
            {t("translationSyncMissingKeys")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={t("translationAudit")} description={audit.summary}>
        {missing.locales.length === 0 ? (
          <p className="text-sm text-ink-muted">{tp("noMissing")}</p>
        ) : (
          <dl className="divide-y divide-line rounded-md border border-line text-[13px]">
            {missing.locales.map((row) => (
              <div key={row.locale} className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="mono-id text-ink">{row.locale}</dt>
                <dd className="tabular-nums text-ink-muted">{tp("missingCount", { count: row.missing })}</dd>
              </div>
            ))}
          </dl>
        )}
      </SectionCard>
    </div>
  );
}
