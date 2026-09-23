"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const t = useTranslations("ui");

  return (
    <section
      aria-label={t("notifications")}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === "destructive";
        const Icon = isError ? AlertCircle : CheckCircle2;
        return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-elevated p-4 animate-in fade-in-0 slide-in-from-bottom-2"
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", isError ? "text-danger" : "text-success")}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {toast.title && <p className="text-sm font-semibold text-ink">{toast.title}</p>}
              {toast.description && (
                <p className="mt-1 break-words text-[13px] text-ink-muted">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t("dismiss")}
              className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-hover hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </section>
  );
}
