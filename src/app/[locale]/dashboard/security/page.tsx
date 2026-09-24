import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getSecurityDashboard } from "@/lib/user-security";
import { SecurityDashboardPanel } from "@/components/dashboard/security-dashboard-panel";
import type { Locale } from "@/i18n/config";

/**
 * Ziel von redirectIfMfaRequired: Staff ohne 2FA wird hierher geschickt.
 * Die Seite prüft deshalb nur die Anmeldung, nicht die 2FA (sonst Endlosschleife).
 */
export default async function DashboardSecurityPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const dashboard = await getSecurityDashboard(user.id);
  return <SecurityDashboardPanel locale={locale} initial={{ ...dashboard, mfaEnabledAt: dashboard.mfaEnabledAt ?? null }} />;
}
