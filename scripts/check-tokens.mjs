// Prüft, dass Farben nur in den Token-Dateien stehen und beide Token-Dateien übereinstimmen.
// Aufruf: npm run check:tokens
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const TOKEN_CSS = join("src", "styles", "tokens.css");
const TOKEN_TS = join("src", "styles", "tokens.ts");

const PALETTE =
  "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITIES =
  "text|bg|border|border-[trblxy]|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret";

const checks = [
  { name: "Hex-Farbe", re: /(?<![&\w/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  { name: "rgb/hsl-Wert", re: /(?<![a-zA-Z])(?:rgba?|hsla?)\(\s*[\d.]+[\s,%]/g },
  {
    name: "Tailwind-Standardfarbe",
    // "violet" ohne Stufe ist ein Token (violet, violet-bright, …) und daher erlaubt.
    re: new RegExp(`\\b(?:${UTILITIES})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:\\/\\d+)?\\b`, "g"),
  },
  // Stil-Regeln: keine Verläufe, Glows, Glas-Effekte, alten Neon-Klassen
  { name: "Verlauf", re: /\bbg-gradient-to-[a-z]+\b|linear-gradient\(|radial-gradient\(/g },
  { name: "Alte Klasse", re: /(?<![\w-])(?:neon-(?:purple|blue|cyan)|glass|text-gradient|bg-hero-glow|shadow-neon)(?![\w-])/g },
  { name: "Blur/Glow", re: /(?<![\w-])backdrop-blur(?:-(?:[a-z0-9]+|\[[^\]]+\]))?(?![\w-])/g },
];

// Emojis nur in der Zuordnungstabelle für Daten-Symbole erlaubt
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/gu;
const EMOJI_ALLOWED = new Set(["src/components/ui/entity-icon.tsx", "src/lib/achievements.ts", "src/lib/creator-levels.ts", "src/actions/admin/branding.ts", "src/lib/order-workflow.ts"]);

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

const problems = [];

// 1. Farben außerhalb der Token-Dateien
const files = [
  ...walk(join(root, "src"), [".ts", ".tsx", ".css"]),
  ...walk(join(root, "public"), [".svg", ".webmanifest"]),
];
for (const file of files) {
  const rel = relative(root, file);
  if (rel === TOKEN_CSS || rel === TOKEN_TS) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // Bewusste Ausnahme, z. B. Vergleich mit alten Werten aus der Datenbank.
    if (line.includes("check-tokens: ignore")) return;
    const relPosix = rel.split(sep).join("/");
    for (const { name, re } of checks) {
      for (const match of line.matchAll(re)) {
        problems.push(`${relPosix}:${i + 1}  ${name}: ${match[0]}`);
      }
    }
    // Seed-Daten und Discord-Nachrichten dürfen Emojis enthalten (werden als Icon dargestellt bzw. sind extern).
    if (!EMOJI_ALLOWED.has(relPosix) && !relPosix.startsWith("src/messages/")) {
      for (const match of line.matchAll(EMOJI_RE)) {
        problems.push(`${relPosix}:${i + 1}  Emoji: ${match[0]}`);
      }
    }
  });
}

// 2. tokens.css und tokens.ts stimmen überein
const css = readFileSync(join(root, TOKEN_CSS), "utf8");
const ts = readFileSync(join(root, TOKEN_TS), "utf8");
const camel = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const toHex = (triple) =>
  "#" + triple.split(/\s+/).map((n) => Number(n).toString(16).padStart(2, "0")).join("");

for (const [, name, triple] of css.matchAll(/--([a-z0-9-]+):\s*(\d+ \d+ \d+);/g)) {
  const key = camel(name);
  const tsMatch = ts.match(new RegExp(`\\b${key}:\\s*"(#[0-9a-fA-F]{6})"`));
  if (!tsMatch) problems.push(`${TOKEN_TS}: Token "${key}" fehlt (aus --${name})`);
  else if (tsMatch[1].toLowerCase() !== toHex(triple)) {
    problems.push(`${TOKEN_TS}: "${key}" ist ${tsMatch[1]}, tokens.css hat ${toHex(triple)}`);
  }
}

if (problems.length) {
  console.error(`check:tokens – ${problems.length} Fundstelle(n):\n`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check:tokens – keine hart codierten Farben, Token-Dateien stimmen überein.");
