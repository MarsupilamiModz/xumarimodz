import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import {
  listCreatorApplicationsAdmin,
  listPartnerApplicationsAdmin,
  listCommissionRulesForApplications,
} from "@/actions/admin/applications";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { ApplicationsBoard, type BoardApplication } from "@/components/admin/applications-board";
import { ChipTabs } from "@/components/ui/chip-tabs";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/** Nur http(s)-Links anzeigen (keine javascript:- oder data:-URLs aus Formularen). */
function safeLinks(...urls: (string | null | undefined)[]) {
  return urls.filter((u): u is string => !!u && /^https?:\/\//i.test(u.trim())).map((u) => u.trim());
}

export default async function AdminApplicationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { type?: string };
}) {
  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const t = await getTranslations("admin.ap");
  const type = searchParams.type === "partner" ? "partner" : "creator";

  const [creators, partners, rules] = await Promise.all([
    listCreatorApplicationsAdmin(),
    listPartnerApplicationsAdmin(),
    listCommissionRulesForApplications(),
  ]);

  const creatorApps: BoardApplication[] = creators.success
    ? creators.data.map((a) => ({
        id: a.id,
        kind: "creator",
        status: a.status,
        name: a.displayName,
        username: a.user.username,
        email: a.email,
        discord: a.discord,
        createdAt: a.createdAt.toISOString(),
        message: a.message,
        audience: null,
        strategy: null,
        links: safeLinks(a.portfolioUrl, a.youtubeUrl, a.twitchUrl, a.tiktokUrl, a.instagramUrl, a.xUrl, a.websiteUrl),
        adminNotes: a.adminNotes,
      }))
    : [];
  const partnerApps: BoardApplication[] = partners.success
    ? partners.data.map((a) => ({
        id: a.id,
        kind: "partner",
        status: a.status,
        name: a.creatorName,
        username: a.user.username,
        email: a.email,
        discord: a.discord,
        createdAt: a.createdAt.toISOString(),
        message: a.whyPartner ?? a.message,
        audience: a.audienceSize,
        strategy: a.promotionStrategy,
        links: safeLinks(a.youtubeUrl, a.twitchUrl, a.tiktokUrl, a.instagramUrl, a.xUrl, a.websiteUrl),
        adminNotes: a.adminNotes,
      }))
    : [];

  const base = `/${locale}/admin/applications`;
  const loadError = !creators.success || !partners.success;

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <ChipTabs
            label={t("type")}
            value={type}
            options={[
              { value: "creator", label: t("creators", { count: creatorApps.filter((a) => a.status === "PENDING").length }) },
              { value: "partner", label: t("partners", { count: partnerApps.filter((a) => a.status === "PENDING").length }) },
            ]}
            hrefFor={(v) => (v === "creator" ? base : `${base}?type=${v}`)}
          />
        }
      />
      {loadError && <AdminLoadError message={!creators.success ? creators.error : !partners.success ? partners.error : ""} />}
      <ApplicationsBoard
        locale={locale}
        apps={type === "creator" ? creatorApps : partnerApps}
        rules={rules.success ? rules.data : []}
      />
    </div>
  );
}
