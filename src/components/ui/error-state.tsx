"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fehlerzustand für Listen und Bereiche mit „Erneut versuchen“ (lädt die Serverdaten neu). */
export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-lg border border-line bg-raised px-6 py-10 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="section-title">{title ?? t("error")}</p>
        {message && <p className="max-w-md text-sm text-ink-muted">{message}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={() => (onRetry ? onRetry() : router.refresh())}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}
