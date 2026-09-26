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
  // Nur Literale, die direkt an toast() gehen – nicht t("toast.x") eines eigenen Namespace.
  for (const m of readFileSync(file, "utf8").matchAll(/(?<!\w\()"toast\.([A-Za-z0-9]+)"/g)) used.add(m[1]);
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

// Alle Komponenten mit festem Namespace: jeder t("key") muss in en und de existieren.
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") flatten(v, `${prefix}${k}.`, out);
    else out.add(prefix + k);
  }
  return out;
}

for (const locale of ["en", "de"]) {
  test(`t()-Schlüssel mit festem Namespace existieren (${locale})`, () => {
    const keys = new Set();
    for (const name of readdirSync(`src/messages/${locale}`)) {
      if (!name.endsWith(".json")) continue;
      const data = JSON.parse(readFileSync(`src/messages/${locale}/${name}`, "utf8"));
      // search.json hat keinen Wrapper, load.ts hängt es unter „search“ ein.
      flatten(name === "search.json" ? { search: data } : data, "", keys);
    }
    const decl = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g;
    const missing = [];
    for (const file of walk("src")) {
      const src = readFileSync(file, "utf8");
      const decls = [...src.matchAll(decl)].map((d) => ({ at: d.index, variable: d[1], ns: d[2] }));
      for (const variable of new Set(decls.map((d) => d.variable))) {
        const call = new RegExp(String.raw`\b${variable}(?:\.rich|\.raw|\.markup)?\(\s*"([^"]+)"`, "g");
        for (const c of src.matchAll(call)) {
          // Gleicher Variablenname in mehreren Komponenten einer Datei: die nächste vorherige Deklaration gilt.
          const owner = decls.filter((d) => d.variable === variable && d.at < c.index).at(-1);
          if (!owner) continue;
          const key = `${owner.ns}.${c[1]}`;
          if (!keys.has(key)) missing.push(`${file}: ${key}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });
}
