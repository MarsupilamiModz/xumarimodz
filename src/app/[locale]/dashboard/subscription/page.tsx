import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserMembershipTier, formatPlanPrice } from "@/lib/membership";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MembershipActions } from "@/components/membership/membership-actions";
import type { Locale } from "@/i18n/config";

const BENEFITS = ["benefitDownloads", "benefitAds", "benefitDiscord", "benefitBeta"] as const;

export default async function MembershipPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.subscription")]);

  const [purchases, tier] = await Promise.all([
    prisma.membershipPurchase.findMany({
      where: { userId: user.id },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getUserMembershipTier(user.id),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("membership")} description={ta("description")} />

      <div className="space-y-6">
        <SectionCard
          title={ta("currentTitle")}
          action={
            tier ? <StatusBadge tone="success" label={tier.name} /> : <StatusBadge tone="neutral" label={t("free")} />
          }
        >
          <div className="space-y-4">
            {!tier ? (
              <p className="text-sm text-ink-muted">{ta("none")}</p>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink">{tier.name}</p>
                <p className="text-ink-muted">
                  {ta("lifetime", { price: formatPlanPrice(tier.priceCents, tier.currency, locale) })}
                </p>
                {tier.features.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-ink-muted">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <MembershipActions locale={locale} purchases={purchases} />
          </div>
        </SectionCard>

        <SectionCard
          title={ta("benefitsTitle")}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/premium`}>{ta("compare")}</Link>
            </Button>
          }
        >
          <ul className="space-y-2 text-sm text-ink-muted">
            {BENEFITS.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                {ta(key)}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
