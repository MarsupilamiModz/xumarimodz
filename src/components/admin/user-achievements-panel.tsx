"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import {
  grantAchievementToUser,
  revokeAchievementFromUser,
  getAdminAchievements,
} from "@/actions/admin/achievements";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate } from "@/lib/format-locale";
import type { AchievementRarity } from "@prisma/client";

type UserAchievementRow = {
  id: string;
  unlockedAt: Date;
  isShowcased: boolean;
  grantedBy: { username: string; displayName: string | null } | null;
  achievement: {
    id: string;
    name: string;
    slug: string;
    rarity: AchievementRarity;
    icon: string | null;
    category: string;
    isHidden: boolean;
  };
};

type AchievementOption = Extract<
  Awaited<ReturnType<typeof getAdminAchievements>>,
  { success: true }
>["data"][number];

export function UserAchievementsPanel({
  userId,
  initialAchievements,
  allAchievements,
}: {
  userId: string;
  initialAchievements: UserAchievementRow[];
  allAchievements: AchievementOption[];
}) {
  const t = useTranslations("admin.userAchievements");
  const tr = useTranslations("admin.ac");
  const locale = useLocale();
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [selectedGrant, setSelectedGrant] = useState("");
  const [revoking, setRevoking] = useState<UserAchievementRow | null>(null);

  const ownedIds = new Set(initialAchievements.map((a) => a.achievement.id));
  const available = allAchievements.filter((a) => !ownedIds.has(a.id));

  const revoke = () => {
    if (!revoking) return;
    startTransition(async () => {
      const r = await revokeAchievementFromUser(userId, revoking.achievement.id);
      if (r.success) {
        appToast.saved();
        setRevoking(null);
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  return (
    <SectionCard
      title={t("title")}
      action={<span className="meta tabular-nums">{t("earned", { count: initialAchievements.length })}</span>}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <label htmlFor={`grant-achievement-${userId}`} className="label-text">{t("grantLabel")}</label>
          <select
            id={`grant-achievement-${userId}`}
            value={selectedGrant}
            onChange={(e) => setSelectedGrant(e.target.value)}
            className="h-9 w-full rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
          >
            <option value="">{t("choose")}</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({tr(`rar.${a.rarity}`)}{a.isHidden ? `, ${t("hidden")}` : ""})
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          disabled={pending || !selectedGrant}
          onClick={() =>
            startTransition(async () => {
              const r = await grantAchievementToUser(userId, selectedGrant);
              if (r.success) {
                appToast.saved();
                setSelectedGrant("");
                router.refresh();
              } else appToast.error(r.error);
            })
          }
        >
          {t("grant")}
        </Button>
      </div>

      {initialAchievements.length === 0 ? (
        <EmptyState icon={Trophy} title={t("emptyTitle")} description={t("emptyText")} className="mt-4 py-8" />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {initialAchievements.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <AchievementBadge
                  name={row.achievement.name}
                  icon={row.achievement.icon}
                  rarity={row.achievement.rarity}
                  animated={false}
                  glowEffect={false}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{row.achievement.name}</p>
                  <p className="meta">
                    {tr(`rar.${row.achievement.rarity}`)} · {formatDate(row.unlockedAt, locale)}
                    {row.grantedBy && ` · ${t("grantedBy", { username: row.grantedBy.username })}`}
                    {row.isShowcased && ` · ${t("showcased")}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                className="shrink-0 text-danger"
                onClick={() => setRevoking(row)}
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t("removeTitle", { name: revoking?.achievement.name ?? "" })}
        description={t("removeText")}
        confirmLabel={t("remove")}
        variant="destructive"
        loading={pending}
        onConfirm={revoke}
      />
    </SectionCard>
  );
}
