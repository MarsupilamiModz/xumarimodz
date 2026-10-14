"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImageOff } from "lucide-react";
import { bulkMediaAction, type BulkMediaAction, type MediaSection } from "@/actions/admin/media-center";
import {
  adminRepairAllMedia,
  adminScanMissingMedia,
} from "@/actions/admin/media-repair";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { SearchField } from "@/components/ui/search-field";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";

const SECTIONS: MediaSection[] = [
  "mods",
  "sounds",
  "collections",
  "screenshots",
  "avatars",
  "banners",
  "videos",
  "files",
  "downloads",
  "modpacks",
];

/** Scan-Status (enum FileScanStatus) → Ton des StatusBadge; Texte unter admin.panelScanStatus. */
const SCAN_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  SCANNING: "pending",
  MANUAL_REVIEW: "pending",
  CLEAN: "success",
  APPROVED: "success",
  SUSPICIOUS: "warning",
  FAILED: "warning",
  MALWARE: "danger",
  REJECTED: "danger",
};

type Props = {
  locale: string;
  section: MediaSection;
  items: unknown[];
  total: number;
  page: number;
  pages: number;
};

type Row = { id: string; title: string; meta: string; href: string | null; scanStatus: string | null };

function itemId(raw: unknown): string {
  return String((raw as Record<string, unknown>).id);
}

