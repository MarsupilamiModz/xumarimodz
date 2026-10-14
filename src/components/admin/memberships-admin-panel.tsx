"use client";

import { colors } from "@/styles/tokens";
import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  saveMembershipPlan,
  savePremiumPageSettings,
  deleteMembershipPlan,
  reorderMembershipPlans,
} from "@/actions/admin/memberships";
import { MembershipPlanPreview } from "@/components/admin/membership-plan-preview";
import type { MembershipPlanData, MembershipPerks, PremiumPageSettings, PlanCardStyle } from "@/lib/membership-pricing";
import { formatPlanPrice } from "@/lib/membership-pricing";
import { parseLines, safeFormOptional, safeFormString, safeStripePriceId } from "@/lib/text";
import { cn } from "@/lib/utils";

const DEFAULT_PERKS: MembershipPerks = {
  adFree: false,
  exclusiveMods: false,
  creatorContent: false,
  betaAccess: false,
  discordPerks: false,
  earlyAccess: false,
  prioritySupport: false,
};

type Props = {
  plans: MembershipPlanData[];
  pageSettings: PremiumPageSettings;
  locale: string;
};

type StartTransition = ReturnType<typeof useTransition>[1];

const selectClass = cn(controlClassName, "h-9");

/** Feld mit sichtbarem Label. */
function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
      {hint && <p className="meta">{hint}</p>}
    </div>
  );
}

