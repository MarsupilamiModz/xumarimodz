import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileAudio, FileText, FileVideo, ImageOff } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { getMediaSettings } from "@/lib/media-settings";
import { MEDIA_KINDS, getMediaDetail, getMediaLibrary, type MediaKind } from "@/lib/admin-media-library";
import { formatDate } from "@/lib/format-locale";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { MediaSettingsPanel } from "@/components/admin/media-settings-panel";
import { MediaDeleteButton, MediaPreview } from "@/components/admin/media-library-tools";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SafeImage } from "@/components/ui/safe-image";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

type Params = { tab?: string; kind?: string; q?: string; page?: string; id?: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const KIND_BAR: Record<MediaKind, string> = { image: "bg-violet", audio: "bg-success", video: "bg-warning", other: "bg-ink-faint" };
const KIND_ICON = { audio: FileAudio, video: FileVideo, other: FileText } as const;

export default async function AdminMediaLibraryPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: Params }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.md");
  const base = `/${locale}/admin/settings/media`;
  const tab = searchParams.tab === "settings" ? "settings" : "library";

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "library", label: t("tabLibrary") },
        { value: "settings", label: t("tabSettings") },
      ]}
      hrefFor={(v) => (v === "library" ? base : `${base}?tab=${v}`)}
    />
  );

  if (tab === "settings") {
    const settings = await getMediaSettings();
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        <MediaSettingsPanel initial={settings} />
      </div>
    );
  }

  const kind = MEDIA_KINDS.includes(searchParams.kind as MediaKind) ? (searchParams.kind as MediaKind) : undefined;
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ kind, q, page: page > 1 ? String(page) : undefined, id: searchParams.id, ...next })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  let library: Awaited<ReturnType<typeof getMediaLibrary>> | null = null;
  try {
    library = await getMediaLibrary({ kind, q, page });
  } catch (err) {
    console.error("[admin/media]", err);
  }
  const detail = searchParams.id ? await getMediaDetail(locale, searchParams.id).catch(() => null) : null;
  const totalBytes = library?.usage.reduce((s, u) => s + u.bytes, 0) ?? 0;
  const totalFiles = library?.usage.reduce((s, u) => s + u.files, 0) ?? 0;

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />

      {!library ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <section aria-labelledby="storage-heading" className="mb-6 rounded-lg border border-line bg-raised p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="storage-heading" className="section-title">{t("storage")}</h2>
              <span className="text-sm tabular-nums text-ink-muted">{t("storageTotal", { size: formatBytes(totalBytes), count: totalFiles })}</span>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-elevated" aria-hidden>
              {library.usage.map((u) => (
                <span key={u.kind} className={KIND_BAR[u.kind]} style={{ width: `${totalBytes ? (u.bytes / totalBytes) * 100 : 0}%` }} />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
              {library.usage.map((u) => (
                <li key={u.kind} className="flex items-center gap-1.5 tabular-nums">
                  <span className={cn("h-2 w-2 rounded-full", KIND_BAR[u.kind])} aria-hidden />
                  {t(`kind.${u.kind}`)}: {formatBytes(u.bytes)} · {u.files}
                </li>
              ))}
            </ul>
          </section>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <ChipTabs
              label={t("type")}
              value={kind ?? ""}
              options={[{ value: "", label: t("all") }, ...MEDIA_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))]}
              hrefFor={(v) => href({ kind: v || undefined, page: undefined, id: undefined })}
            />
            <form method="get" action={base} className="w-full max-w-xs">
              {kind && <input type="hidden" name="kind" value={kind} />}
              <SearchField label={t("search")} name="q" defaultValue={q} />
            </form>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {library.items.length === 0 ? (
                <EmptyState icon={ImageOff} title={t("emptyTitle")} description={t("emptyText")} />
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {library.items.map((f) => {
                    const isImage = f.mimeType.startsWith("image/");
                    const k: MediaKind = isImage ? "image" : f.mimeType.startsWith("audio/") ? "audio" : f.mimeType.startsWith("video/") ? "video" : "other";
                    const Icon = k === "image" ? FileText : KIND_ICON[k];
                    const selected = f.id === searchParams.id;
                    return (
                      <li key={f.id}>
                        <Link
                          href={href({ id: f.id })}
                          aria-current={selected ? "true" : undefined}
                          className={cn(
                            "block overflow-hidden rounded-lg border bg-raised transition-colors duration-fast",
                            selected ? "border-violet ring-1 ring-violet" : "border-line hover:border-line-control"
                          )}
                        >
                          <span className="relative flex aspect-square items-center justify-center bg-elevated">
                            {isImage ? (
                              <SafeImage src={f.publicUrl} alt="" fill className="object-cover" sizes="200px" />
                            ) : (
                              <Icon className="h-8 w-8 text-ink-faint" aria-hidden />
                            )}
                          </span>
                          <span className="block truncate px-2.5 pt-2 text-xs font-medium text-ink">{f.originalName}</span>
                          <span className="meta block px-2.5 pb-2 tabular-nums">{formatBytes(f.fileSize)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Pagination className="mt-6" page={library.page} pages={library.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined, id: undefined })} />
            </div>

            <aside className="rounded-lg border border-line bg-raised xl:sticky xl:top-6" aria-label={t("detail")}>
              <h2 className="section-title flex h-12 items-center border-b border-line px-4">{t("detail")}</h2>
              {detail ? (
                <div className="space-y-4 p-4">
                  <MediaPreview src={detail.publicUrl} alt={detail.originalName} isImage={detail.mimeType.startsWith("image/")} dimensionsLabel={t("dimensions")} />
                  <dl className="divide-y divide-line text-[13px]">
                    {[
                      [t("size"), formatBytes(detail.fileSize)],
                      [t("format"), detail.mimeType],
                      [t("uploadedBy"), `@${detail.uploadedBy.username}`],
                      [t("uploadedAt"), formatDate(detail.createdAt, locale)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 py-2">
                        <dt className="text-ink-muted">{k}</dt>
                        <dd className="truncate text-right text-ink">{v}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 py-2">
                      <dt className="text-ink-muted">{t("usedIn")}</dt>
                      <dd className="truncate text-right">
                        {detail.usage ? (
                          detail.usage.href ? (
                            <Link href={detail.usage.href} className="link">{detail.usage.label}</Link>
                          ) : (
                            detail.usage.label
                          )
                        ) : (
                          <span className="text-ink-faint">{t("unused")}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="meta text-ink-faint">{t("altNote")}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={detail.publicUrl} label={t("copyUrl")} copiedLabel={t("copied")} />
                    <Button size="sm" variant="ghost" asChild>
                      <a href={detail.publicUrl} target="_blank" rel="noopener noreferrer">{t("open")}</a>
                    </Button>
                    <MediaDeleteButton id={detail.id} name={detail.originalName} usedIn={detail.usage?.label ?? null} redirectTo={href({ id: undefined })} />
                  </div>
                </div>
              ) : (
                <EmptyState className="m-4" title={t("select")} description={t("selectText")} />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
