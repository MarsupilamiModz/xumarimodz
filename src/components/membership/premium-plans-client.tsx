"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Crown, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityIcon } from "@/components/ui/entity-icon";
import { formatPlanPrice, getEffectivePlanPrice, getSaleTimeRemaining, type MembershipPlanData } from "@/lib/membership-pricing";
import { isPlanSoldOut, planRemainingStock } from "@/lib/membership-stock";
import { useAppToast } from "@/hooks/use-app-toast";
import { useNavUser } from "@/lib/nav-user-client";
import { cn } from "@/lib/utils";

type Plan = Pick<
  MembershipPlanData,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "priceCents"
  | "currency"
  | "features"
  | "isFeatured"
  | "perks"
  | "originalPriceCents"
  | "saleDiscountPercent"
  | "cardStyle"
  | "iconKey"
  | "billingType"
  | "planKind"
  | "stockLimit"
  | "soldCount"
  | "interval"
> & { cta?: string; saleEndsAt: string | null };

function planForPricing(plan: Plan): MembershipPlanData {
  return { ...(plan as MembershipPlanData), saleEndsAt: plan.saleEndsAt ? new Date(plan.saleEndsAt) : null };
}

type Interval = "month" | "year";

function planInterval(plan: Plan): Interval | null {
  if (plan.billingType !== "RECURRING") return null;
  return plan.interval === "year" ? "year" : "month";
}

type Props = {
  locale: string;
  plans: Plan[];
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  showComparison: boolean;
};

type PerkRow = { key: string; label: string; free: boolean | string; value: (p: Plan) => boolean | string | null };

