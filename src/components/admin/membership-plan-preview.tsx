"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Crown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPlanPrice, getEffectivePlanPrice, getSaleTimeRemaining, type MembershipPlanData } from "@/lib/membership-pricing";

const PLAN_ICONS: Record<string, string> = {
  "premium-lite": "zap",
  premium: "crown",
  "premium-max": "gem",
};

/**
 * Vorschau einer Plankarte im ACP – gleicher Aufbau wie die Karte auf /premium
 * (Tokens statt Akzentfarbe; die gespeicherte Akzentfarbe bleibt im Plan erhalten).
 */
export function MembershipPlanPreview({
  plan,
  locale,
}: {
  plan: Partial<MembershipPlanData> & { name: string; priceCents: number; currency: string; features: string[] };
  locale: string;
}) {
  const t = useTranslations("premium");
  const tp = useTranslations("admin.panelPlanPreview");
  const fullPlan = plan as MembershipPlanData;
  const pricing = useMemo(() => getEffectivePlanPrice(fullPlan), [fullPlan]);
  const timeLeft = getSaleTimeRemaining(fullPlan);
  const icon = plan.iconKey ?? plan.cardStyle?.iconKey ?? PLAN_ICONS[plan.slug ?? ""] ?? "crown";

  return (
    <article
      className={cn(
        "mx-auto flex max-w-xs flex-col rounded-lg border bg-raised p-5",
        plan.isFeatured ? "border-violet-bright" : "border-line"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="flex items-center gap-2 font-semibold text-ink">
          <EntityIcon value={icon} fallback={Crown} className="h-5 w-5 text-ink-muted" />
          {plan.name}
        </h4>
        {plan.isFeatured && <Badge variant="premium">{t("popular")}</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <p className="text-2xl font-bold tabular-nums text-ink">
          {formatPlanPrice(pricing.priceCents, plan.currency, locale)}
        </p>
        {pricing.onSale && pricing.originalCents && (
          <s className="text-sm tabular-nums text-ink-faint">
            {formatPlanPrice(pricing.originalCents, plan.currency, locale)}
          </s>
        )}
      </div>
      {(pricing.onSale || (timeLeft != null && timeLeft > 0)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pricing.onSale && <Badge variant="warning">{t("saleBadge", { percent: pricing.discountPercent })}</Badge>}
          {timeLeft != null && timeLeft > 0 && (
            <Badge variant="warning">{t("saleEnds", { hours: Math.ceil(timeLeft / 3_600_000) })}</Badge>
          )}
        </div>
      )}
      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex gap-1.5 text-xs text-ink-muted">
            <Check className="h-3 w-3 shrink-0 text-success" aria-hidden /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-md border border-line py-2 text-center text-sm font-medium text-ink">
        {plan.cardStyle?.ctaText || tp("defaultCta")}
      </div>
    </article>
  );
}
