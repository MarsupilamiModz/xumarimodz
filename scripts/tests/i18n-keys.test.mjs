/**
 * i18n-Prüfungen ohne Build: Jeder im Code benutzte Toast-Schlüssel „toast.<key>“ muss in
 * Englisch (Fallback aller Sprachen) und Deutsch existieren, sonst sähe man den rohen Schlüssel.
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
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const file of walk("src")) {
  for (const m of readFileSync(file, "utf8").matchAll(/"toast\.([A-Za-z0-9]+)"/g)) used.add(m[1]);
}

for (const locale of ["en", "de"]) {
  test(`alle benutzten Toast-Schlüssel existieren (${locale})`, () => {
    const messages = JSON.parse(readFileSync(`src/messages/${locale}/toast.json`, "utf8")).toast;
    const missing = [...used].filter((k) => typeof messages[k] !== "string");
    assert.deepEqual(missing, []);
  });
}

test("Toast-Schlüssel werden überhaupt gefunden", () => {
  assert.ok(used.size > 20, `nur ${used.size} Schlüssel gefunden`);
});
