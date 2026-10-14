import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getOrderDetail } from "@/actions/orders";
import { OrderRequirementsForm } from "@/components/orders/order-requirements-form";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

/** Projektdetails nach der Zahlung eines Custom-Service (Ziel nach dem Stripe-Checkout). */
export default async function OrderRequirementsPage(props: { params: Promise<{ locale: Locale; id: string }> }) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  const result = await getOrderDetail(id);
  if (!result.success) notFound();
  const order = result.data;
  const productName = order.shopProduct?.name ?? order.title;

  return (
    <div className="max-w-2xl">
      <Link href={`/${locale}/dashboard/orders/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {order.title}
      </Link>
      <PageHeader title={productName} />
      <OrderRequirementsForm orderId={id} locale={locale} productName={productName} />
    </div>
  );
}
