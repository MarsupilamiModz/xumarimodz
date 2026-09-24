/**
 * Audit-Kategorien für Filter-Chips und CSV. Die Zuordnung erfolgt über `entityType`,
 * damit auch ältere Einträge ohne eigene Kategorie-Spalte gefiltert werden können.
 */
export const AUDIT_CATEGORIES = {
  users: ["User", "Auth", "USER_AVATAR", "UserAchievement", "UserBan", "UserMembership"],
  content: [
    "Mod",
    "ModVersion",
    "Game",
    "GameMode",
    "GameCategory",
    "MOD_SCREENSHOT",
    "SOUND_PREVIEW",
    "ContentReport",
    "DMCAClaim",
    "Achievement",
    "Announcement",
    "Collection",
    "MediaAsset",
  ],
  shop: [
    "LicenseKey",
    "Coupon",
    "Payout",
    "CustomOrder",
    "CommissionRule",
    "Order",
    "Purchase",
    "MembershipPurchase",
    "MembershipPlan",
    "Subscription",
  ],
  tickets: ["SupportTicket"],
  partners: ["CreatorProfile", "PartnerProfile", "HostingPartner", "HostingPartnerBanner", "Application"],
  system: ["SiteSetting", "TeamMember", "TeamDepartment", "ApiKey", "PermissionGroup", "FeatureFlag", "IpBan"],
} as const;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES | "other";
export const AUDIT_CATEGORY_KEYS = [...(Object.keys(AUDIT_CATEGORIES) as (keyof typeof AUDIT_CATEGORIES)[]), "other"] as const;

const KNOWN = new Map<string, AuditCategory>(
  Object.entries(AUDIT_CATEGORIES).flatMap(([cat, types]) => types.map((t) => [t, cat as AuditCategory]))
);

export function auditCategoryOf(entityType: string): AuditCategory {
  return KNOWN.get(entityType) ?? "other";
}

export function allKnownAuditEntityTypes(): string[] {
  return Array.from(KNOWN.keys());
}

/** IPv4 → „203.0.x.x“, IPv6 → erste zwei Blöcke. Gespeichert wird nur diese Form (plus Hash), nie die volle IP. */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : null;
  }
  const groups = ip.split(":").filter(Boolean);
  return groups.length >= 2 ? `${groups[0]}:${groups[1]}:…` : null;
}
