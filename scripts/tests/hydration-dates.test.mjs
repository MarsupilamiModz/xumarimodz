/**
 * Hydration-Schutz: Client-Komponenten werden auf dem Server (UTC, Node-Standardsprache) und im
 * Browser (lokale Zeitzone/Sprache) gerendert. Datumsausgaben ohne feste Zeitzone ergeben
 * unterschiedlichen Text → „Hydration failed“. Erlaubt sind die Helfer aus format-locale/safe-locale
 * (feste Zeitzone DISPLAY_TIME_ZONE) oder Aufrufe mit explizitem timeZone.
 * Ausführen: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

test("Client-Komponenten formatieren Datum/Zeit nur mit fester Zeitzone", () => {
  const offenders = [];
  for (const file of walk("src")) {
    const src = readFileSync(file, "utf8");
    if (!/^["']use client["']/m.test(src)) continue;
    src.split("\n").forEach((line, i) => {
      const direct = /\.toLocale(Date|Time)String\(|new Date\([^)]*\)\.toLocaleString\(/.test(line);
      if (direct && !/timeZone/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test("Datums-Helfer liefern unabhängig von der Prozess-Zeitzone dasselbe", async () => {
  const { formatDayMonthYear, withTimeZone } = await import("../../src/lib/i18n/display-time.ts");
  // 22:30 UTC ist in Berlin (Sommerzeit) schon der nächste Tag.
  const d = new Date("2026-09-26T22:30:00Z");
  assert.equal(formatDayMonthYear(d), "27.09.2026");
  assert.equal(d.toLocaleTimeString("de-DE", withTimeZone({ hour: "2-digit", minute: "2-digit" })), "00:30");
});