export function PremiumPlansClient({
  locale,
  plans,
  heroTitle,
  heroSubtitle,
  ctaText,
  showComparison,
}: Props) {
  const t = useTranslations("premium");
  // Nutzer und Plan aus dem Browser – die Seite selbst bleibt dadurch cachebar.
  const { status, user } = useNavUser();
  const isLoggedIn = status === "user";
  const currentPlanSlug = user?.planSlug ?? null;
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  // Umschalter nur, wenn es wirklich Monats- und Jahrespläne gibt.
  const intervals = useMemo(() => new Set(plans.map(planInterval).filter(Boolean) as Interval[]), [plans]);
  const hasToggle = intervals.has("month") && intervals.has("year");
  const [interval, setBillingInterval] = useState<Interval>("month");

  const visiblePlans = plans.filter((p) => {
    const i = planInterval(p);
    return !hasToggle || i === null || i === interval;
  });

  const currentPlan = plans.find((p) => p.slug === currentPlanSlug);
  const currentSort = plans.findIndex((p) => p.slug === currentPlanSlug);

  function purchase(planSlug: string) {
    if (!isLoggedIn) {
      window.location.href = `/${locale}/login?redirect=/${locale}/premium`;
      return;
    }
    setLoadingSlug(planSlug);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            planSlug,
            locale,
            clientOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
        });
        const data: { url?: string; error?: string } = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        console.error("[premium] checkout failed", res.status, data.error);
        appToast.error(data.error ?? t("checkoutFailed"));
      } catch (err) {
        console.error("[premium] checkout network error", err);
        appToast.error(t("checkoutNetwork"));
      } finally {
        setLoadingSlug(null);
      }
    });
  }

  function billingLabel(plan: Plan) {
    const i = planInterval(plan);
    if (i === "year") return t("billedYearly");
    if (i === "month") return t("billedMonthly");
    return t("lifetime");
  }

  function priceSuffix(plan: Plan) {
    const i = planInterval(plan);
    if (i === "year") return t("perYear");
    if (i === "month") return t("perMonth");
    return t("oneTime");
  }

  const rows: PerkRow[] = (
    [
      { key: "adFree", label: t("rowAdFree"), free: false, value: (p: Plan) => !!p.perks?.adFree },
      {
        key: "speed",
        label: t("rowSpeed"),
        free: "—",
        value: (p: Plan) =>
          p.perks?.downloadSpeedMbps ? `${p.perks.downloadSpeedMbps} MB/s` : p.perks ? t("rowUnlimited") : null,
      },
      { key: "exclusive", label: t("rowExclusive"), free: false, value: (p: Plan) => !!p.perks?.exclusiveMods },
      { key: "early", label: t("rowEarly"), free: false, value: (p: Plan) => !!p.perks?.earlyAccess },
      { key: "discord", label: t("rowDiscord"), free: false, value: (p: Plan) => !!p.perks?.discordPerks },
      { key: "support", label: t("rowSupport"), free: false, value: (p: Plan) => !!p.perks?.prioritySupport },
    ] as PerkRow[]
  ).filter((row) => visiblePlans.some((p) => row.value(p) !== false && row.value(p) !== null));

  function Cell({ value }: { value: boolean | string | null }) {
    if (value === true)
      return (
        <span className="inline-flex items-center gap-1.5 text-success">
          <Check className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t("included")}</span>
        </span>
      );
    if (value === false || value === null)
      return (
        <span className="inline-flex text-ink-faint">
          <Minus className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t("notIncluded")}</span>
        </span>
      );
    return <span className="tabular-nums text-ink">{value}</span>;
  }

  return (
    <div>
      <section className="page-section pb-10 md:pb-12">
        <div className="max-w-3xl">
          <h1 className="h1-display">{heroTitle}</h1>
          <p className="mt-4 text-base text-ink-muted md:text-lg">{heroSubtitle}</p>
          {currentPlan && (
            <Badge variant="premium" className="mt-5">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {t("yourPlan", { name: currentPlan.name })}
            </Badge>
          )}
        </div>

        {hasToggle && (
          <div className="mt-8 inline-flex rounded-lg border border-line bg-raised p-1" role="radiogroup" aria-label={t("billingToggle")}>
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={interval === i}
                onClick={() => setBillingInterval(i)}
                className={cn(
                  "h-9 rounded-md px-4 text-sm font-semibold transition-colors duration-fast",
                  interval === i ? "bg-violet text-violet-on" : "text-ink-muted hover:text-ink"
                )}
              >
                {i === "month" ? t("monthly") : t("yearly")}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="page-container">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
          {/* Free */}
          <article className="flex flex-col rounded-xl border border-line bg-raised p-6">
            <h2 className="text-lg font-semibold text-ink">{t("freeName")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("freeDescription")}</p>
            <p className="mt-5 text-[32px] font-extrabold tabular-nums text-ink">{formatPlanPrice(0, "EUR", locale)}</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {[t("freeFeature1"), t("freeFeature2"), t("freeFeature3")].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            {isLoggedIn ? (
              <Button variant="outline" disabled className="mt-6 w-full">
                {currentPlan ? t("includedInPlan") : t("freeCurrent")}
              </Button>
            ) : (
              <Button variant="outline" className="mt-6 w-full" asChild>
                <Link href={`/${locale}/register`}>{t("freeCta")}</Link>
              </Button>
            )}
          </article>

          {visiblePlans.map((plan) => {
            const index = plans.indexOf(plan);
            const isCurrent = currentPlanSlug === plan.slug;
            const isOwnedHigher = currentSort >= 0 && index < currentSort;
            const pricing = getEffectivePlanPrice(planForPricing(plan));
            const saleEnds = getSaleTimeRemaining(planForPricing(plan));
            const remaining = planRemainingStock(plan);
            const soldOut = isPlanSoldOut(plan);
            const loading = pending && loadingSlug === plan.slug;

            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-raised p-6",
                  plan.isFeatured ? "border-violet-bright" : "border-line"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                    <EntityIcon value={plan.iconKey ?? plan.cardStyle?.iconKey} fallback={Crown} className="h-5 w-5 text-ink-muted" />
                    {plan.name}
                  </h2>
                  {plan.isFeatured && <Badge variant="premium">{t("popular")}</Badge>}
                </div>
                {plan.description && <p className="mt-1 text-sm text-ink-muted">{plan.description}</p>}

                <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
                  <p className="text-[32px] font-extrabold tabular-nums text-ink">
                    {formatPlanPrice(pricing.priceCents, plan.currency, locale)}
                  </p>
                  <span className="text-sm text-ink-muted">{priceSuffix(plan)}</span>
                  {pricing.onSale && pricing.originalCents && (
                    <s className="text-sm tabular-nums text-ink-faint">
                      {formatPlanPrice(pricing.originalCents, plan.currency, locale)}
                    </s>
                  )}
                </div>
                <p className="meta mt-1">{billingLabel(plan)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pricing.onSale && <Badge variant="warning">{t("saleBadge", { percent: pricing.discountPercent })}</Badge>}
                  {saleEnds != null && saleEnds > 0 && (
                    <Badge variant="warning">{t("saleEnds", { hours: Math.ceil(saleEnds / 3_600_000) })}</Badge>
                  )}
                  {remaining != null && (
                    <Badge variant={soldOut ? "destructive" : "warning"}>
                      {soldOut ? t("soldOut") : t("remaining", { count: remaining })}
                    </Badge>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="mt-6 w-full">{t("currentPlan")}</Button>
                ) : isOwnedHigher ? (
                  <Button variant="outline" disabled className="mt-6 w-full">{t("includedInPlan")}</Button>
                ) : soldOut ? (
                  <Button variant="outline" disabled className="mt-6 w-full">{t("soldOut")}</Button>
                ) : (
                  <Button
                    variant={plan.isFeatured ? "default" : "outline"}
                    className="mt-6 w-full"
                    disabled={loading}
                    aria-busy={loading}
                    onClick={() => purchase(plan.slug)}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {currentPlan ? t("upgradeTo", { name: plan.name }) : plan.cta ?? plan.cardStyle?.ctaText ?? ctaText}
                  </Button>
                )}
              </article>
            );
          })}
        </div>

        <p className="meta mt-4">{t("vatNote")}</p>
        {!isLoggedIn && (
          <p className="mt-2 text-sm text-ink-muted">
            <Link href={`/${locale}/login?redirect=/${locale}/premium`} className="link font-semibold">
              {t("signIn")}
            </Link>{" "}
            – {t("signInToBuy")}
          </p>
        )}
      </section>

      {showComparison && rows.length > 0 && (
        <section className="page-section">
          <h2 className="text-lg font-semibold text-ink">{t("compareTitle")}</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-raised">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-muted">{t("compareFeature")}</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t("freeName")}</th>
                  {visiblePlans.map((p) => (
                    <th key={p.id} scope="col" className="px-4 py-3 text-left font-semibold text-ink">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="px-4 py-3 text-left font-normal text-ink-muted">{row.label}</th>
                    <td className="px-4 py-3"><Cell value={row.free} /></td>
                    {visiblePlans.map((p) => (
                      <td key={p.id} className="px-4 py-3"><Cell value={row.value(p)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
