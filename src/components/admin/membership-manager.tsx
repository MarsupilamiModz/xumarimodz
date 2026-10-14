"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  adminAssignMembership,
  adminCancelMembership,
  adminExtendMembership,
  adminResumeMembership,
  adminSetMembershipTier,
} from "@/actions/admin/user-membership";
import { formatMoneyFromCents } from "@/lib/currency";
import type { MembershipTier } from "@prisma/client";
import { formatDate } from "@/lib/format-locale";

type MembershipState = {
  membershipType: MembershipTier;
  status: string;
  planSlug: string | null;
  renewalDate: Date | null;
  cancelDate: Date | null;
  isLifetime: boolean;
  stripeSubscriptionId: string | null;
};

type BillingRow = {
  id: string;
  amountCents: number;
  createdAt: Date;
  stripePaymentId: string | null;
  plan: { name: string };
};

const TIERS: MembershipTier[] = ["FREE", "PREMIUM_LITE", "PREMIUM", "PREMIUM_MAX"];

export function MembershipManager({
  userId,
  locale,
  state,
  plans,
  billingHistory,
}: {
  userId: string;
  locale: string;
  state: MembershipState;
  plans: { id: string; name: string; slug: string; priceCents: number }[];
  billingHistory: BillingRow[];
}) {
  const t = useTranslations("admin.ui.membershipManager");
  const tStatus = useTranslations("admin.ownerUserDetail.membershipStatus");
  const tb = useTranslations("admin.membershipManagerB");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  function run(action: () => Promise<{ success: boolean; error?: string }>, msg: string, done?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (r.success) {
        appToast.updated(msg);
        done?.();
      } else appToast.error(r.error ?? t("failed"));
    });
  }

  const statusTone = state.status === "ACTIVE" ? "success" : state.status === "CANCELED" ? "danger" : "neutral";
  const statusLabel = tStatus.has(state.status) ? tStatus(state.status) : state.status;

  return (
    <SectionCard title={t("heading")} className="lg:col-span-2">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="label-text">{t("currentPlan")}</dt>
          <dd className="mt-1 text-sm font-medium text-ink">{state.planSlug ?? t(`tier.${state.membershipType}`)}</dd>
        </div>
        <div>
          <dt className="label-text">{t("status")}</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            <StatusBadge tone={statusTone} label={statusLabel} />
            {state.isLifetime && <StatusBadge tone="info" label={t("lifetime")} />}
          </dd>
        </div>
        <div>
          <dt className="label-text">{t("renewalDate")}</dt>
          <dd className="mt-1 text-sm tabular-nums text-ink">{state.renewalDate ? formatDate(state.renewalDate, locale) : "—"}</dd>
        </div>
        <div>
          <dt className="label-text">{t("cancelDate")}</dt>
          <dd className="mt-1 text-sm tabular-nums text-ink">{state.cancelDate ? formatDate(state.cancelDate, locale) : "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <div className="space-y-1.5">
          <label htmlFor={`membership-plan-${userId}`} className="label-text">{tb("plan")}</label>
          <select
            id={`membership-plan-${userId}`}
            className="h-9 rounded-md border border-line-control bg-raised px-2 text-sm text-ink"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            <option value="">{t("selectPlan")}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {t("planOption", { name: p.name, price: formatMoneyFromCents(p.priceCents, locale) })}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !selectedPlan}
          onClick={() => run(() => adminAssignMembership(userId, selectedPlan), t("toast.assigned"))}
        >
          {t("assignUpgrade")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => adminExtendMembership(userId, 30), t("toast.extended"))}
        >
          {t("extend30Days")}
        </Button>
        {state.status === "CANCELED" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => adminResumeMembership(userId), t("toast.resumed"))}
          >
            {t("resume")}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setConfirmCancel(true)}>
            {t("cancel")}
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="label-text">{tb("tier")}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={tb("tier")}>
          {TIERS.map((tier) => (
            <Button
              key={tier}
              size="sm"
              variant={state.membershipType === tier ? "secondary" : "ghost"}
              aria-pressed={state.membershipType === tier}
              disabled={pending}
              onClick={() => run(() => adminSetMembershipTier(userId, tier), t("toast.setTo", { tier: t(`tier.${tier}`) }))}
            >
              {t(`tier.${tier}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="label-text mb-2">{t("billingHistory")}</h3>
        {billingHistory.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("noBillingRecords")}</p>
        ) : (
          <ul className="max-h-48 divide-y divide-line overflow-y-auto text-[13px]">
            {billingHistory.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 py-2">
                <span className="text-ink">{row.plan.name}</span>
                <span className="tabular-nums text-ink-muted">
                  {formatMoneyFromCents(row.amountCents, locale)} · {formatDate(row.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={tb("cancelTitle")}
        description={tb("cancelText")}
        confirmLabel={t("cancel")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => adminCancelMembership(userId), t("toast.canceled"), () => setConfirmCancel(false))}
      />
    </SectionCard>
  );
}
