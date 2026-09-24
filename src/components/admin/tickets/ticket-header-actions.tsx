"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { claimTicket, escalateTicket } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";

/** „Übernehmen“ und „Eskalieren“ oben rechts im Ticket. */
export function TicketHeaderActions({
  ticketId,
  canClaim,
  canEscalate,
}: {
  ticketId: string;
  canClaim: boolean;
  canEscalate: boolean;
}) {
  const t = useTranslations("admin.tk");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [confirmEscalate, setConfirmEscalate] = useState(false);

  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) {
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
  }

  return (
    <>
      {canClaim && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => claimTicket(ticketId), t("claimed"))}>
          {t("claim")}
        </Button>
      )}
      {canEscalate && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmEscalate(true)}>
          {t("escalate")}
        </Button>
      )}
      <ConfirmDialog
        open={confirmEscalate}
        onOpenChange={setConfirmEscalate}
        title={t("escalateTitle")}
        description={t("escalateText")}
        confirmLabel={t("escalate")}
        loading={pending}
        onConfirm={() => run(() => escalateTicket(ticketId), t("escalated"), () => setConfirmEscalate(false))}
      />
    </>
  );
}
