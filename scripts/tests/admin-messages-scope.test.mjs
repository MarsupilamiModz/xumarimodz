/**
 * Das Locale-Layout schickt die admin.*-Texte nicht an den Browser (Nutzlast jeder Seite).
 * Nur /admin und /designer liefern sie per AdminIntlProvider nach. Dieser Test stellt sicher,
 * dass Client-Komponenten mit admin.*-Namespace nur von diesen Bereichen eingebunden werden.
 * Ausführen: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, normalize, sep, relative } from "node:path";

const ALLOWED = new Set(["admin", "designer"]);
const APP = normalize("src/app/[locale]");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(normalize(p));
  }
  return out;
}

const files = walk("src");
const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

function resolve(spec, from) {
  let base;
  if (spec.startsWith("@/")) base = join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = join(dirname(from), spec);
  else return null;
  for (const c of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    const n = normalize(c);
    if (sources.has(n) || existsSync(n)) return n;
  }
  return null;
}

const importers = new Map();
for (const [file, src] of sources) {
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
    const target = resolve(m[1], file);
    if (!target) continue;
    if (!importers.has(target)) importers.set(target, new Set());
    importers.get(target).add(file);
  }
}

test("Client-Komponenten mit admin.*-Texten nur unter /admin und /designer", () => {
  const offenders = [];
  let checked = 0;
  for (const [file, src] of sources) {
    if (!/^["']use client["']/m.test(src) || !/useTranslations\(\s*"admin(?:\.|")/.test(src)) continue;
    checked++;
    const seen = new Set();
    const stack = [file];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const imp of importers.get(cur) ?? []) stack.push(imp);
    }
    for (const reached of seen) {
      if (!reached.startsWith(APP + sep)) continue;
      const area = relative(APP, reached).split(sep)[0];
      // Das Locale-Layout selbst (und Dateien direkt darunter) gilt als öffentlich.
      if (!ALLOWED.has(area)) offenders.push(`${file} ← ${reached}`);
    }
  }
  assert.ok(checked > 40, `nur ${checked} ACP-Client-Komponenten gefunden – Suchmuster prüfen`);
  assert.deepEqual(offenders, []);
});
