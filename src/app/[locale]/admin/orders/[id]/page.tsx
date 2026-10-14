import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminOrderDetail } from "@/components/orders/admin-order-detail";
import type { Locale } from "@/i18n/config";

export default async function AdminOrderDetailPage(props: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  await requirePagePermission("orders.read");
  const [t, to] = await Promise.all([getTranslations("admin.orderDetail"), getTranslations("admin.or")]);
  return (
    <div>
      <AdminPageHeader title={t("title")} parent={{ label: to("title"), href: `/${locale}/admin/orders` }} />
      <AdminOrderDetail />
    </div>
  );
}
