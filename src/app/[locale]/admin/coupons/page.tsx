import { requirePagePermission } from "@/lib/auth";
import { getCoupons } from "@/actions/admin/coupons";
import { CouponsAdmin } from "@/components/admin/coupons-admin";
export default async function AdminCouponsPage() {
  await requirePagePermission("coupons.write");
  const result = await getCoupons();
  const coupons = result.success ? result.data : [];

  return (
    <div>
      <h1 className="h1-acp">Coupons</h1>
      <div className="mt-8">
        <CouponsAdmin initialCoupons={coupons} />
      </div>
    </div>
  );
}
