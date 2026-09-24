"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, Home, LogIn, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildErrorReport, type ErrorDiagnostics, type RecoveryAction } from "@/lib/error-diagnostics";
import { cn } from "@/lib/utils";
import { redirectToLogin } from "@/lib/session-recovery";

export type ErrorRecoveryLabels = {
  titleNetwork: string;
  titleAuth: string;
  titleDatabase: string;
  titleUpload: string;
  titlePermission: string;
  titleValidation: string;
  retry: string;
  reload: string;
  signIn: string;
  home: string;
  copyDetails: string;
  copied: string;
  detailsLabel: string;
  codeLabel: string;
  referenceLabel: string;
  categoryLabel: string;
};

export const ERROR_RECOVERY_LABELS_EN: ErrorRecoveryLabels = {
  titleNetwork: "Connection problem",
  titleAuth: "Session issue",
  titleDatabase: "Database temporarily unavailable",
  titleUpload: "Upload interrupted",
  titlePermission: "Access denied",
  titleValidation: "Invalid request",
  retry: "Try again",
  reload: "Reload page",
  signIn: "Sign in again",
  home: "Back to home",
  copyDetails: "Copy details",
  copied: "Copied",
  detailsLabel: "Technical details",
  codeLabel: "Code",
  referenceLabel: "Reference",
  categoryLabel: "Category",
};

export function ErrorRecoveryPanelContent({
  diagnostics,
  labels,
  onRetry,
  compact = false,
  className,
}: {
  diagnostics: ErrorDiagnostics;
  labels: ErrorRecoveryLabels;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => {
    switch (diagnostics.category) {
      case "network":
        return labels.titleNetwork;
      case "auth":
        return labels.titleAuth;
      case "database":
        return labels.titleDatabase;
      case "upload":
        return labels.titleUpload;
      case "permission":
        return labels.titlePermission;
      case "validation":
        return labels.titleValidation;
      default:
        return diagnostics.title;
    }
  }, [diagnostics.category, diagnostics.title, labels]);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(buildErrorReport(diagnostics));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function renderAction(action: RecoveryAction) {
    switch (action) {
      case "retry":
        return onRetry ? (
          <Button key="retry" size={compact ? "sm" : "default"} onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {labels.retry}
          </Button>
        ) : null;
      case "reload":
        return (
          <Button
            key="reload"
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {labels.reload}
          </Button>
        );
      case "signIn":
        return (
          <Button
            key="signIn"
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => redirectToLogin()}
          >
            <LogIn className="h-4 w-4" aria-hidden />
            {labels.signIn}
          </Button>
        );
      case "home":
        return (
          <Button key="home" variant="outline" size={compact ? "sm" : "default"} asChild>
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden />
              {labels.home}
            </Link>
          </Button>
        );
      case "copy":
        return (
          <Button key="copy" variant="ghost" size={compact ? "sm" : "default"} onClick={() => void copyDetails()}>
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? labels.copied : labels.copyDetails}
          </Button>
        );
      default:
        return null;
    }
  }

  return (
    <Card className={cn(compact ? "p-4" : "w-full max-w-xl p-8", className)} role="alert">
      <div className={cn("flex flex-col", compact ? "gap-3" : "gap-5")}>
        <span
          className={cn(
            "flex items-center justify-center rounded-lg bg-danger-soft text-danger",
            compact ? "h-9 w-9" : "h-12 w-12"
          )}
        >
          <AlertTriangle className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
        </span>
        <div className="space-y-2">
          <h2 className={cn("font-bold text-ink", compact ? "text-lg" : "text-[28px] leading-tight")}>{title}</h2>
          <p className="text-sm text-ink-muted">{diagnostics.hint}</p>
        </div>

        <details className="w-full rounded-md border border-line bg-elevated p-3 text-left">
          <summary className="cursor-pointer text-[13px] font-semibold text-ink-muted">{labels.detailsLabel}</summary>
          <p className="mt-2 break-words text-sm text-ink">{diagnostics.message}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-muted">
            {diagnostics.code && (
              <span className="rounded-sm bg-hover px-2 py-0.5 font-mono">
                {labels.codeLabel}: {diagnostics.code}
              </span>
            )}
            {diagnostics.digest && (
              <span className="rounded-sm bg-hover px-2 py-0.5 font-mono">
                {labels.referenceLabel}: {diagnostics.digest}
              </span>
            )}
            <span className="rounded-sm bg-hover px-2 py-0.5">
              {labels.categoryLabel}: {diagnostics.category}
            </span>
          </div>
        </details>

        <div className="flex flex-wrap gap-2">
          {diagnostics.recoveryActions.map((action) => renderAction(action))}
        </div>
      </div>
    </Card>
  );
}

export function ErrorRecoveryPanel(props: Omit<Parameters<typeof ErrorRecoveryPanelContent>[0], "labels">) {
  const t = useTranslations("common.recovery");
  const labels: ErrorRecoveryLabels = {
    titleNetwork: t("titleNetwork"),
    titleAuth: t("titleAuth"),
    titleDatabase: t("titleDatabase"),
    titleUpload: t("titleUpload"),
    titlePermission: t("titlePermission"),
    titleValidation: t("titleValidation"),
    retry: t("retry"),
    reload: t("reload"),
    signIn: t("signIn"),
    home: t("home"),
    copyDetails: t("copyDetails"),
    copied: t("copied"),
    detailsLabel: t("detailsLabel"),
    codeLabel: t("codeLabel"),
    referenceLabel: t("referenceLabel"),
    categoryLabel: t("categoryLabel"),
  };

  return <ErrorRecoveryPanelContent {...props} labels={labels} />;
}
