// Lädt die Server-Werte aus .env als Secrets in den Cloudflare Worker (wrangler secret bulk).
// NEXT_PUBLIC_* werden übersprungen: die baut der Build ein. Aufruf: npm run cf:secrets [-- datei]
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const file = process.argv[2] ?? ".env";
const secrets = {};
for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (key.startsWith("NEXT_PUBLIC_") || value === "") continue;
  secrets[key] = value;
}

const keys = Object.keys(secrets);
if (!keys.length) {
  console.error(`Keine Werte in ${file} gefunden.`);
  process.exit(1);
}
console.log(`Lade ${keys.length} Secrets hoch: ${keys.join(", ")}`);

const dir = mkdtempSync(join(tmpdir(), "cf-secrets-"));
const json = join(dir, "secrets.json");
try {
  writeFileSync(json, JSON.stringify(secrets), { mode: 0o600 });
  const res = spawnSync("npx", ["wrangler", "secret", "bulk", json], { stdio: "inherit", shell: process.platform === "win32" });
  process.exitCode = res.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
