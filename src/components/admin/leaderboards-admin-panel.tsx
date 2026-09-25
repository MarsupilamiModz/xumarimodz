"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { hideCreatorOnLeaderboard, pinCreatorOnLeaderboard, resetCreatorRankings, saveAdminLeaderboardWeights } from "@/actions/admin/leaderboards";
import type { LeaderboardWeights } from "@/lib/leaderboards";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/use-app-toast";

function useRun() {
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      after?.();
      appToast.updated(message);
      router.refresh();
    });
  return { pending, run };
}

/** Anheften (mit Dauer) / Lösen / Ausblenden für eine Zeile der Rangliste. */
export function LeaderboardRowActions({ creatorId, name, pinned }: { creatorId: string; name: string; pinned: boolean }) {
  const t = useTranslations("admin.lb");
  const { pending, run } = useRun();
  const [dialog, setDialog] = useState<"pin" | "hide" | null>(null);
  const [days, setDays] = useState("7");
  return (
    <span className="flex justify-end gap-1">
      {pinned ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => pinCreatorOnLeaderboard(creatorId, false), t("done"))}>
          {t("unpin")}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog("pin")}>
          {t("pin")}
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog("hide")}>
        {t("hide")}
      </Button>
      <ConfirmDialog
        open={dialog === "pin"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("pinTitle", { name })}
        description={t("pinText")}
        confirmLabel={t("pin")}
        loading={pending}
        onConfirm={() => run(() => pinCreatorOnLeaderboard(creatorId, true, Number(days)), t("done"), () => setDialog(null))}
      >
        <ChipTabs label={t("pinDays")} value={days} options={["1", "7", "30"].map((d) => ({ value: d, label: t("days", { count: Number(d) }) }))} onChange={setDays} />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "hide"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("hideTitle", { name })}
        description={t("hideText")}
        confirmLabel={t("hide")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => hideCreatorOnLeaderboard(creatorId, true), t("done"), () => setDialog(null))}
      />
    </span>
  );
}

export function UnhideButton({ creatorId }: { creatorId: string }) {
  const t = useTranslations("admin.lb");
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => hideCreatorOnLeaderboard(creatorId, false), t("done"))}>
      {t("unhide")}
    </Button>
  );
}

const WEIGHT_KEYS: (keyof LeaderboardWeights)[] = ["downloads", "revenue", "likes", "reviews", "rating", "growth"];

export function LeaderboardWeightsForm({ initial }: { initial: LeaderboardWeights }) {
  const t = useTranslations("admin.lb");
  const uid = useId();
  const { pending, run } = useRun();
  const [weights, setWeights] = useState(initial);
  const dirty = WEIGHT_KEYS.some((k) => weights[k] !== initial[k]);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAdminLeaderboardWeights(weights), t("saved"));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WEIGHT_KEYS.map((key) => (
          <div key={key}>
            <label htmlFor={`${uid}-${key}`} className="label-text mb-1.5 block text-ink-muted">{t(`w.${key}`)}</label>
            <Input
              id={`${uid}-${key}`}
              type="number"
              min={0}
              max={1000}
              step="any"
              value={weights[key]}
              onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
              className="tabular-nums"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !dirty}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("save")}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => resetCreatorRankings(), t("recalculated"))}>
          {t("recalc")}
        </Button>
      </div>
    </form>
  );
}
