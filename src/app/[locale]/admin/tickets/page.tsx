import { getTicketsAdmin } from "@/actions/tickets";
import { TicketsTable } from "@/components/admin/tickets-table";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/config";

export default async function AdminTicketsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { page?: string };
}) {
  const user = await requireStaff();
  const [result, staffUsers] = await Promise.all([
    getTicketsAdmin({ page: Number(searchParams.page) || 1 }),
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "ADMIN", "MODERATOR", "SUPPORT"] }, deletedAt: null },
      select: { id: true, username: true },
    }),
  ]);
  const data = result.success
    ? result.data
    : { tickets: [], pages: 0, page: 1 };

  return (
    <div>
      <h1 className="h1-acp">Support Tickets</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage and respond to user support requests</p>
      <div className="mt-8">
        <TicketsTable
          locale={locale}
          currentUserId={user.id}
          staffUsers={staffUsers}
          initialTickets={data.tickets}
          initialPages={data.pages}
          initialPage={data.page}
        />
      </div>
    </div>
  );
}
