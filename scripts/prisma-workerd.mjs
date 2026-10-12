// Läuft nach `prisma generate`: setzt im generierten Client die Export-Bedingung "workerd" vor "node".
//
// Der Cloudflare-Build (OpenNext/esbuild, Plattform node) hat "node" und "workerd" gleichzeitig aktiv;
// esbuild nimmt die erste passende Bedingung in Dateireihenfolge – bei Prisma "node" (index.js, liest
// die WASM-Datei per fs → in Workers „no such file“). Mit "workerd" zuerst wird wasm.js gebündelt.
// Node selbst (next start, Skripte) kennt "workerd" nicht und nutzt weiter index.js.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = "node_modules/.prisma/client/package.json";
if (!existsSync(file)) {
  console.warn(`[prisma-workerd] ${file} fehlt – erst prisma generate ausführen`);
  process.exit(0);
}

const FIRST = ["workerd", "worker", "edge-light"];
function reorder(conditions) {
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) return conditions;
  const entries = Object.entries(conditions).map(([k, v]) => [k, reorder(v)]);
  if (!entries.some(([k]) => k === "node")) return Object.fromEntries(entries);
  const first = entries.filter(([k]) => FIRST.includes(k));
  const rest = entries.filter(([k]) => !FIRST.includes(k));
  return Object.fromEntries([...first, ...rest]);
}

const pkg = JSON.parse(readFileSync(file, "utf8"));
if (pkg.exports) pkg.exports = reorder(pkg.exports);
if (pkg.imports) pkg.imports = reorder(pkg.imports);
writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("[prisma-workerd] Export-Bedingungen umsortiert (workerd vor node)");
