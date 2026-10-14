"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { reorderGames, deleteGame } from "@/actions/admin/games";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SafeImage } from "@/components/ui/safe-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";

type AdminGame = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  _count: { mods: number; categories: number };
};

export function AdminGamesList({ locale, games: initial }: { locale: string; games: AdminGame[] }) {
  const t = useTranslations("admin.gamesAdmin");
  const [games, setGames] = useState(initial);
  const [deleting, setDeleting] = useState<AdminGame | null>(null);
  const [pending, startTransition] = useTransition();
  const appToast = useAppToast();
  const router = useRouter();

  function move(index: number, direction: -1 | 1) {
    const next = [...games];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const prev = games;
    setGames(next);
    startTransition(async () => {
      const r = await reorderGames(next.map((g) => g.id));
      if (r.success) router.refresh();
      else {
        setGames(prev);
        appToast.error(r.error);
      }
    });
  }

  return (
    <>
      <ul className="space-y-3" aria-label={t("listLabel")}>
        {games.map((g, index) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-raised p-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-elevated">
                <SafeImage
                  src={g.iconUrl ?? g.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{g.name}</p>
                  {!g.isActive && <StatusBadge tone="warning" label={t("hidden")} />}
                  {g.isFeatured && <StatusBadge tone="success" label={t("featured")} />}
                </div>
                <p className="meta tabular-nums">
                  <span className="font-mono">/{g.slug}</span> · {t("meta", {
                    order: g.sortOrder,
                    mods: formatNumber(g._count.mods, locale),
                    categories: formatNumber(g._count.categories, locale),
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="ghost" aria-label={t("moveUp", { name: g.name })} disabled={pending || index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label={t("moveDown", { name: g.name })} disabled={pending || index === games.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/admin/games/${g.id}`}>{t("edit")}</Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-danger"
                disabled={pending || g._count.mods > 0}
                aria-label={g._count.mods > 0 ? t("deleteBlocked", { name: g.name }) : t("delete", { name: g.name })}
                title={g._count.mods > 0 ? t("deleteBlocked", { name: g.name }) : t("delete", { name: g.name })}
                onClick={() => setDeleting(g)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle", { name: deleting?.name ?? "" })}
        description={t("deleteText")}
        confirmLabel={t("deleteConfirm")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const g = deleting;
          startTransition(async () => {
            const r = await deleteGame(g.id);
            if (r.success) {
              setGames((prev) => prev.filter((x) => x.id !== g.id));
              setDeleting(null);
              appToast.deleted();
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </>
  );
}
