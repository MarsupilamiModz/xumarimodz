import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AUDIT_CATEGORIES, allKnownAuditEntityTypes, type AuditCategory } from "@/lib/audit-categories";

export type AuditFilter = { category?: AuditCategory; q?: string };

export function auditWhere({ category, q }: AuditFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (category === "other") where.entityType = { notIn: allKnownAuditEntityTypes() };
  else if (category) where.entityType = { in: [...AUDIT_CATEGORIES[category]] };
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q } },
      { actor: { username: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

const SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  ipHash: true,
  createdAt: true,
  actor: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.AuditLogSelect;

/** Serverseitig paginiert; nutzt den Index auf createdAt. */
export async function getAuditPage(filter: AuditFilter, page: number, limit = 50) {
  const where = auditWhere(filter);
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: SELECT }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getAuditExportRows(filter: AuditFilter, max = 10_000) {
  return prisma.auditLog.findMany({ where: auditWhere(filter), orderBy: { createdAt: "desc" }, take: max, select: SELECT });
}

export function auditIpLabel(metadata: unknown, ipHash: string | null): string {
  if (metadata && typeof metadata === "object" && "ipMasked" in metadata) {
    const v = (metadata as { ipMasked?: unknown }).ipMasked;
    if (typeof v === "string") return v;
  }
  return ipHash ? `#${ipHash.slice(0, 8)}` : "—";
}
