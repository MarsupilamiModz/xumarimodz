import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { isCreatorOrPartner } from "@/lib/permissions";
import type { Locale } from "@/i18n/config";

export default async function CreatorLayout(
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
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });

  const allowed =
    profile ||
    user.role === "CREATOR" ||
    isCreatorOrPartner(user.role);

  if (!allowed) {
    // Noch kein Creator: zur Bewerbung.
    redirect(`/${locale}/become-creator`);
  }

  const nav = [
    { href: "", label: t("overview") },
    { href: "/analytics", label: t("analytics") },
    { href: "/codes", label: t("codes") },
    { href: "/licenses", label: t("licenses") },
    { href: "/payouts", label: t("payouts") },
    { href: "/exclusive", label: t("exclusiveAccess") },
    { href: "/collections", label: t("collectionsNav") },
    { href: "/settings", label: t("profileSettings") },
  ];

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="h1-acp">{t("creatorStudio")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("creatorSubtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/creator/mods/new`}>
            <Plus className="h-4 w-4" aria-hidden /> {t("upload")}
          </Link>
        </Button>
      </div>
      <StudioNav locale={locale} base="/creator" items={nav} />
      {children}
    </div>
  );
}
