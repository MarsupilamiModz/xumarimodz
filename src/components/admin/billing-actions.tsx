"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { adminCancelMembership, adminExtendMembership, adminRefundPurchase } from "@/actions/admin/user-membership";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";

const EXTEND_OPTIONS = [7, 30, 90, 365];

function useRun() {
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, after: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      after();
      appToast.updated(message);
      router.refresh();
    });
  return { pending, run };
}

/** Verlängern / Kündigen einer laufenden Mitgliedschaft, jeweils mit Bestätigung. */
export function SubscriptionActions({
  userId,
  username,
  viaStripe,
  cancelling,
}: {
  userId: string;
  username: string;
  viaStripe: boolean;
  cancelling: boolean;
}) {
  const t = useTranslations("admin.bi");
  const { pending, run } = useRun();
  const [dialog, setDialog] = useState<"extend" | "cancel" | null>(null);
  const [days, setDays] = useState(30);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog("extend")}>
          {t("extend")}
        </Button>
        {!cancelling && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog("cancel")}>
            {t("cancel")}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "extend"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("extendTitle")}
        description={t("extendText", { username, days })}
        confirmLabel={t("extend")}
        loading={pending}
        onConfirm={() => run(() => adminExtendMembership(userId, days), t("extended"), () => setDialog(null))}
      >
        <ChipTabs
          label={t("extendDays")}
          value={String(days)}
          options={EXTEND_OPTIONS.map((d) => ({ value: String(d), label: t("days", { count: d }) }))}
          onChange={(v) => setDays(Number(v))}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("cancelTitle")}
        description={viaStripe ? t("cancelTextStripe", { username }) : t("cancelTextManual", { username })}
        confirmLabel={t("cancel")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => adminCancelMembership(userId), t("cancelled"), () => setDialog(null))}
      />
    </>
  );
}

/** Erstatten eines Einzelkaufs über Stripe, mit Bestätigung. */
export function RefundAction({
  kind,
  purchaseId,
  username,
  amountLabel,
}: {
  kind: "membership" | "mod";
  purchaseId: string;
  username: string;
  amountLabel: string;
}) {
  const t = useTranslations("admin.bi");
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        {t("refund")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("refundTitle", { amount: amountLabel })}
        description={kind === "membership" ? t("refundTextMembership", { username }) : t("refundTextMod", { username })}
        confirmLabel={t("refund")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => adminRefundPurchase(kind, purchaseId), t("refunded"), () => setOpen(false))}
      />
    </>
  );
}
