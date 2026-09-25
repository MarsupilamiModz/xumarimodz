-- Xumari Modz Redesign – Datenbank-Änderungen (nur hinzufügen, nichts löschen)
--
-- Angewendet auf die Live-Datenbank am 26.09.2026 über den Supabase-Session-Pooler.
-- Idempotent: kann erneut ausgeführt werden. Jede Anweisung einzeln ausführen (nicht in einer Transaktion),
-- weil CREATE INDEX CONCURRENTLY keine Transaktion erlaubt.
--
-- WICHTIG: Nicht `prisma db push` verwenden, solange nicht sicher ist, dass schema.prisma alle Live-Indizes
-- enthält – push löscht Indizes, die nur in der Datenbank existieren. Der Stand wurde mit
-- `prisma migrate diff` geprüft: danach keine Unterschiede mehr.

-- 1) Neue Spalten (kurze Sperre, bricht nach 5 s ab statt Anfragen zu blockieren)
DO $$ BEGIN SET LOCAL lock_timeout = '5s'; ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "newsletterConsent" BOOLEAN NOT NULL DEFAULT false; ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "newsletterConsentAt" TIMESTAMP(3); END $$;
DO $$ BEGIN SET LOCAL lock_timeout = '5s'; ALTER TABLE "ModPurchase" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3); END $$;
DO $$ BEGIN SET LOCAL lock_timeout = '5s'; ALTER TABLE "MembershipPurchase" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3); END $$;
DO $$ BEGIN SET LOCAL lock_timeout = '5s'; ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "altText" TEXT; END $$;
DO $$ BEGIN SET LOCAL lock_timeout = '5s'; ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "campaignId" TEXT; END $$;

-- 2) Neue Tabelle für Rundmails
CREATE TABLE IF NOT EXISTS "EmailCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- 3) Fremdschlüssel (nur anlegen, wenn nicht vorhanden)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailCampaign_createdById_fkey') THEN SET LOCAL lock_timeout = '5s'; ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_campaignId_fkey') THEN SET LOCAL lock_timeout = '5s'; ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- 4) Indizes ohne Tabellensperre
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EmailCampaign_createdAt_idx" ON "EmailCampaign" ("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EmailLog_campaignId_idx" ON "EmailLog" ("campaignId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_entityType_createdAt_idx" ON "AuditLog" ("entityType", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_action_entityId_idx" ON "AuditLog" ("action", "entityId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MembershipPurchase_createdAt_idx" ON "MembershipPurchase" ("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ModPurchase_createdAt_idx" ON "ModPurchase" ("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserMembership_isLifetime_status_renewalDate_idx" ON "UserMembership" ("isLifetime", "status", "renewalDate");

-- Bereits auf Live vorhanden (jetzt auch in schema.prisma dokumentiert):
--   Mod(gameId, status, updatedAt), Mod(gameId, status, updatedAt DESC) [Name *_uploadedAt_idx],
--   SupportTicket(status, updatedAt DESC), User(role), User(role, isBanned), Mod(authorId), AuditLog(createdAt)
