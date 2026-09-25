import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";
import { maskIp } from "@/lib/audit-categories";

export const SECURITY_POLICY_KEY = "security_policy";

export type IpBan = { hash: string; masked: string; reason: string | null; createdAt: string; createdBy: string };

export type SecurityPolicy = {
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordRequireMixedCase: boolean;
  ipBans: IpBan[];
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  passwordMinLength: 8,
  passwordRequireNumber: false,
  passwordRequireSymbol: false,
  passwordRequireMixedCase: false,
  ipBans: [],
};

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  const policy = await getSiteSetting<SecurityPolicy>(SECURITY_POLICY_KEY, DEFAULT_SECURITY_POLICY);
  return { ...policy, ipBans: Array.isArray(policy.ipBans) ? policy.ipBans : [] };
}

export async function saveSecurityPolicy(policy: SecurityPolicy) {
  await setSiteSetting(SECURITY_POLICY_KEY, policy);
}

/** Gleicher Hash wie in der Middleware (SHA-256 über „Salz:IP“), damit die volle IP nirgends gespeichert wird. */
export function hashIpForBan(ip: string) {
  return createHash("sha256").update(`${ipBanSalt()}:${ip.trim().toLowerCase()}`).digest("hex");
}

export function ipBanSalt() {
  return process.env.IP_BAN_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "xumari";
}

/** Schlüssel, mit dem die Middleware die Sperrliste abruft (abgeleitet, nie der Rohwert). */
export function ipBanListToken() {
  return createHash("sha256").update(`ip-ban-list:${ipBanSalt()}`).digest("hex");
}

export function maskedIp(ip: string) {
  return maskIp(ip.trim()) ?? "—";
}

/** Gibt einen Fehlerschlüssel zurück, wenn das Passwort gegen die Regeln verstößt, sonst null. */
export function checkPassword(password: string, policy: SecurityPolicy): "tooShort" | "needsNumber" | "needsSymbol" | "needsMixedCase" | null {
  if (password.length < Math.max(8, policy.passwordMinLength)) return "tooShort";
  if (policy.passwordRequireNumber && !/\d/.test(password)) return "needsNumber";
  if (policy.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) return "needsSymbol";
  if (policy.passwordRequireMixedCase && !(/[a-z]/.test(password) && /[A-Z]/.test(password))) return "needsMixedCase";
  return null;
}

export type TeamSession = {
  id: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  userAgent: string | null;
  ipMasked: string;
  user: { id: string; username: string; role: string };
};

/**
 * Aktive Supabase-Sitzungen von Team-Konten (auth.sessions). Liefert null,
 * wenn das Auth-Schema für die Datenbankrolle nicht lesbar ist.
 */
export async function getTeamSessions(limit = 100): Promise<TeamSession[] | null> {
  try {
    const rows = await prisma.$queryRaw<
      { id: string; created_at: Date; updated_at: Date | null; user_agent: string | null; ip: string | null; uid: string; username: string; role: string }[]
    >`
      SELECT s.id::text AS id, s.created_at, s.updated_at, s.user_agent, host(s.ip) AS ip,
             u.id AS uid, u.username, u.role::text AS role
      FROM auth.sessions s
      JOIN public."User" u ON u."supabaseId" = s.user_id::text
      WHERE u.role IN ('OWNER', 'ADMIN', 'MODERATOR', 'SUPPORT')
        AND (s.not_after IS NULL OR s.not_after > now())
      ORDER BY COALESCE(s.updated_at, s.created_at) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      lastActiveAt: r.updated_at,
      userAgent: r.user_agent,
      ipMasked: r.ip ? maskedIp(r.ip) : "—",
      user: { id: r.uid, username: r.username, role: r.role },
    }));
  } catch (err) {
    console.error("[security] auth.sessions not readable", err);
    return null;
  }
}

/** Beendet eine Sitzung: löscht sie samt Refresh-Tokens; das laufende Access-Token verfällt nach spätestens einer Stunde. */
export async function deleteAuthSession(sessionId: string) {
  const rows = await prisma.$queryRaw<{ user_id: string }[]>`
    DELETE FROM auth.sessions WHERE id = ${sessionId}::uuid RETURNING user_id::text AS user_id
  `;
  return rows[0]?.user_id ?? null;
}
