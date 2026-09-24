import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Download, MonitorDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { getLauncherRelease } from "@/lib/launcher-release";
import { formatBytes } from "@/lib/file-size";
import { formatDate } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "download" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function DownloadPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("download");
  const tl = await getTranslations("landing");
  const release = await getLauncherRelease().catch(() => null);

  const requirements = [t("reqOs"), t("reqArch"), t("reqAccount"), t("reqInternet")];
  const steps = [1, 2, 3].map((n) => ({ n, title: t(`step${n}Title`), text: t(`step${n}Text`) }));

  return (
    <div>
      <section className="page-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <h1 className="h1-display">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-base text-ink-muted md:text-lg">{t("subtitle")}</p>
          </div>

          {release ? (
            <div className="rounded-xl border border-line bg-raised p-6">
              <Button size="lg" className="w-full" asChild>
                <a href={release.fileUrl} download>
                  <Download className="h-4 w-4" aria-hidden />
                  {t("button")}
                </a>
              </Button>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="meta">{t("version")}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{release.version}</dd>
                </div>
                <div>
                  <dt className="meta">{t("size")}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">
                    {formatBytes(release.fileSizeBytes, locale)}
                  </dd>
                </div>
                {release.releasedAt && (
                  <div className="col-span-2">
                    <dt className="meta">{t("released")}</dt>
                    <dd className="mt-0.5 tabular-nums text-ink">{formatDate(release.releasedAt, locale)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-semibold text-ink">{t("checksum")}</p>
                <code className="mt-2 block break-all rounded-md bg-elevated p-3 font-mono text-xs text-ink">
                  {release.sha256}
                </code>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="meta max-w-[240px]">{t("checksumHint")}</p>
                  <CopyButton value={release.sha256} label={t("copy")} copiedLabel={t("copied")} />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={MonitorDown}
              title={t("unavailableTitle")}
              description={t("unavailableText")}
              action={
                <Button variant="outline" asChild>
                  <Link href={`/${locale}/mods`}>{tl("browseMods")}</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      <section className="page-section border-t border-line">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("stepsTitle")}</h2>
            <ol className="mt-8 space-y-6">
              {steps.map((step) => (
                <li key={step.n} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-elevated text-sm font-bold tabular-nums text-ink">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("requirementsTitle")}</h2>
            <ul className="mt-8 space-y-3">
              {requirements.map((req) => (
                <li key={req} className="flex gap-3 text-ink-muted">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="page-section border-t border-line">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-ink">{t("changelogTitle")}</h2>
          {release && release.changelog.length > 0 ? (
            <ol className="mt-8 space-y-8">
              {release.changelog.map((entry) => (
                <li key={entry.version}>
                  <p className="font-semibold tabular-nums text-ink">
                    {entry.version}
                    {entry.date && <span className="meta ml-3 font-normal">{formatDate(entry.date, locale)}</span>}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {entry.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-ink-muted">{t("changelogEmpty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
