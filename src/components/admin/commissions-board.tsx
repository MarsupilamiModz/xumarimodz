"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { approveCommissionEntries, createCommissionRule, markPayoutPaid, saveAdminPayoutRules, toggleCommissionRule } from "@/actions/admin/commissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate, formatEuro } from "@/lib/format-locale";

type Entry = { id: string; name: string; source: string; amountCents: number; createdAt: string; eligible: boolean; heldUntil: string };

function useRun() {
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const run = <T,>(action: () => Promise<{ success: true; data: T } | { success: false; error: string }>, message: (data: T) => string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      after?.();
      appToast.updated(message(r.data));
      router.refresh();
    });
  return { pending, run };
}

export function CommissionEntries({ locale, entries }: { locale: string; entries: Entry[] }) {
  const t = useTranslations("admin.cm");
  const { pending, run } = useRun();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const eligibleIds = useMemo(() => entries.filter((e) => e.eligible).map((e) => e.id), [entries]);
  const total = entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + e.amountCents, 0);
  const allEligible = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  return (
    <section className="rounded-lg border border-line bg-raised" aria-labelledby="cm-entries">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 id="cm-entries" className="section-title">{t("entries")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox checked={allEligible} disabled={eligibleIds.length === 0} onCheckedChange={(v) => setSelected(v ? new Set(eligibleIds) : new Set())} label={t("selectAll")} />
          <span className="text-xs tabular-nums text-ink-muted" aria-live="polite">{t("selected", { count: selected.size, amount: formatEuro(total, locale) })}</span>
          <Button size="sm" disabled={pending || selected.size === 0} onClick={() => setConfirm(true)}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("approve")}
          </Button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("noEntries")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <caption className="sr-only">{t("entries")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th scope="col" className="w-10 px-4 py-2"><span className="sr-only">{t("colSelect")}</span></th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colRecipient")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colSource")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{t("colAmount")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colDate")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colState")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-row-hover">
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selected.has(e.id)}
                      disabled={!e.eligible}
                      aria-label={t("selectEntry", { amount: formatEuro(e.amountCents, locale), name: e.name })}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(e.id);
                          else next.delete(e.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-ink">{e.name}</td>
                  <td className="px-4 py-2 text-ink-muted">{t(`src.${e.source}`)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink">{formatEuro(e.amountCents, locale)}</td>
                  <td className="px-4 py-2 tabular-nums text-ink-muted">{formatDate(e.createdAt, locale)}</td>
                  <td className="px-4 py-2 text-xs">
                    {e.eligible ? <span className="text-success">{t("ready")}</span> : <span className="text-ink-faint">{t("inHoldback", { date: formatDate(e.heldUntil, locale) })}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("approveTitle", { count: selected.size })}
        description={t("approveText")}
        confirmLabel={t("approve")}
        loading={pending}
        onConfirm={() =>
          run(
            () => approveCommissionEntries(Array.from(selected)),
            (d) => t("approved", { payouts: d.payouts, held: d.held, below: d.belowMinimum }),
            () => {
              setConfirm(false);
              setSelected(new Set());
            }
          )
        }
      />
    </section>
  );
}

export function MarkPaidButton({ id, name, amount }: { id: string; name: string; amount: string }) {
  const t = useTranslations("admin.cm");
  const uid = useId();
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        {t("markPaid")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("markPaidTitle", { name, amount })}
        description={t("markPaidText")}
        confirmLabel={t("markPaid")}
        loading={pending}
        onConfirm={() => run(() => markPayoutPaid(id, reference.trim() || undefined), () => t("paid"), () => setOpen(false))}
      >
        <label htmlFor={`${uid}-ref`} className="label-text mb-1.5 block text-ink-muted">{t("reference")}</label>
        <Input id={`${uid}-ref`} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
      </ConfirmDialog>
    </>
  );
}

