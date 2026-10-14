import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { getAdminPaymentSettings, listRecentStripeCheckouts } from "@/actions/admin/payments";
import { PaymentsAdminPanel } from "@/components/admin/payments-admin-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminPaymentsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, settingsResult, txResult] = await Promise.all([
    getTranslations("admin.paymentsAdmin"),
    getAdminPaymentSettings(),
    listRecentStripeCheckouts(),
  ]);

  const settings = settingsResult.success ? settingsResult.data : {
    stripeEnabled: true,
    paypalEnabled: false,
    applePayEnabled: true,
    googlePayEnabled: true,
    currency: "EUR",
    taxPercent: 0,
    stripeSecretKeySet: false,
    stripeWebhookSecretSet: false,
    paypalSecretSet: false,
  };
  const transactions = txResult.success ? txResult.data : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {!settingsResult.success && <AdminLoadError message={t("settingsLoadError")} />}
      {!txResult.success && <AdminLoadError message={t("transactionsLoadError")} />}
      <PaymentsAdminPanel settings={settings} transactions={transactions} locale={locale} />
    </div>
  );
}
