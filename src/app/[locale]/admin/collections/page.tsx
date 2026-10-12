import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Layers } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { getCollectionItemsAdmin, listCollectionsAdmin } from "@/actions/admin/collections";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { CollectionEditor } from "@/components/admin/collection-editor";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SafeImage } from "@/components/ui/safe-image";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type Params = { q?: string; page?: string; id?: string };

export default async function AdminCollectionsPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.co");
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const base = `/${locale}/admin/collections`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, page: page > 1 ? String(page) : undefined, id: searchParams.id, ...next })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  const result = await listCollectionsAdmin({ page, search: q });
  const selected = result.success ? result.data.items.find((c) => c.id === searchParams.id) : undefined;
  const items = selected ? await getCollectionItemsAdmin(selected.id) : null;

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {!result.success ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-w-0 space-y-4">
            <form method="get" action={base}>
              <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-sm" />
            </form>
            {result.data.items.length === 0 ? (
              <EmptyState icon={Layers} title={t("emptyTitle")} description={t("emptyText")} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {result.data.items.map((c) => {
                  const active = c.id === selected?.id;
                  return (
                    <li key={c.id}>
                      <Link
                        href={href({ id: c.id })}
                        aria-current={active ? "true" : undefined}
                        className={cn("block overflow-hidden rounded-lg border bg-raised transition-colors duration-fast", active ? "border-violet ring-1 ring-violet" : "border-line hover:border-line-control")}
                      >
                        <span className="relative block aspect-[16/7] bg-elevated">
                          {c.coverUrl ? <SafeImage src={c.coverUrl} alt="" fill className="object-cover" sizes="360px" /> : <CoverPlaceholder name={c.title} />}
                        </span>
                        <span className="block p-3">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink">{c.title}</span>
                            <StatusBadge
                              tone={c.moderationStatus === "APPROVED" ? "success" : c.moderationStatus === "PENDING" ? "warning" : c.moderationStatus === "REJECTED" ? "danger" : "neutral"}
                              label={t(`status.${c.moderationStatus}`)}
                            />
                          </span>
                          <span className="meta mt-1 block truncate">
                            {t("by", { name: formatDisplayName(c.owner) })} · {t("mods", { count: c._count.items })} · {t("followers", { count: c._count.followers })}
                          </span>
                          <span className="meta block">{t(`vis.${c.visibility}`)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Pagination page={result.data.page} pages={Math.max(1, result.data.pages)} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined, id: undefined })} />
          </div>

          <aside className="rounded-lg border border-line bg-raised xl:sticky xl:top-6" aria-label={t("editor")}>
            <h2 className="section-title flex h-12 items-center border-b border-line px-4">{selected ? selected.title : t("editor")}</h2>
            {selected && items?.success ? (
              <CollectionEditor
                key={selected.id}
                collectionId={selected.id}
                redirectTo={href({ id: undefined })}
                initialMeta={{
                  title: selected.title,
                  description: selected.description ?? "",
                  visibility: selected.visibility,
                  moderationStatus: selected.moderationStatus,
                }}
                initialItems={items.data}
              />
            ) : (
              <EmptyState className="m-4" title={t("selectTitle")} description={t("selectText")} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
