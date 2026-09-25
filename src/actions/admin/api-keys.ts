"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  generateApiKey,
  API_SCOPES,
  resolvePresetScopes,
  type ApiScope,
} from "@/lib/api-auth";

export async function listApiKeysAdmin() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  // Hash nie an den Client geben: explizite Feldauswahl.
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      ipWhitelist: true,
      isActive: true,
      requestCount: true,
      errorCount: true,
      uploadCount: true,
      uploadBytes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      createdBy: { select: { username: true } },
    },
  });

  const totals = await prisma.apiKey.aggregate({
    _sum: { requestCount: true, errorCount: true, uploadCount: true, uploadBytes: true },
    _count: true,
  });

  const recentLogs = await prisma.auditLog.findMany({
    where: { entityType: "ApiKey" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, entityId: true, createdAt: true, metadata: true },
  });

  return ok({ keys, totals, recentLogs });
}

export async function createApiKeyAdmin(input: {
  name: string;
  description?: string;
  scopes: (ApiScope | "*")[];
  rateLimit?: number;
  expiresAt?: string;
  ipWhitelist?: string[];
  preset?: keyof typeof import("@/lib/api-auth").API_KEY_PRESETS;
}) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  if (!input.name.trim()) return fail("Name required");
  // Schutz gegen versehentliches oder automatisiertes Massen-Erzeugen: 10 Schlüssel pro Stunde und Admin.
  if (!rateLimit(`api-key-create:${user.id}`, 10, 60 * 60 * 1000).success) return fail("Too many keys created. Try again later.");

  let scopes = input.preset ? resolvePresetScopes(input.preset) : input.scopes.filter(Boolean).map(String);
  if (!input.preset) {
    scopes = scopes.filter((s) => s === "*" || API_SCOPES.includes(s as ApiScope));
  }
  if (scopes.length === 0) return fail("At least one scope required");

  const { raw, prefix, hash } = generateApiKey();

  const key = await prisma.apiKey.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      rateLimit: input.rateLimit ?? 1000,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      ipWhitelist: input.ipWhitelist?.filter(Boolean) ?? [],
      createdById: user.id,
    },
  });

  await createAuditLog({
    actorId: user.id,
    action: "api_key.create",
    entityType: "ApiKey",
    entityId: key.id,
    metadata: { name: key.name, prefix, scopes },
  });

  revalidatePath("/admin/api-keys");
  return ok({ id: key.id, key: raw, prefix });
}

export async function revokeApiKeyAdmin(keyId: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const key = await prisma.apiKey.findUnique({ where: { id: keyId }, select: { name: true, keyPrefix: true, isActive: true } });
  if (!key) return fail("API key not found");
  if (!key.isActive) return ok(undefined);

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });
  await createAuditLog({
    actorId: user.id,
    action: "api_key.revoke",
    entityType: "ApiKey",
    entityId: keyId,
    metadata: { name: key.name, prefix: key.keyPrefix },
  });

  revalidatePath("/admin/api-keys");
  return ok(undefined);
}

export async function updateApiKeyAdmin(
  keyId: string,
  input: {
    name?: string;
    description?: string;
    scopes?: (ApiScope | "*")[];
    rateLimit?: number;
    isActive?: boolean;
    ipWhitelist?: string[];
  }
) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const scopes = input.scopes?.filter((s) => s === "*" || API_SCOPES.includes(s as ApiScope));

  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(scopes && scopes.length > 0 && { scopes }),
      ...(input.rateLimit !== undefined && { rateLimit: input.rateLimit }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.ipWhitelist !== undefined && { ipWhitelist: input.ipWhitelist.filter(Boolean) }),
    },
  });
  await createAuditLog({
    actorId: user.id,
    action: "api_key.update",
    entityType: "ApiKey",
    entityId: keyId,
    metadata: { fields: Object.keys(input) },
  });

  revalidatePath("/admin/api-keys");
  return ok(undefined);
}
