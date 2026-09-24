"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className="max-w-xl py-6" role="alert">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="h1-acp mt-5">{t("adminErrorTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("adminErrorHint")}</p>
      {error.message && <p className="mt-4 break-words text-[13px] text-ink-muted">{error.message}</p>}
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-ink-faint">
          {t("reference")}: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => reset()}>{t("retry")}</Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/admin`}>{t("backToOverview")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href={`/${locale}/admin/system`}>{t("systemLog")}</Link>
        </Button>
      </div>
    </div>
  );
}
