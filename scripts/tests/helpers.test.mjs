/**
 * Unit-Tests für reine Hilfsfunktionen (Node ≥ 23.6 lädt .ts per Type-Stripping, keine Zusatzpakete).
 * Ausführen: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const { maskIp, auditCategoryOf } = await import("../../src/lib/audit-categories.ts");
const { buildVisibilityTargets, announcementKind, announcementChannels, audienceTargets, announcementVisibleTo } = await import(
  "../../src/lib/announcement-targeting.ts"
);
const { applySessionOnly } = await import("../../src/lib/supabase/session-cookie.ts");

test("maskIp zeigt nur den Anfang der Adresse", () => {
  assert.equal(maskIp("203.0.113.42"), "203.0.x.x");
  assert.equal(maskIp("2001:db8:85a3::8a2e:370:7334"), "2001:db8:…");
  assert.equal(maskIp("unknown"), null);
  assert.equal(maskIp(null), null);
});

test("Audit-Kategorien kommen aus dem entityType", () => {
  assert.equal(auditCategoryOf("User"), "users");
  assert.equal(auditCategoryOf("SupportTicket"), "tickets");
  assert.equal(auditCategoryOf("ApiKey"), "system");
  assert.equal(auditCategoryOf("MembershipPurchase"), "shop");
  assert.equal(auditCategoryOf("Unbekannt"), "other");
});

test("Ankündigungen: Art, Kanäle und Zielgruppe werden getrennt gespeichert", () => {
  const targets = buildVisibilityTargets(["premium", "ungültig"], "maintenance", ["website", "discord"]);
  assert.deepEqual(targets, ["premium", "kind:maintenance", "channel:website", "channel:discord"]);
  assert.equal(announcementKind(targets), "maintenance");
  assert.deepEqual(announcementChannels(targets), ["website", "discord"]);
  assert.deepEqual(audienceTargets(targets), ["premium"]);
  // Ältere Einträge ohne Präfixe: Neuigkeit, nur Webseite.
  assert.equal(announcementKind(["everyone"]), "news");
  assert.deepEqual(announcementChannels(["everyone"]), ["website"]);
});

test("Ankündigungen: Präfix-Einträge machen nichts für alle sichtbar", () => {
  const targets = buildVisibilityTargets(["premium"], "news", ["website"]);
  assert.equal(announcementVisibleTo(targets, null), false);
  assert.equal(announcementVisibleTo(targets, { role: "USER", hasPremium: true }), true);
  assert.equal(announcementVisibleTo(buildVisibilityTargets([], "news", ["website"]), null), true);
});

test("„Angemeldet bleiben“ aus: Cookies ohne Ablaufdatum, Löschungen bleiben erhalten", () => {
  const set = { path: "/", maxAge: 34560000, sameSite: "lax" };
  assert.deepEqual(applySessionOnly(set, true), { path: "/", sameSite: "lax" });
  assert.deepEqual(applySessionOnly(set, false), set);
  const remove = { path: "/", maxAge: 0 };
  assert.deepEqual(applySessionOnly(remove, true), remove);
});
