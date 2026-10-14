import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { listAdminShopProducts } from "@/actions/admin/shop";
import { getAdminPaymentSettings, listRecentStripeCheckouts } from "@/actions/admin/payments";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { ShopAdminPanel } from "@/components/admin/shop-admin-panel";
import { PaymentStatusOverview } from "@/components/admin/payment-status-overview";
import type { Locale } from "@/i18n/config";

export default async function AdminShopPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, result, settingsResult, txResult] = await Promise.all([
    getTranslations("admin.shopPage"),
    listAdminShopProducts(),
    getAdminPaymentSettings(),
    listRecentStripeCheckouts(5),
  ]);
  const products = result.success ? result.data : [];
  const loadError = !result.success ? result.error : null;
  const settings = settingsResult.success
    ? settingsResult.data
    : {
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
      {loadError && <AdminLoadError message={loadError} />}
      <PaymentStatusOverview settings={settings} transactions={transactions} locale={locale} compact />
      <ShopAdminPanel products={products} locale={locale} />
    </div>
  );
}
