import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Package, Plus } from "lucide-react";
import type { ModStatus } from "@prisma/client";
import { getAdminMods } from "@/actions/mods";
import { getAllGames } from "@/lib/data";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCompactNumber, formatDate } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { modTone } from "@/lib/status-tones";
import type { Locale } from "@/i18n/config";

const STATUSES: ModStatus[] = ["PUBLISHED", "PENDING", "DRAFT", "REJECTED", "ARCHIVED"];
const SORTS = { updated: "newest", updatedAsc: "updatedAsc", downloads: "downloads", title: "alpha" } as const;
type SortKey = keyof typeof SORTS;

type Params = { q?: string; game?: string; status?: string; sort?: string; dir?: string; page?: string };

export default async function AdminModsPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: Params }) {
  setRequestLocale(locale);
  await requirePagePermission("mods.read");
  const [t, ts] = await Promise.all([getTranslations("admin.mp"), getTranslations("status")]);

  const q = searchParams.q?.trim() || undefined;
  const status = STATUSES.includes(searchParams.status as ModStatus) ? (searchParams.status as ModStatus) : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const sortKey: SortKey = (["updated", "downloads", "title"] as const).includes(searchParams.sort as never)
    ? (searchParams.sort as SortKey)
    : "updated";
  const dir = searchParams.dir === "asc" ? "asc" : "desc";
  const querySort = sortKey === "updated" && dir === "asc" ? "updatedAsc" : SORTS[sortKey];

  const games = await getAllGames().catch(() => []);
  const game = games.find((g) => g.slug === searchParams.game);
  const result = await getAdminMods({ page, search: q, status, gameId: game?.id, sort: querySort, limit: 25 });

  const base = `/${locale}/admin/mods`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    const merged = { q, game: game?.slug, status, sort: sortKey === "updated" ? undefined : sortKey, dir: dir === "desc" ? undefined : dir, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  const priceLabel = (p: string) => (p === "FREE" ? t("free") : p === "PREMIUM" ? t("premium") : t("paid"));

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={result.success ? t("count", { count: result.data.total }) : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/new-sound`}>{t("uploadSound")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`${base}/new`}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("upload")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <form method="get" action={base} className="flex flex-wrap gap-2">
          {game && <input type="hidden" name="game" value={game.slug} />}
          {status && <input type="hidden" name="status" value={status} />}
          <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-sm" />
        </form>
        <ChipTabs
          label={t("games")}
          value={game?.slug ?? ""}
          options={[{ value: "", label: t("allGames") }, ...games.map((g) => ({ value: g.slug, label: g.name }))]}
          hrefFor={(v) => href({ game: v || undefined, page: undefined })}
        />
        <ChipTabs
          label={t("status")}
          value={status ?? ""}
          options={[{ value: "", label: t("allStatus") }, ...STATUSES.map((s) => ({ value: s, label: ts(`mod.${s}`) }))]}
          hrefFor={(v) => href({ status: v || undefined, page: undefined })}
        />
      </div>

      {!result.success ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <DataTable
            caption={t("title")}
            rows={result.data.mods}
            rowKey={(m) => m.id}
            rowHref={(m) => `${base}/${m.id}`}
            sort={{ key: sortKey, dir }}
            sortHref={(key, d) => href({ sort: key === "updated" ? undefined : key, dir: d === "desc" ? undefined : d, page: undefined })}
            empty={<EmptyState icon={Package} title={t("emptyTitle")} description={t("emptyText")} />}
            columns={[
              {
                key: "mod",
                header: t("colMod"),
                width: "minmax(0,2.4fr)",
                sortKey: "title",
                cell: (m) => {
                  const thumb = m.media[0]?.imageUrl ?? m.screenshots[0]?.url ?? null;
                  return (
                    <span className="flex items-center gap-3">
                      <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md bg-elevated">
                        {thumb ? (
                          <SafeImage src={thumb} alt="" fill className="object-cover" sizes="56px" />
                        ) : (
                          <CoverPlaceholder name={m.title} variant="thumb" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{m.title}</span>
                        <span className="block truncate text-xs text-ink-faint">{t("by", { name: formatDisplayName(m.author) })}</span>
                      </span>
                    </span>
                  );
                },
              },
              { key: "game", header: t("colGame"), cell: (m) => <span className="truncate text-ink-muted">{m.game.name}</span>, hideOnMobile: true },
              { key: "status", header: t("colStatus"), width: "130px", cell: (m) => <StatusBadge tone={modTone(m.status)} label={ts(`mod.${m.status}`)} /> },
              {
                key: "price",
                header: t("colPrice"),
                width: "100px",
                hideOnMobile: true,
                cell: (m) => <Badge variant={m.pricing === "FREE" ? "free" : "premium"}>{priceLabel(m.pricing)}</Badge>,
              },
              {
                key: "downloads",
                header: t("colDownloads"),
                width: "100px",
                align: "right",
                sortKey: "downloads",
                hideOnMobile: true,
                cell: (m) => formatCompactNumber(m.downloadCount, locale),
              },
              {
                key: "updated",
                header: t("colUpdated"),
                width: "110px",
                sortKey: "updated",
                hideOnMobile: true,
                cell: (m) => <span className="tabular-nums text-ink-muted">{formatDate(m.updatedAt, locale)}</span>,
              },
              {
                key: "edit",
                header: "",
                width: "90px",
                align: "right",
                cell: () => <span className="relative text-xs font-semibold text-violet-bright">{t("edit")}</span>,
              },
            ]}
          />
          <Pagination className="mt-6" page={result.data.page} pages={result.data.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
