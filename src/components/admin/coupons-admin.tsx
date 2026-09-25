"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Ticket } from "lucide-react";
import { createCoupon, deleteCoupon, toggleCoupon } from "@/actions/admin/coupons";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate, formatEuro } from "@/lib/format-locale";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number | null;
  usedCount: number;
  revenueCents: number;
  expiresAt: string | null;
  isActive: boolean;
  owner: string | null;
};

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

function DeleteCoupon({ id, code }: { id: string; code: string }) {
  const t = useTranslations("admin.cp");
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>{t("delete")}</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("deleteTitle", { code })}
        description={t("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => deleteCoupon(id), t("deleted"), () => setOpen(false))}
      />
    </>
  );
}

export function CouponsAdmin({ locale, coupons }: { locale: string; coupons: Coupon[] }) {
  const t = useTranslations("admin.cp");
  const uid = useId();
  const { pending, run } = useRun();
  const [form, setForm] = useState({ code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: 10, maxUses: "", expiresAt: "" });
  const now = Date.now();

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded-lg border border-line bg-raised">
        {coupons.length === 0 ? (
          <EmptyState className="m-4" icon={Ticket} title={t("emptyTitle")} description={t("emptyText")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <caption className="sr-only">{t("title")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("colCode")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colDiscount")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colUses")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colRevenue")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colExpires")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colActive")}</th>
                  <th scope="col" className="px-4 py-2"><span className="sr-only">{t("delete")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {coupons.map((c) => {
                  const expired = !!c.expiresAt && new Date(c.expiresAt).getTime() < now;
                  return (
                    <tr key={c.id} className="hover:bg-row-hover">
                      <td className="px-4 py-2">
                        <span className="mono-id text-ink">{c.code}</span>
                        {c.owner && <span className="meta block">{t("colOwner")}: @{c.owner}</span>}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-ink-muted">{c.type === "PERCENT" ? `${c.value} %` : formatEuro(c.value, locale)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-muted">
                        {c.usedCount} / {c.maxUses ?? t("unlimited")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-muted">{formatEuro(c.revenueCents, locale)}</td>
                      <td className="px-4 py-2 tabular-nums text-ink-muted">
                        {c.expiresAt ? (expired ? <span className="text-warning">{t("expired")}</span> : formatDate(c.expiresAt, locale)) : t("never")}
                      </td>
                      <td className="px-4 py-2">
                        <Switch aria-label={t("toggle", { code: c.code })} checked={c.isActive} disabled={pending} onCheckedChange={(v) => run(() => toggleCoupon(c.id, v), t("updated"))} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DeleteCoupon id={c.id} code={c.code} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-new`}>
        <h2 id={`${uid}-new`} className="section-title mb-4">{t("new")}</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                createCoupon({
                  code: form.code.trim(),
                  type: form.type,
                  value: Math.round(form.value),
                  maxUses: form.maxUses ? Number(form.maxUses) : undefined,
                  expiresAt: form.expiresAt || undefined,
                }),
              t("created"),
              () => setForm((f) => ({ ...f, code: "", maxUses: "", expiresAt: "" }))
            );
          }}
        >
          <div>
            <label htmlFor={`${uid}-code`} className="label-text mb-1.5 block text-ink-muted">{t("code")}</label>
            <Input id={`${uid}-code`} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required minLength={3} maxLength={40} className="font-mono uppercase" />
          </div>
          <ChipTabs
            label={t("type")}
            value={form.type}
            options={[
              { value: "PERCENT", label: t("percent") },
              { value: "FIXED", label: t("fixed") },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENT" | "FIXED" }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-value`} className="label-text mb-1.5 block text-ink-muted">{t("value")}</label>
              <Input id={`${uid}-value`} type="number" min={1} max={form.type === "PERCENT" ? 100 : undefined} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} className="tabular-nums" />
            </div>
            <div>
              <label htmlFor={`${uid}-max`} className="label-text mb-1.5 block text-ink-muted">{t("maxUses")}</label>
              <Input id={`${uid}-max`} type="number" min={1} value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} className="tabular-nums" />
            </div>
          </div>
          <div>
            <label htmlFor={`${uid}-exp`} className="label-text mb-1.5 block text-ink-muted">{t("expiresAt")}</label>
            <Input id={`${uid}-exp`} type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          <Button type="submit" disabled={pending || form.code.trim().length < 3}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("create")}
          </Button>
        </form>
      </section>
    </div>
  );
}
