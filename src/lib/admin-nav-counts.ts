import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export type AdminNavCounts = {
  mods: number;
  users: number;
  openApplications: number;
  openTickets: number;
  openReports: number;
};

const OPEN_TICKET = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "WAITING_FOR_STAFF", "ESCALATED"] as const;
const OPEN_APPLICATION = ["PENDING", "UNDER_REVIEW"] as const;
const OPEN_REPORT = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_MORE_INFO", "INVESTIGATING"] as const;

/** Zähler für die ACP-Sidebar – eine gebündelte, 60 s gecachte Abfrage. */
export const getAdminNavCounts = unstable_cache(
  async (): Promise<AdminNavCounts> => {
    const [mods, users, creatorApps, partnerApps, openTickets, openReports] = await Promise.all([
      prisma.mod.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.creatorApplication.count({ where: { status: { in: [...OPEN_APPLICATION] } } }),
      prisma.partnerApplication.count({ where: { status: { in: [...OPEN_APPLICATION] } } }),
      prisma.supportTicket.count({ where: { status: { in: [...OPEN_TICKET] } } }),
      prisma.contentReport.count({ where: { status: { in: [...OPEN_REPORT] } } }),
    ]);
    return { mods, users, openApplications: creatorApps + partnerApps, openTickets, openReports };
  },
  ["admin-nav-counts"],
  { revalidate: 60, tags: ["admin-nav-counts"] }
);
