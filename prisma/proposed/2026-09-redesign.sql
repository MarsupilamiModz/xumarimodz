-- Xumari Modz Redesign – Datenbank-Änderungen (NICHT automatisch ausgeführt)
--
-- Teil A: Indizes. Sie stehen bereits in prisma/schema.prisma und ändern keine Abfragen.
--         Auf der Live-Datenbank ohne Tabellensperre anlegen (jede Anweisung einzeln,
--         nicht in einer Transaktion – CONCURRENTLY erlaubt das nicht):
--
--   psql "$DIRECT_URL" -f prisma/proposed/2026-09-redesign.sql
--
-- Alternativ legt `npx prisma db push` sie an (dann aber mit kurzer Sperre je Tabelle).

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Mod_gameId_status_updatedAt_idx"
  ON "Mod" ("gameId", "status", "updatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupportTicket_status_updatedAt_idx"
  ON "SupportTicket" ("status", "updatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "MembershipPurchase_createdAt_idx"
  ON "MembershipPurchase" ("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ModPurchase_createdAt_idx"
  ON "ModPurchase" ("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_entityType_createdAt_idx"
  ON "AuditLog" ("entityType", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_action_entityId_idx"
  ON "AuditLog" ("action", "entityId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserMembership_isLifetime_status_renewalDate_idx"
  ON "UserMembership" ("isLifetime", "status", "renewalDate");

-- Bereits vorhanden (laut Spezifikation gefordert, keine Änderung nötig):
--   Mod(authorId), User(role), AuditLog(createdAt), Mod(gameId, status)

-- Teil B: Vorschläge für neue Spalten (auskommentiert).
-- Erst ausführen, wenn der zugehörige Code umgestellt wird – Prisma würde die Felder sonst
-- in jeder Abfrage erwarten. Reihenfolge: SQL ausführen → Felder in schema.prisma ergänzen
-- → `npx prisma generate` → Code nutzt die Felder.
--
-- B1: Newsletter-Einwilligung (ACP → E-Mail: Empfängerzahl nur mit Zustimmung)
-- ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "newsletterConsent" BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "newsletterConsentAt" TIMESTAMP(3);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_newsletterConsent_idx" ON "User" ("newsletterConsent") WHERE "newsletterConsent";
--
-- B2: Erstattete Käufe (ACP → Käufe: Zugang bei Mod-Käufen nach Erstattung entziehen)
-- ALTER TABLE "ModPurchase" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
-- ALTER TABLE "MembershipPurchase" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
