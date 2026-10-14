"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, Users } from "lucide-react";
import { reorderVisibleCreators } from "@/actions/admin/creators";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import type { PublisherLevel } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";

type Row = {
  id: string;
  slug: string;
  sortOrder: number;
  level: PublisherLevel;
  isFeatured: boolean;
  isPublic: boolean;
  isHomepage: boolean;
  isTrending: boolean;
  user: { displayName: string | null; username: string };
};

export function CreatorVisibilityManager({ creators: initial }: { creators: Row[] }) {
  const t = useTranslations("ecosystem");
  const tv = useTranslations("admin.creatorVisibility");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);

  function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next.map((r, i) => ({ ...r, sortOrder: i })));
    startTransition(async () => {
      await reorderVisibleCreators(next.map((r) => r.id));
      appToast.saved();
      router.refresh();
    });
  }

  return (
    <SectionCard title={tv("listTitle")} description={t("visibleCreatorsHint")}>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={tv("emptyTitle")} description={tv("emptyText")} />
      ) : (
        <ol className="space-y-2">
          {rows.map((c, i) => {
            const name = c.user.displayName ?? c.user.username;
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-md border border-line bg-elevated p-2.5">
                <span className="w-6 text-right text-xs tabular-nums text-ink-faint">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={tv("moveUp", { name })}
                    disabled={pending || i === 0}
                    onClick={() => move(c.id, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={tv("moveDown", { name })}
                    disabled={pending || i === rows.length - 1}
                    onClick={() => move(c.id, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{name}</p>
                  <p className="mono-id">/{c.slug}</p>
                </div>
                <CreatorLevelBadge level={c.level} size="xs" />
                <div className="flex flex-wrap justify-end gap-1">
                  {c.isFeatured && <StatusBadge tone="success" label={t("featured")} />}
                  {c.isHomepage && <StatusBadge tone="neutral" label={t("homepage")} />}
                  {c.isTrending && <StatusBadge tone="neutral" label={t("trending")} />}
                  {!c.isPublic && <StatusBadge tone="warning" label={t("hidden")} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
