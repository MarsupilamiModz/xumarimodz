import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth";
import { userHasPermission } from "@/lib/permission-store";
import { auditIpLabel, getAuditExportRows } from "@/lib/admin-audit";
import { AUDIT_CATEGORY_KEYS, auditCategoryOf, type AuditCategory } from "@/lib/audit-categories";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

function csvCell(value: string) {
  // Formel-Injection in Tabellenprogrammen verhindern und Anführungszeichen maskieren.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV-Export des Audit-Logs mit denselben Filtern wie die ACP-Seite (max. 10 000 Zeilen). */
export async function GET(req: Request) {
  const user = await requireAuthApi();
  if (!user || !(await userHasPermission({ id: user.id, role: user.role, permissionGroupId: user.permissionGroupId }, "audit.read"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rawCategory = url.searchParams.get("category") ?? undefined;
  const category = AUDIT_CATEGORY_KEYS.includes(rawCategory as AuditCategory) ? (rawCategory as AuditCategory) : undefined;
  const q = url.searchParams.get("q")?.trim().slice(0, 100) || undefined;

  const rows = await getAuditExportRows({ category, q });
  const header = ["time_utc", "actor", "action", "category", "entity_type", "entity_id", "ip_masked"];
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.actor ? `@${r.actor.username}` : "system",
      r.action,
      auditCategoryOf(r.entityType),
      r.entityType,
      r.entityId ?? "",
      auditIpLabel(r.metadata, r.ipHash),
    ]
      .map(csvCell)
      .join(",")
  );

  await createAuditLog({ actorId: user.id, action: "audit.export", entityType: "SiteSetting", metadata: { category, q, rows: rows.length } });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${[header.join(","), ...lines].join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
