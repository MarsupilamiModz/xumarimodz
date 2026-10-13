/**
 * Rechteprüfung pro ACP-Route (statisch, ohne Datenbank):
 *  1. Jede ACP-Seite prüft Rechte selbst (nicht nur über das Layout).
 *  2. Jeder Menüpunkt verlangt auf der Seite dasselbe Recht wie im Menü (oder ein strengeres).
 *  3. Jede exportierte Server-Action unter src/actions/admin prüft Rechte.
 *  4. Jede Route unter src/app/api/admin prüft Anmeldung und Recht.
 *
 * Ausführen: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ADMIN = join(root, "src/app/[locale]/admin");

function walk(dir, name) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p, name));
    else if (typeof name === "string" ? entry === name : name.test(entry)) out.push(p);
  }
  return out;
}

/** Bewusst öffentliche Actions bzw. Routen, deren Prüfung in der aufgerufenen Action liegt – jeweils mit Grund. */
const PUBLIC_ACTIONS = new Map([
  ["announcements.ts:getActiveAnnouncements", "Ankündigungsleiste der Webseite, filtert nach Zielgruppe des Besuchers"],
  ["announcements.ts:getGuestAnnouncements", "Ankündigungsleiste für Gäste (nur Zielgruppe „alle“), ohne Sitzung – Startseite bleibt cachebar"],
  ["referrals.ts:captureReferralClick", "zählt Klicks auf Empfehlungslinks von Besuchern"],
  ["trust.ts:submitDMCAClaim", "öffentliches DMCA-Formular, per IP begrenzt"],
]);
const DELEGATED_ROUTES = new Map([
  ["health/route.ts", "getOwnerHealthMonitor() prüft die Owner-Rolle"],
]);

const PAGE_GUARD = /await\s+(requirePagePermission\(\s*"([\w.]+)"\s*\)|requireAdmin\(\)|requireOwner\(\)|requireStaff\(\)|requireRole\()/;

test("jede ACP-Seite prüft Rechte serverseitig", () => {
  const missing = walk(ADMIN, "page.tsx").filter((p) => {
    const src = readFileSync(p, "utf8");
    return src.startsWith('"use client"') || !PAGE_GUARD.test(src);
  });
  assert.deepEqual(missing.map((p) => relative(root, p)), []);
});

test("Menüpunkte und Seiten verlangen dasselbe Recht", () => {
  const layout = readFileSync(join(ADMIN, "layout.tsx"), "utf8");
  const links = [...layout.matchAll(/\{\s*href:\s*"([^"]*)",\s*key:\s*"[^"]+",\s*permission:\s*"([\w.]+)"\s*\}/g)].map((m) => ({ href: m[1], permission: m[2] }));
  assert.ok(links.length > 20, "Menü nicht gefunden");

  const problems = [];
  for (const { href, permission } of links) {
    const file = join(ADMIN, href, "page.tsx");
    if (!existsSync(file)) {
      problems.push(`${href || "/"}: Seite fehlt`);
      continue;
    }
    const src = readFileSync(file, "utf8");
    // Dashboard ist für alle Team-Rollen die Startseite; die Kennzahlen prüfen analytics.read in der Action.
    if (href === "") continue;
    const strict = /await\s+(requireAdmin|requireOwner)\(\)/.test(src);
    const own = src.match(/await\s+requirePagePermission\(\s*"([\w.]+)"\s*\)/)?.[1];
    if (!strict && own !== permission) problems.push(`${href}: Menü ${permission}, Seite ${own ?? "keins"}`);
  }
  assert.deepEqual(problems, []);
});

test("jede ACP-Server-Action prüft Rechte", () => {
  const dir = join(root, "src/actions/admin");
  const problems = [];
  for (const file of walk(dir, /\.ts$/)) {
    const src = readFileSync(file, "utf8");
    if (!src.includes('"use server"')) continue;
    // Lokale Hilfsfunktionen (z. B. requireHostingAdmin), die selbst eine Rechteprüfung aufrufen, zählen als Prüfung.
    const localGuards = [...src.matchAll(/^async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)^\}/gm)]
      .filter((m) => /requireAction\w*\(|requireAny\w*Permission\(|requireAdmin\(|requireOwner\(/.test(m[2]))
      .map((m) => m[1]);
    const guardCall = new RegExp(`await\\s+(requireAction\\w+|requireAny\\w*Permission|requireAdmin|requireOwner|requireStaff|requireAuthApi${localGuards.map((g) => `|${g}`).join("")})\\(`);
    // Funktionsrümpfe grob trennen: von „export async function“ bis zur nächsten.
    const parts = src.split(/(?=^export async function )/m).filter((p) => p.startsWith("export async function "));
    for (const part of parts) {
      const name = part.match(/^export async function (\w+)/)[1];
      // Geschützt: eigene Prüfung oder Weitergabe an eine andere (geprüfte) Action derselben Datei.
      const delegates = [...part.matchAll(/return\s+(\w+)\(/g)].some((m) => m[1] !== "ok" && m[1] !== "fail" && src.includes(`export async function ${m[1]}(`));
      const guarded = guardCall.test(part) || delegates;
      const key = `${file.split(/[\\/]/).pop()}:${name}`;
      if (!guarded && !PUBLIC_ACTIONS.has(key)) problems.push(`${relative(root, file)}: ${name}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("jede /api/admin-Route prüft Anmeldung und Recht", () => {
  const dir = join(root, "src/app/api/admin");
  const problems = walk(dir, "route.ts").filter((p) => {
    const rel = relative(dir, p).replace(/\\/g, "/");
    if (DELEGATED_ROUTES.has(rel)) return false;
    const src = readFileSync(p, "utf8");
    const auth = /requireAuthApi\(|requireActionPermission\(|requireAdmin\(|requireOwner\(/.test(src);
    const perm = /hasPermission\(|userHasPermission\(|requireActionPermission\(|requireAdmin\(|requireOwner\(|isAdmin\(/.test(src);
    return !(auth && perm);
  });
  assert.deepEqual(problems.map((p) => relative(root, p)), []);
});