export function MediaCenterPanel({ locale, section, items, total, page, pages }: Props) {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.panelMediaCenter");
  const tScan = useTranslations("admin.panelScanStatus");
  const tMod = useTranslations("status.mod");
  const appToast = useAppToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [repairResult, setRepairResult] = useState<string | null>(null);
  const [gameId, setGameId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [confirmAction, setConfirmAction] = useState<BulkMediaAction | null>(null);

  const pageIds = useMemo(() => items.map(itemId), [items]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllOnPage = () => setSelected(pageIds);
  const clearSelection = () => setSelected([]);

  const runBulk = (action: BulkMediaAction) => {
    if (!selected.length) return;
    startTransition(async () => {
      const r = await bulkMediaAction({
        section,
        ids: selected,
        action,
        gameId: action === "changeGame" ? gameId.trim() || undefined : undefined,
        ownerId: action === "changeOwner" ? ownerId.trim() || undefined : undefined,
      });
      if (r.success) {
        appToast.saved();
        setSelected([]);
        setConfirmAction(null);
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const requestBulk = (action: BulkMediaAction) => {
    if (selected.length) setConfirmAction(action);
  };

  const modStatus = (s: unknown) => (tMod.has(String(s)) ? tMod(String(s)) : String(s));

  const rows: Row[] = items.map((raw) => {
    const item = raw as Record<string, unknown>;
    const id = itemId(raw);
    let title = "—";
    let meta = "";
    let href: string | null = null;
    let scanStatus: string | null = null;

    if (section === "mods" || section === "sounds") {
      title = String(item.title);
      meta = `${(item.game as { name: string })?.name ?? ""} · @${(item.author as { username: string })?.username ?? ""} · ${modStatus(item.status)}`;
      href = `/${locale}/admin/mods/${id}`;
      const primary = (item.versions as { scanStatus: string }[])?.[0];
      scanStatus = primary?.scanStatus ?? null;
    } else if (section === "collections") {
      title = String(item.title);
      meta = `@${(item.owner as { username: string })?.username ?? ""} · ${tp("itemsCount", { count: (item._count as { items: number })?.items ?? 0 })}`;
    } else if (section === "screenshots") {
      const mod = item.mod as { title: string; id: string };
      title = mod?.title ?? id;
      meta = item.imageUrl ? String(item.imageUrl).slice(0, 48) : tp("screenshot");
      href = mod ? `/${locale}/admin/mods/${mod.id}` : null;
    } else if (section === "avatars" || section === "banners" || section === "files") {
      title = String(item.originalName ?? item.fileName ?? id);
      meta = `@${(item.uploadedBy as { username: string })?.username ?? "—"} · ${item.entityType ? String(item.entityType) : tp("file")}`;
    } else if (section === "videos") {
      const mod = item.mod as { title: string; id: string };
      title = mod?.title ?? id;
      meta = tp("video");
      href = mod ? `/${locale}/admin/mods/${mod.id}` : null;
    } else if (section === "downloads") {
      const mod = (item.version as { mod: { title: string; slug: string } })?.mod;
      title = mod?.title ?? id;
      const user = (item.user as { username: string })?.username;
      meta = user ? `@${user}` : tp("guest");
    }
    return { id, title, meta, href, scanStatus };
  });

  const columns: DataColumn<Row>[] = [
    {
      key: "select",
      header: "",
      width: "40px",
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={tp("selectItem", { title: row.title })}
          checked={selected.includes(row.id)}
          onChange={() => toggle(row.id)}
        />
      ),
    },
    { key: "title", header: t("mediaItem"), width: "minmax(0,2fr)", cell: (row) => <span className="font-medium text-ink">{row.title}</span> },
    { key: "meta", header: t("mediaMeta"), width: "minmax(0,2fr)", hideOnMobile: true, cell: (row) => <span className="meta break-all">{row.meta}</span> },
    {
      key: "security",
      header: t("mediaSecurity"),
      width: "minmax(0,1.4fr)",
      cell: (row) =>
        row.scanStatus ? (
          <StatusBadge
            tone={SCAN_STATUS_TONE[row.scanStatus] ?? "neutral"}
            label={tScan.has(row.scanStatus) ? tScan(row.scanStatus) : row.scanStatus}
          />
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: "action",
      header: tp("colAction"),
      width: "110px",
      align: "right",
      cell: (row) =>
        row.href ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={row.href}>{t("editMod")}</Link>
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <p className="meta tabular-nums">{t("mediaCenterHint", { count: formatNumber(total, locale) })}</p>

      <ChipTabs
        label={tp("sectionsLabel")}
        value={section}
        options={SECTIONS.map((s) => ({ value: s, label: tp(`section.${s}`) }))}
        hrefFor={(s) => `/${locale}/admin/media?section=${s}`}
      />

      <SectionCard title={t("mediaRepair")} description={t("mediaRepairHint")}>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await adminScanMissingMedia();
                if (r.success) setRepairResult(t("mediaScanResult", { count: r.data.count }));
                else appToast.error(r.error);
              })
            }
          >
            {t("mediaScanMissing")}
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await adminRepairAllMedia();
                if (r.success) {
                  setRepairResult(
                    t("mediaRepairResult", {
                      repaired: r.data.totalRepaired,
                      scanned: r.data.totalScanned,
                    })
                  );
                  appToast.saved();
                  router.refresh();
                } else appToast.error(r.error);
              })
            }
          >
            {t("mediaRepairAll")}
          </Button>
        </div>
        {repairResult && (
          <p role="status" className="mt-3 text-sm text-ink-muted">
            {repairResult}
          </p>
        )}
      </SectionCard>

      <SectionCard title={tp("bulkTitle")}>
        <div className="space-y-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/${locale}/admin/media?section=${section}&q=${encodeURIComponent(q)}`);
            }}
          >
            <SearchField
              label={t("searchPlaceholder")}
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full max-w-xs"
            />
            <Button type="submit" variant="outline" size="sm">
              {tp("search")}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                disabled={!pageIds.length}
                onChange={() => (allOnPageSelected ? clearSelection() : selectAllOnPage())}
              />
              {t("mediaSelectAll")}
            </label>
            <Button size="sm" variant="ghost" disabled={!selected.length} onClick={clearSelection}>
              {t("mediaClearSelection")}
            </Button>
            {selected.length > 0 && (
              <span className="meta tabular-nums" role="status">{t("mediaSelectedCount", { count: selected.length })}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending || !selected.length} onClick={() => requestBulk("approve")}>
              {t("mediaApprove")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending || !selected.length} onClick={() => requestBulk("reject")}>
              {t("mediaReject")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending || !selected.length} onClick={() => requestBulk("feature")}>
              {t("featured")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending || !selected.length} onClick={() => requestBulk("archive")}>
              {t("mediaArchive")}
            </Button>
            <Button size="sm" variant="destructive" disabled={pending || !selected.length} onClick={() => requestBulk("delete")}>
              {t("mediaDelete")}
            </Button>
          </div>

          {(section === "mods" || section === "sounds" || section === "collections") && (
            <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
              <div className="space-y-1.5">
                <label htmlFor="media-game-id" className="label-text">{t("mediaGameIdPlaceholder")}</label>
                <div className="flex gap-2">
                  <Input id="media-game-id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="mono-id w-56" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || !selected.length || !gameId.trim()}
                    onClick={() => requestBulk("changeGame")}
                  >
                    {t("mediaChangeGame")}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="media-owner-id" className="label-text">{t("mediaOwnerIdPlaceholder")}</label>
                <div className="flex gap-2">
                  <Input id="media-owner-id" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mono-id w-56" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || !selected.length || !ownerId.trim()}
                    onClick={() => requestBulk("changeOwner")}
                  >
                    {t("mediaChangeOwner")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <DataTable
        caption={tp(`section.${section}`)}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={ImageOff} title={t("mediaEmpty")} />}
      />

      <Pagination page={page} pages={pages} hrefFor={(p) => `/${locale}/admin/media?section=${section}&page=${p}`} />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={tp("confirmTitle")}
        description={
          confirmAction
            ? t("mediaBulkConfirm", { count: selected.length, action: t(`mediaBulkAction.${confirmAction}`) })
            : ""
        }
        variant={confirmAction === "delete" ? "destructive" : "default"}
        loading={pending}
        onConfirm={() => {
          if (confirmAction) runBulk(confirmAction);
        }}
      />
    </div>
  );
}
