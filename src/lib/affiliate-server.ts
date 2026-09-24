import "server-only";
import { createHash, randomBytes } from "crypto";

export function generateAffiliateCode(prefix = "MM") {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

export function visitorHash(ip: string, userAgent?: string) {
  return createHash("sha256")
    .update(`${ip}:${userAgent ?? "unknown"}`)
    .digest("hex")
    .slice(0, 24);
}
