import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudioNav } from "@/components/studio/studio-nav";
import { isPartner } from "@/lib/permissions";
import type { Locale } from "@/i18n/config";

export default async function PartnerLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const locale = params.locale as Locale;

  const {
    children
  } = props;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const user = await requireAuth(`/${locale}/login`);
  const profile = await prisma.partnerProfile.findUnique({ where: { userId: user.id } });

  if (!profile && !isPartner(user.role)) {
    // Noch kein Partner: zur Bewerbung.
    redirect(`/${locale}/become-partner`);
  }

  const nav = [
    { href: "", label: t("overview") },
    { href: "/analytics", label: t("analytics") },
    { href: "/codes", label: t("codes") },
    { href: "/payouts", label: t("payouts") },
    { href: "/settings", label: t("profileSettings") },
  ];

  return (
    <div className="page-container py-8">
      <div className="mb-6">
        <h1 className="h1-acp">{t("partnerStudio")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("partnerSubtitle")}</p>
      </div>
      <StudioNav locale={locale} base="/partner" items={nav} />
      {children}
    </div>
  );
}
