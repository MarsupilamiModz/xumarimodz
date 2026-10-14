import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Handshake } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCompactNumber } from "@/lib/format-locale";
import { PartnerHubCard, type PartnerCardItem } from "@/components/partners/partner-hub-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "ecosystem" });
  return { title: t("partnerHub"), description: t("partnersSubtitle") };
}

type PartnerRow = PartnerCardItem & { followerCount: number };

export default async function PartnersPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");

  // Jeder Partner genau einmal: hervorgehobene oben, danach alle übrigen nach Followern.
  const partners: PartnerRow[] = await prisma.partnerProfile
    .findMany({
      where: { isPublic: true, isBanned: false, isSuspended: false },
      orderBy: [{ isFeatured: "desc" }, { isVerified: "desc" }, { followerCount: "desc" }, { createdAt: "asc" }],
      take: 60,
      include: { user: { select: { displayName: true, username: true, avatarUrl: true } } },
    })
    .catch(() => []);
  const featured = partners.filter((p) => p.isFeatured);
  const rest = partners.filter((p) => !p.isFeatured);

  const labels = { verified: t("verified"), featured: t("featured") };
  const card = (p: PartnerRow) => (
    <li key={p.id}>
      <PartnerHubCard
        locale={locale}
        partner={p}
        labels={labels}
        meta={t("followersCount", { value: formatCompactNumber(p.followerCount, locale) })}
      />
    </li>
  );
  const grid = (items: PartnerRow[]) => <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(card)}</ul>;

  return (
    <div className="page-section">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="h1-display">{t("partnerHub")}</h1>
          <p className="mt-3 max-w-2xl text-ink-muted">{t("partnersSubtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/become-partner`}>{t("becomePartner")}</Link>
        </Button>
      </div>

      {partners.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={Handshake}
          title={t("noPartners")}
          action={
            <Button asChild>
              <Link href={`/${locale}/become-partner`}>{t("becomePartner")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-10 space-y-12">
          {featured.length > 0 && (
            <section aria-labelledby="partners-featured">
              <h2 id="partners-featured" className="mb-4 text-lg font-semibold text-ink">{t("featuredPartners")}</h2>
              {grid(featured)}
            </section>
          )}
          {rest.length > 0 && (
            <section aria-labelledby="partners-all">
              <h2 id="partners-all" className="mb-4 text-lg font-semibold text-ink">
                {featured.length > 0 ? t("morePartners") : t("allPartners")}
              </h2>
              {grid(rest)}
            </section>
          )}
        </div>
      )}

      {partners.length > 0 && (
        <section className="mt-16 flex flex-col gap-4 rounded-lg border border-line bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("partnerCtaTitle")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("partnerCtaText")}</p>
          </div>
          <Button asChild>
            <Link href={`/${locale}/become-partner`}>{t("becomePartner")}</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