export function PayoutRulesForm({ initial }: { initial: { minPayoutCents: number; payoutDay: number; holdbackDays: number } }) {
  const t = useTranslations("admin.cm");
  const uid = useId();
  const { pending, run } = useRun();
  const [rules, setRules] = useState({ min: initial.minPayoutCents / 100, day: initial.payoutDay, hold: initial.holdbackDays });
  const dirty = rules.min * 100 !== initial.minPayoutCents || rules.day !== initial.payoutDay || rules.hold !== initial.holdbackDays;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAdminPayoutRules({ minPayoutCents: Math.round(rules.min * 100), payoutDay: rules.day, holdbackDays: rules.hold }), () => t("rulesSaved"));
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor={`${uid}-min`} className="label-text mb-1.5 block text-ink-muted">{t("minPayout")}</label>
          <Input id={`${uid}-min`} type="number" min={0} step="0.01" value={rules.min} onChange={(e) => setRules((r) => ({ ...r, min: Number(e.target.value) }))} className="tabular-nums" />
        </div>
        <div>
          <label htmlFor={`${uid}-day`} className="label-text mb-1.5 block text-ink-muted">{t("payoutDay")}</label>
          <Input id={`${uid}-day`} type="number" min={1} max={28} value={rules.day} onChange={(e) => setRules((r) => ({ ...r, day: Number(e.target.value) }))} className="tabular-nums" />
        </div>
        <div>
          <label htmlFor={`${uid}-hold`} className="label-text mb-1.5 block text-ink-muted">{t("holdback")}</label>
          <Input id={`${uid}-hold`} type="number" min={0} max={180} value={rules.hold} onChange={(e) => setRules((r) => ({ ...r, hold: Number(e.target.value) }))} className="tabular-nums" />
        </div>
      </div>
      <p className="meta">{t("payoutDayHint")}</p>
      <Button type="submit" size="sm" disabled={pending || !dirty}>
        {t("saveRules")}
      </Button>
    </form>
  );
}

export function RuleToggle({ id, name, active }: { id: string; name: string; active: boolean }) {
  const t = useTranslations("admin.cm");
  const { pending, run } = useRun();
  return (
    <Switch
      aria-label={t("ruleToggle", { name })}
      checked={active}
      disabled={pending}
      onCheckedChange={(v) => run(() => toggleCommissionRule(id, v), () => t("updated"))}
    />
  );
}

const SOURCES = ["MOD_SALE", "SUBSCRIPTION", "REFERRAL", "COUPON", "CUSTOM_ORDER", "BONUS"] as const;

export function NewRuleForm() {
  const t = useTranslations("admin.cm");
  const tr = useTranslations("status.role");
  const uid = useId();
  const { pending, run } = useRun();
  const [rule, setRule] = useState({ name: "", type: "PERCENT" as "PERCENT" | "FIXED" | "RECURRING", value: 10, source: "MOD_SALE" as (typeof SOURCES)[number], target: "PARTNER" as "CREATOR" | "PARTNER" | "DESIGNER" });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => createCommissionRule({ name: rule.name.trim(), type: rule.type, value: Math.round(rule.value), source: rule.source, targetRole: rule.target }),
          () => t("created"),
          () => setRule((r) => ({ ...r, name: "" }))
        );
      }}
    >
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-name`} className="label-text mb-1.5 block text-ink-muted">{t("ruleName")}</label>
        <Input id={`${uid}-name`} value={rule.name} onChange={(e) => setRule((r) => ({ ...r, name: e.target.value }))} required minLength={2} maxLength={120} />
      </div>
      <div>
        <label htmlFor={`${uid}-type`} className="label-text mb-1.5 block text-ink-muted">{t("ruleType")}</label>
        <Select value={rule.type} onValueChange={(v) => setRule((r) => ({ ...r, type: v as typeof rule.type }))}>
          <SelectTrigger id={`${uid}-type`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["PERCENT", "FIXED", "RECURRING"] as const).map((v) => <SelectItem key={v} value={v}>{t(`rt.${v}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor={`${uid}-value`} className="label-text mb-1.5 block text-ink-muted">{t("ruleValue")}</label>
        <Input id={`${uid}-value`} type="number" min={0} value={rule.value} onChange={(e) => setRule((r) => ({ ...r, value: Number(e.target.value) }))} className="tabular-nums" />
      </div>
      <div>
        <label htmlFor={`${uid}-src`} className="label-text mb-1.5 block text-ink-muted">{t("ruleSource")}</label>
        <Select value={rule.source} onValueChange={(v) => setRule((r) => ({ ...r, source: v as typeof rule.source }))}>
          <SelectTrigger id={`${uid}-src`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((v) => <SelectItem key={v} value={v}>{t(`src.${v}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor={`${uid}-target`} className="label-text mb-1.5 block text-ink-muted">{t("ruleTarget")}</label>
        <Select value={rule.target} onValueChange={(v) => setRule((r) => ({ ...r, target: v as typeof rule.target }))}>
          <SelectTrigger id={`${uid}-target`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["PARTNER", "CREATOR", "DESIGNER"] as const).map((v) => <SelectItem key={v} value={v}>{tr(v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending || rule.name.trim().length < 2}>{t("create")}</Button>
      </div>
    </form>
  );
}
