// Cloudflare-Build: `opennextjs-cloudflare build` und danach Geheimnisse aus der Ausgabe entfernen.
//
// OpenNext bettet alle Werte aus .env* in .open-next/cloudflare/next-env.mjs ein – damit stünden
// Datenbank-, Stripe- und API-Schlüssel im Worker-Skript. Behalten werden nur NEXT_PUBLIC_*-Werte
// (die stehen ohnehin im Browser-Code); alles andere kommt zur Laufzeit aus `wrangler secret`
// (npm run cf:secrets). Zum Schluss wird geprüft, dass kein Geheimnis-Wert mehr in .open-next steht.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".open-next";
const ENV_FILES = [".env", ".env.production", ".env.local", ".env.production.local"];

const build = spawnSync("npx", ["opennextjs-cloudflare", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 1. next-env.mjs auf öffentliche Werte reduzieren
const nextEnvPath = join(OUT, "cloudflare", "next-env.mjs");
const nextEnv = await import(new URL(`file:///${join(process.cwd(), nextEnvPath).replace(/\\/g, "/")}`).href);
const publicOnly = (vars) => Object.fromEntries(Object.entries(vars ?? {}).filter(([key]) => key.startsWith("NEXT_PUBLIC_")));
writeFileSync(
  nextEnvPath,
  ["production", "development", "test"]
    .map((mode) => `export const ${mode} = ${JSON.stringify(publicOnly(nextEnv[mode]))};\n`)
    .join("")
);

// 2. Mitkopierte .env-Dateien aus der Ausgabe löschen
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const files = walk(OUT);
for (const file of files) {
  if (/(^|[\\/])\.env(\.[\w.-]+)?$/.test(file)) rmSync(file);
}

// 3. Kontrolle: kein Geheimnis-Wert (≥ 12 Zeichen, nicht NEXT_PUBLIC_) in Code-Dateien der Ausgabe
const secrets = new Map();
for (const envFile of ENV_FILES.filter((f) => existsSync(f))) {
  for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    const eq = line.indexOf("=");
    if (!line || line.startsWith("#") || eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!key.startsWith("NEXT_PUBLIC_") && value.length >= 12) secrets.set(key, value);
  }
}
// Werte, die ohnehin öffentlich sind (z. B. eine Bild-Domain), nicht als Leck werten
const publicValues = new Set(Object.values(publicOnly(nextEnv.production)));
const leaks = new Set();
for (const file of walk(OUT).filter((f) => /\.(m?js|cjs|json|html|rsc|body|meta)$/.test(f))) {
  const content = readFileSync(file, "utf8");
  for (const [key, value] of secrets) {
    if (!publicValues.has(value) && key !== "R2_PUBLIC_URL" && content.includes(value)) leaks.add(`${key} in ${file}`);
  }
}
if (leaks.size) {
  console.error("\nGeheimnisse in der Build-Ausgabe gefunden – Deploy abgebrochen:\n  " + [...leaks].join("\n  "));
  process.exit(1);
}
console.log(`\ncf-build: next-env.mjs auf ${Object.keys(publicOnly(nextEnv.production)).length} öffentliche Werte reduziert, keine Geheimnisse in ${OUT}/.`);
