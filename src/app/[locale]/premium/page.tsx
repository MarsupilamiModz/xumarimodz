import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crown } from "lucide-react";
import { getActiveMembershipPlans, getPremiumPageSettings, localizedPlan, getUserMembershipTier } from "@/lib/membership";
import { DEFAULT_PREMIUM_PAGE } from "@/lib/membership-pricing";
import { getCurrentUser } from "@/lib/auth";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { resolvePageContent } from "@/lib/branding-cms";
import { PremiumPlansClient } from "@/components/membership/premium-plans-client";
import { EmptyState } from "@/components/ui/empty-state";
import { FaqList } from "@/components/faq/faq-list";
import { getFaqEntries } from "@/lib/faq";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "premium" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PremiumPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("premium");
  const [plans, pageSettings, user, cms, faqs] = await Promise.all([
    getActiveMembershipPlans(),
    getPremiumPageSettings(),
    getCurrentUser(),
    getCachedPublicBranding(),
    getFaqEntries(locale),
  ]);

  let currentPlanSlug: string | null = null;
  if (user) {
    const tier = await getUserMembershipTier(user.id);
    currentPlanSlug = tier?.slug ?? null;
  }

  // Reihenfolge: Inhalte aus dem ACP (je Sprache) > eigene Premium-Einstellung > Übersetzung.
  const custom = (value: string, fallback: string) => (value && value !== fallback ? value : "");
  const heroTitle = resolvePageContent(
    cms.pageContent, "premium", locale, "heroTitle",
    custom(pageSettings.heroTitle, DEFAULT_PREMIUM_PAGE.heroTitle) || t("title")
  );
  const heroSubtitle = resolvePageContent(
    cms.pageContent, "premium", locale, "heroSubtitle",
    custom(pageSettings.heroSubtitle, DEFAULT_PREMIUM_PAGE.heroSubtitle) || t("subtitle")
  );
  const ctaText = resolvePageContent(
    cms.pageContent, "premium", locale, "ctaText",
    custom(pageSettings.ctaText, DEFAULT_PREMIUM_PAGE.ctaText) || t("subscribe")
  );

  const serializable = plans.map((p) => {
    const plan = localizedPlan(p, locale);
    return { ...plan, saleEndsAt: plan.saleEndsAt ? new Date(plan.saleEndsAt).toISOString() : null };
  });

  return (
    <div>
      {serializable.length === 0 ? (
        <section className="page-section">
          <h1 className="h1-display">{heroTitle}</h1>
          <EmptyState className="mt-10" icon={Crown} title={t("noPlansTitle")} description={t("noPlansText")} />
        </section>
      ) : (
        <PremiumPlansClient
          locale={locale}
          plans={serializable}
          heroTitle={heroTitle}
          heroSubtitle={heroSubtitle}
          ctaText={ctaText}
          showComparison={pageSettings.showComparison !== false}
          isLoggedIn={!!user}
          currentPlanSlug={currentPlanSlug}
        />
      )}

      {faqs.length > 0 && (
        <section className="page-section">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-ink">{t("faqTitle")}</h2>
            <div className="mt-6">
              <FaqList entries={faqs} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
