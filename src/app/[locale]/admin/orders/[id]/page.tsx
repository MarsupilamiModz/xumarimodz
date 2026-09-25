import { requirePagePermission } from "@/lib/auth";
import { AdminOrderDetail } from "@/components/orders/admin-order-detail";

export default async function AdminOrderDetailPage() {
  await requirePagePermission("orders.read");
  return <AdminOrderDetail />;
}