/** Gruppe im Formular mit Überschrift. */
function FieldGroup({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <fieldset className={cn("rounded-lg border border-line p-4", className)}>
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function MembershipsAdminPanel({ plans: initial, pageSettings: initialPage, locale }: Props) {
  const t = useTranslations("admin.ui.membershipsAdmin");
  const tp = useTranslations("admin.panelMemberships");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [plans, setPlans] = useState(initial);
  const [pageSettings, setPageSettings] = useState(initialPage);
  const [editing, setEditing] = useState<MembershipPlanData | null>(null);
  const [creating, setCreating] = useState(false);
  const [perks, setPerks] = useState<MembershipPerks>(DEFAULT_PERKS);
  const [cardStyle, setCardStyle] = useState<PlanCardStyle>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deletePlan, setDeletePlan] = useState<MembershipPlanData | null>(null);

  const openEdit = (plan: MembershipPlanData) => {
    setCreating(false);
    setEditing(plan);
    setPerks({ ...DEFAULT_PERKS, ...plan.perks });
    setCardStyle(plan.cardStyle ?? { accentColor: plan.perks.accentColor ?? undefined });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setPerks({ ...DEFAULT_PERKS, adFree: true });
    setCardStyle({});
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex == null || dragIndex === targetIndex) return;
    const next = [...plans];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setPlans(next);
    setDragIndex(null);
    startTransition(async () => {
      const r = await reorderMembershipPlans(next.map((p) => p.id));
      if (r.success) router.refresh();
    });
  };

  const movePlan = (index: number, dir: -1 | 1) => {
    const next = [...plans];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlans(next);
    startTransition(async () => {
      const r = await reorderMembershipPlans(next.map((p) => p.id));
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard title={t("pageContent.heading")}>
        <div className="space-y-4">
          <Field id="premium-hero-title" label={tp("heroTitle")}>
            <Input id="premium-hero-title" value={pageSettings.heroTitle} onChange={(e) => setPageSettings((p) => ({ ...p, heroTitle: e.target.value }))} />
          </Field>
          <Field id="premium-hero-subtitle" label={tp("heroSubtitle")}>
            <Textarea id="premium-hero-subtitle" value={pageSettings.heroSubtitle} onChange={(e) => setPageSettings((p) => ({ ...p, heroSubtitle: e.target.value }))} rows={2} />
          </Field>
          <Field id="premium-cta" label={tp("ctaText")}>
            <Input id="premium-cta" value={pageSettings.ctaText} onChange={(e) => setPageSettings((p) => ({ ...p, ctaText: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <Switch checked={pageSettings.showComparison} onCheckedChange={(v) => setPageSettings((p) => ({ ...p, showComparison: v }))} />
            {t("pageContent.showComparison")}
          </label>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await savePremiumPageSettings(pageSettings);
                if (r.success) appToast.saved();
                else appToast.error(r.error);
              })
            }
          >
            {t("pageContent.save")}
          </Button>
        </div>
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{t("plans.heading")}</h2>
        <Button variant="outline" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> {t("plans.newPlan")}
        </Button>
      </div>

      {(creating || editing) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={creating ? t("plans.createPlan") : t("plans.editPlan", { name: editing?.name ?? "" })}>
            <PlanForm
              t={t}
              tp={tp}
              plan={editing ?? undefined}
              isNew={creating}
              perks={perks}
              setPerks={setPerks}
              cardStyle={cardStyle}
              plansLength={plans.length}
              pending={pending}
              startTransition={startTransition}
              appToast={appToast}
              router={router}
              onClose={() => { setEditing(null); setCreating(false); }}
            />
          </SectionCard>
          <div>
            <p className="label-text mb-3">{t("plans.livePreview")}</p>
            <MembershipPlanPreview
              locale={locale}
              plan={{
                ...(editing ?? { slug: "preview", name: tp("previewName"), priceCents: 999, currency: "EUR", features: [], isFeatured: false }),
                perks,
                cardStyle,
                saleDiscountPercent: editing?.saleDiscountPercent ?? null,
                saleEndsAt: editing?.saleEndsAt ?? null,
                originalPriceCents: editing?.originalPriceCents ?? null,
              }}
            />
          </div>
        </div>
      )}

      <ul className="grid gap-6 lg:grid-cols-3" aria-label={t("plans.heading")}>
        {plans.map((plan, index) => (
          <li
            key={plan.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={cn(
              "cursor-grab space-y-3 rounded-lg border bg-raised p-5 active:cursor-grabbing",
              plan.isFeatured ? "border-violet-bright" : "border-line",
              dragIndex === index && "opacity-50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">{plan.name}</h3>
                <p className="text-2xl font-bold tabular-nums text-ink">
                  {formatPlanPrice(plan.priceCents, plan.currency, locale)}
                </p>
                <p className="meta">{t("plans.lifetimeOneTime")}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {plan.isFeatured && <StatusBadge tone="info" label={t("plans.featured")} />}
                {!plan.isActive && <StatusBadge tone="neutral" label={t("plans.inactive")} />}
              </div>
            </div>
            <ul className="space-y-1 text-xs text-ink-muted">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-1.5">
                  <Check className="h-3 w-3 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <p className="mono-id truncate text-ink-muted">{plan.stripePriceId ?? t("plans.noStripePrice")}</p>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>{t("plans.edit")}</Button>
              <Button size="sm" variant="ghost" onClick={() => movePlan(index, -1)} disabled={index === 0} aria-label={tp("moveUp", { name: plan.name })}>
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => movePlan(index, 1)} disabled={index === plans.length - 1} aria-label={tp("moveDown", { name: plan.name })}>
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                disabled={pending}
                onClick={() => setDeletePlan(plan)}
                aria-label={tp("delete", { name: plan.name })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deletePlan !== null}
        onOpenChange={(open) => !open && setDeletePlan(null)}
        title={t("plans.confirmDelete", { name: deletePlan?.name ?? "" })}
        description={tp("deleteConfirmText")}
        confirmLabel={tp("deleteConfirm")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deletePlan) return;
          const id = deletePlan.id;
          startTransition(async () => {
            const r = await deleteMembershipPlan(id);
            if (r.success) {
              setDeletePlan(null);
              appToast.saved();
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}

function PlanForm({
  t,
  tp,
  plan,
  isNew,
  perks,
  setPerks,
  cardStyle,
  plansLength,
  pending,
  startTransition,
  appToast,
  router,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>;
  tp: ReturnType<typeof useTranslations>;
  plan?: MembershipPlanData;
  isNew?: boolean;
  perks: MembershipPerks;
  setPerks: Dispatch<SetStateAction<MembershipPerks>>;
  cardStyle: PlanCardStyle;
  plansLength: number;
  pending: boolean;
  startTransition: StartTransition;
  appToast: ReturnType<typeof useAppToast>;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const downloadLimitRaw = safeFormOptional(fd, "downloadLimit");
        const storageRaw = safeFormOptional(fd, "storageLimitMb");
        const feeRaw = safeFormOptional(fd, "marketplaceFeeBps");

        const nextPerks: MembershipPerks = {
          ...perks,
          downloadLimit: downloadLimitRaw ? Number(downloadLimitRaw) : null,
          storageLimitMb: storageRaw ? Number(storageRaw) : null,
          marketplaceFeeBps: feeRaw ? Number(feeRaw) : undefined,
          customBadge: safeFormOptional(fd, "customBadge") ?? null,
          accentColor: safeFormOptional(fd, "accentColor") ?? null,
        };

        startTransition(async () => {
          const r = await saveMembershipPlan({
            id: plan?.id,
            slug: isNew ? safeFormOptional(fd, "slug") : safeFormString(fd, "slug"),
            name: safeFormString(fd, "name"),
            description: safeFormOptional(fd, "description"),
            priceCents: Math.round(Number(fd.get("price")) * 100),
            currency: safeFormOptional(fd, "currency") || "EUR",
            billingType: (fd.get("billingType") as "ONE_TIME" | "RECURRING") || plan?.billingType || "RECURRING",
            planKind: (fd.get("planKind") as MembershipPlanData["planKind"]) || plan?.planKind || "STANDARD",
            stockLimit: fd.get("stockLimit") ? Number(fd.get("stockLimit")) : null,
            durationDays: fd.get("durationDays") ? Number(fd.get("durationDays")) : null,
            stripePriceId: safeStripePriceId(fd.get("stripePriceId")) ?? undefined,
            features: parseLines(fd.get("features")),
            perks: nextPerks,
            badgeSlug: (fd.get("badgeSlug") as string) || undefined,
            sortOrder: plan?.sortOrder ?? plansLength,
            isActive: fd.get("isActive") === "on",
            isFeatured: fd.get("isFeatured") === "on",
            originalPriceCents: fd.get("originalPrice") ? Math.round(Number(fd.get("originalPrice")) * 100) : null,
            saleDiscountPercent: fd.get("saleDiscount") ? Number(fd.get("saleDiscount")) : null,
            saleEndsAt: (fd.get("saleEndsAt") as string) || null,
            iconKey: (fd.get("iconKey") as string) || null,
            cardStyle: {
              ...cardStyle,
              accentColor: (fd.get("accentColor") as string) || cardStyle.accentColor,
              ctaText: (fd.get("ctaText") as string) || undefined,
              iconKey: (fd.get("iconKey") as string) || undefined,
              borderGlow: fd.get("borderGlow") === "on",
            },
          });
          if (r.success) {
            appToast.saved(isNew ? tp("slugAutoGenerated") : undefined);
            onClose();
            router.refresh();
          } else appToast.error(r.error);
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="plan-slug" label={t("form.slug")}>
          <Input
            id="plan-slug"
            name="slug"
            defaultValue={plan?.slug}
            disabled={!isNew}
            className="mono-id"
            placeholder={isNew ? t("form.slugAutoGenerated") : undefined}
          />
        </Field>
        <Field id="plan-badge-slug" label={t("form.badgeSlug")}>
          <Input id="plan-badge-slug" name="badgeSlug" defaultValue={plan?.badgeSlug ?? ""} className="mono-id" />
        </Field>
      </div>
      <Field id="plan-name" label={t("form.planName")}>
        <Input id="plan-name" name="name" defaultValue={plan?.name} required />
      </Field>
      <Field id="plan-description" label={tp("description")}>
        <Textarea id="plan-description" name="description" defaultValue={plan?.description ?? ""} rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="plan-price" label={t("form.priceEur")}>
          <Input id="plan-price" name="price" type="number" step="0.01" defaultValue={plan ? (plan.priceCents / 100).toFixed(2) : "9.99"} required className="tabular-nums" />
        </Field>
        <Field id="plan-currency" label={t("form.currency")}>
          <Input id="plan-currency" name="currency" defaultValue={plan?.currency ?? "EUR"} className="w-24" />
        </Field>
      </div>
      <div className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2">
        <Field id="plan-billing" label={t("form.billing")}>
          <select id="plan-billing" name="billingType" defaultValue={plan?.billingType ?? "RECURRING"} className={selectClass}>
            <option value="RECURRING">{t("form.billingRecurring")}</option>
            <option value="ONE_TIME">{t("form.billingOneTime")}</option>
          </select>
        </Field>
        <Field id="plan-kind" label={t("form.planType")}>
          <select id="plan-kind" name="planKind" defaultValue={plan?.planKind ?? "STANDARD"} className={selectClass}>
            <option value="STANDARD">{t("form.planKindStandard")}</option>
            <option value="LIFETIME">{t("form.planKindLifetime")}</option>
            <option value="LIMITED">{t("form.planKindLimited")}</option>
            <option value="EVENT">{t("form.planKindEvent")}</option>
            <option value="CREATOR">{t("form.planKindCreator")}</option>
            <option value="PARTNER">{t("form.planKindPartner")}</option>
          </select>
        </Field>
        <Field
          id="plan-stock"
          label={t("form.stockLimit")}
          hint={plan?.stockLimit ? t("form.remaining", { count: Math.max(0, plan.stockLimit - (plan.soldCount ?? 0)) }) : undefined}
        >
          <Input id="plan-stock" name="stockLimit" type="number" placeholder={t("form.stockLimitPlaceholder")} defaultValue={plan?.stockLimit ?? ""} className="tabular-nums" />
        </Field>
        <Field id="plan-duration" label={t("form.durationDays")}>
          <Input id="plan-duration" name="durationDays" type="number" placeholder={t("form.optional")} defaultValue={plan?.durationDays ?? ""} className="tabular-nums" />
        </Field>
      </div>
      <FieldGroup title={t("form.limitedOfferSale")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="plan-original-price" label={t("form.originalPrice")}>
            <Input id="plan-original-price" name="originalPrice" type="number" step="0.01" defaultValue={plan?.originalPriceCents ? plan.originalPriceCents / 100 : ""} className="tabular-nums" />
          </Field>
          <Field id="plan-sale-discount" label={t("form.discountPercent")}>
            <Input id="plan-sale-discount" name="saleDiscount" type="number" defaultValue={plan?.saleDiscountPercent ?? ""} className="tabular-nums" />
          </Field>
          <Field id="plan-sale-ends" label={tp("saleEndsAt")}>
            <Input id="plan-sale-ends" name="saleEndsAt" type="datetime-local" defaultValue={plan?.saleEndsAt ? new Date(plan.saleEndsAt).toISOString().slice(0, 16) : ""} />
          </Field>
        </div>
      </FieldGroup>
      <FieldGroup title={t("form.cardStyling")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="plan-icon" label={tp("iconKey")}>
            <Input id="plan-icon" name="iconKey" placeholder={t("form.iconPlaceholder")} defaultValue={plan?.iconKey ?? "crown"} />
          </Field>
          <Field id="plan-cta" label={t("form.ctaButtonText")}>
            <Input id="plan-cta" name="ctaText" defaultValue={plan?.cardStyle?.ctaText ?? ""} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-ink sm:col-span-2">
            <input type="checkbox" name="borderGlow" className="mt-0.5" defaultChecked={plan?.cardStyle?.borderGlow ?? true} />
            <span>
              {t("form.neonBorderGlow")}
              <span className="meta block">{t("form.neonBorderGlowHint")}</span>
            </span>
          </label>
        </div>
      </FieldGroup>
      <Field id="plan-stripe-price" label={t("form.stripePriceId")}>
        <Input id="plan-stripe-price" name="stripePriceId" placeholder={tp("stripePriceIdPlaceholder")} defaultValue={plan?.stripePriceId ?? ""} className="mono-id" />
      </Field>
      <Field id="plan-features" label={tp("features")}>
        <Textarea id="plan-features" name="features" defaultValue={plan?.features.join("\n") ?? ""} rows={5} placeholder={t("form.featuresPlaceholder")} />
      </Field>

      <FieldGroup title={t("form.perksLimits")} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="plan-download-limit" label={t("form.downloadLimit")}>
            <Input id="plan-download-limit" name="downloadLimit" type="number" defaultValue={plan?.perks.downloadLimit ?? ""} className="tabular-nums" />
          </Field>
          <Field id="plan-storage" label={t("form.storageLimitMb")}>
            <Input id="plan-storage" name="storageLimitMb" type="number" defaultValue={plan?.perks.storageLimitMb ?? ""} className="tabular-nums" />
          </Field>
          <Field id="plan-fee" label={t("form.marketplaceFeeBps")}>
            <Input id="plan-fee" name="marketplaceFeeBps" type="number" defaultValue={plan?.perks.marketplaceFeeBps ?? ""} className="tabular-nums" />
          </Field>
          <Field id="plan-custom-badge" label={t("form.customBadgeId")}>
            <Input id="plan-custom-badge" name="customBadge" defaultValue={plan?.perks.customBadge ?? ""} className="mono-id" />
          </Field>
          <Field id="plan-accent" label={tp("accentColor")} hint={tp("accentColorHint")}>
            <Input id="plan-accent" name="accentColor" type="color" defaultValue={plan?.perks.accentColor ?? colors.violet} className="h-9 w-16 p-1" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink">
          {(
            [
              ["adFree", t("form.perks.adFree")],
              ["exclusiveMods", t("form.perks.exclusiveMods")],
              ["creatorContent", t("form.perks.creatorContent")],
              ["betaAccess", t("form.perks.betaAccess")],
              ["earlyAccess", t("form.perks.earlyAccess")],
              ["discordPerks", t("form.perks.discordPerks")],
              ["prioritySupport", t("form.perks.prioritySupport")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <Switch checked={!!perks[key]} onCheckedChange={(v) => setPerks((p) => ({ ...p, [key]: v }))} />
              {label}
            </label>
          ))}
        </div>
      </FieldGroup>

      <div className="flex flex-wrap gap-4 text-sm text-ink">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} /> {t("form.active")}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={plan?.isFeatured ?? false} /> {t("plans.featured")}
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{isNew ? t("plans.createPlan") : t("form.savePlan")}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>{t("form.cancel")}</Button>
      </div>
    </form>
  );
}
