"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { logSecurityEvent } from "@/lib/user-security";
import {
  deleteAuthSession,
  getSecurityPolicy,
  hashIpForBan,
  maskedIp,
  saveSecurityPolicy,
} from "@/lib/security-policy";

const rulesSchema = z.object({
  passwordMinLength: z.number().int().min(8).max(64),
  passwordRequireNumber: z.boolean(),
  passwordRequireSymbol: z.boolean(),
  passwordRequireMixedCase: z.boolean(),
});

export async function saveSecurityRules(input: z.infer<typeof rulesSchema>) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid rules");

  const policy = await getSecurityPolicy();
  await saveSecurityPolicy({ ...policy, ...parsed.data });
  await createAuditLog({ actorId: user.id, action: "security.password_rules", entityType: "SiteSetting", entityId: "security_policy", metadata: parsed.data });
  revalidatePath("/admin/security");
  return ok(undefined);
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

async function requestIp() {
  const h = (await headers());
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

export async function addIpBan(ip: string, reason?: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const value = ip.trim().toLowerCase();
  if (!IPV4.test(value) && !(value.includes(":") && IPV6.test(value))) return fail("Invalid IP address");
  if ((await requestIp())?.toLowerCase() === value) return fail("You cannot ban your own current IP address");

  const policy = await getSecurityPolicy();
  const hash = hashIpForBan(value);
  if (policy.ipBans.some((b) => b.hash === hash)) return fail("This IP is already banned");

  const entry = { hash, masked: maskedIp(value), reason: reason?.trim().slice(0, 200) || null, createdAt: new Date().toISOString(), createdBy: user.username };
  await saveSecurityPolicy({ ...policy, ipBans: [entry, ...policy.ipBans].slice(0, 1000) });
  await createAuditLog({ actorId: user.id, action: "security.ip_ban", entityType: "IpBan", entityId: hash.slice(0, 16), metadata: { masked: entry.masked, reason: entry.reason } });
  revalidatePath("/admin/security");
  return ok(undefined);
}

export async function removeIpBan(hash: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const policy = await getSecurityPolicy();
  const entry = policy.ipBans.find((b) => b.hash === hash);
  if (!entry) return fail("Ban not found");
  await saveSecurityPolicy({ ...policy, ipBans: policy.ipBans.filter((b) => b.hash !== hash) });
  await createAuditLog({ actorId: user.id, action: "security.ip_unban", entityType: "IpBan", entityId: hash.slice(0, 16), metadata: { masked: entry.masked } });
  revalidatePath("/admin/security");
  return ok(undefined);
}

export async function revokeTeamSession(sessionId: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return fail("Invalid session");

  let supabaseUserId: string | null;
  try {
    supabaseUserId = await deleteAuthSession(sessionId);
  } catch (err) {
    console.error("[security] revoke session", err);
    return fail("Session could not be ended");
  }
  if (!supabaseUserId) return fail("Session not found");

  const target = await prisma.user.findUnique({ where: { supabaseId: supabaseUserId }, select: { id: true } });
  if (target) {
    await logSecurityEvent({ userId: target.id, eventType: "SESSION_REVOKED", metadata: { by: user.id } });
  }
  await createAuditLog({ actorId: user.id, action: "security.session_revoke", entityType: "User", entityId: target?.id, metadata: { sessionId } });
  revalidatePath("/admin/security");
  return ok(undefined);
}
