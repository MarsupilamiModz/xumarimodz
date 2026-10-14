"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { runTranslationJob, approveTranslationJob } from "@/actions/admin/localization";

type Job = {
  id: string;
  entityType: string;
  field: string;
  sourceLocale: string;
  targetLocale: string;
  sourceText: string;
  translatedText: string | null;
  status: string;
};

// Status der Übersetzungsjobs (enum TranslationJobStatus) → Ton des StatusBadge.
const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  PROCESSING: "info",
  COMPLETED: "warning",
  FAILED: "danger",
  APPROVED: "success",
};
const KNOWN_STATUS = new Set(Object.keys(STATUS_TONE));

export function LocalizationAdminPanel({ jobs }: { jobs: Job[] }) {
  const t = useTranslations("admin.panelLocalization");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  if (jobs.length === 0) {
    return <EmptyState icon={Languages} title={t("emptyTitle")} description={t("emptyText")} />;
  }

  return (
    <ul className="space-y-3" aria-label={t("listLabel")}>
      {jobs.map((job) => (
        <li key={job.id} className="space-y-2 rounded-lg border border-line bg-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={STATUS_TONE[job.status] ?? "neutral"}
              label={KNOWN_STATUS.has(job.status) ? t(`status.${job.status}`) : job.status}
            />
            <span className="meta">
              <span className="mono-id">{job.entityType}.{job.field}</span> · {job.sourceLocale} → {job.targetLocale}
            </span>
          </div>
          <p className="line-clamp-2 text-sm text-ink">{job.sourceText}</p>
          {job.translatedText && <p className="line-clamp-2 text-sm text-ink-muted">{job.translatedText}</p>}
          <div className="flex gap-2">
            {job.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await runTranslationJob(job.id);
                    if (r.success) appToast.saved();
                    else appToast.error(r.error);
                  })
                }
              >
                {t("run")}
              </Button>
            )}
            {job.status === "COMPLETED" && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await approveTranslationJob(job.id);
                    if (r.success) appToast.saved();
                    else appToast.error(r.error);
                  })
                }
              >
                {t("approve")}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
