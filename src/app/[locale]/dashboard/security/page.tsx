import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getSecurityDashboard } from "@/lib/user-security";
import { SecurityDashboardPanel } from "@/components/dashboard/security-dashboard-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

/**
 * Ziel von redirectIfMfaRequired: Staff ohne 2FA wird hierher geschickt.
 * Die Seite prüft deshalb nur die Anmeldung, nicht die 2FA (sonst Endlosschleife).
 */
export default async function DashboardSecurityPage(props: { params: Promise<{ locale: Locale }> }) {
 const params = await props.params;

 const {
  locale
 } = params;

 setRequestLocale(locale);
 const user = await requireAuth(`/${locale}/login`);
 const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.security")]);
 const dashboard = await getSecurityDashboard(user.id);
 return (
  <div>
   <PageHeader title={t("security")} description={ta("description")} />
   <SecurityDashboardPanel locale={locale} initial={{ ...dashboard, mfaEnabledAt: dashboard.mfaEnabledAt ?? null }} />
  </div>
 );
}
