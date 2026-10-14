# Hosting auf Cloudflare Workers

Die App läuft als ein Cloudflare Worker über den Adapter [OpenNext](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`). Statische Dateien kommen aus Workers Static Assets, der Rest (Seiten, API,
Server Actions, Middleware) aus dem Worker. Konfiguration: `wrangler.jsonc`, `open-next.config.ts`,
Einstieg mit Cron: `cloudflare/worker.ts`.

## Voraussetzungen

- **Workers Paid** (5 $/Monat): das Worker-Bundle ist ~5,5 MiB gzip, Free erlaubt 3 MiB, Paid 10 MiB.
- Node 20+ und `npm install` (installiert auch `wrangler`).
- Unter Windows funktioniert der Build; OpenNext empfiehlt WSL für den Produktions-Build.

## Einmalige Einrichtung

```bash
npx wrangler login

# 1. Bucket für den ISR-/Daten-Cache
npx wrangler r2 bucket create xumarimodz-next-cache

# 2. Hyperdrive vor der Supabase-Datenbank (dringend empfohlen, siehe unten)
npx wrangler hyperdrive create xumarimodz-db --connection-string="<DIRECT_URL aus .env>"
#    → ausgegebene ID in wrangler.jsonc beim Block "hyperdrive" eintragen und einkommentieren

# 3. Server-Werte aus .env als Secrets hochladen (NEXT_PUBLIC_* werden übersprungen)
npm run cf:secrets

# 4. Cron-Secret setzen (für /api/cron/email und /api/cron/health)
npx wrangler secret put CRON_SECRET
```

Danach in **Workers & Pages → xumarimodz → Settings → Domains & Routes** die Domain
`www.xumari-modz.com` als Custom Domain hinzufügen (die Zone muss bei Cloudflare liegen).
Stimmt `NEXT_PUBLIC_APP_URL` in `.env` und `wrangler.jsonc` nicht mit der Domain überein, dort anpassen.

## Deploy

```bash
npm run cf:deploy     # Build + Bereinigung + Deploy
npm run cf:upload     # dasselbe, aber als neue Version ohne Sofort-Umschaltung
npm run cf:preview    # lokal in workerd (wrangler dev) testen
```

`npm run cf:build` ruft `opennextjs-cloudflare build` auf und entfernt danach alle Werte aus `.env`,
die nicht `NEXT_PUBLIC_*` sind, aus der Build-Ausgabe (OpenNext würde sie sonst ins Worker-Skript
einbetten). Steht trotzdem ein Geheimnis in `.open-next/`, bricht der Build ab.

### Deploy aus Git (Workers Builds)

Repository unter **Workers & Pages → Create → Import a repository** verbinden.
- Build command: `npm run cf:build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build-Variablen: alle `NEXT_PUBLIC_*` aus `.env` sowie `DATABASE_URL` und `DIRECT_URL`
  (der Build rendert Seiten mit Daten vor). Laufzeit-Secrets bleiben die aus `npm run cf:secrets`.

## Datenbank

`src/lib/db.ts` nutzt Prisma ohne Rust-Engine (`engineType = "client"`) mit dem `pg`-Adapter:
- **Node** (`next dev`, `next start`, Skripte): ein Client pro Prozess, wie bisher.
- **Workers**: ein Client pro Request (Verbindungen dürfen dort nicht zwischen Requests geteilt werden).
  Mit `HYPERDRIVE`-Binding kommt die Verbindung aus dem Hyperdrive-Pool am Edge, ohne Binding direkt
  über `DATABASE_URL`.

Warum Hyperdrive: Ohne Pool baut jeder Request eine neue Verbindung nach eu-west-1 auf. Außerdem schlug
die TLS-Aushandlung von `pg` mit dem Supabase-Pooler in der lokalen Workers-Laufzeit (Windows) fehl;
Hyperdrive übernimmt TLS zur Datenbank selbst. Für lokales `cf:preview` ohne Hyperdrive in `.dev.vars`
(gitignored, Vorlage `.dev.vars.example`) die Werte aus `.env` eintragen und an `DATABASE_URL`
`&sslmode=disable` anhängen – nur lokal.

`scripts/prisma-workerd.mjs` läuft nach jedem `prisma generate` und stellt im generierten Client die
Bedingung `workerd` vor `node`, damit der Cloudflare-Build die WASM-Variante bündelt.

## Was sich für Workers geändert hat

| Thema | Lösung |
| --- | --- |
| Next.js 14 nicht mehr unterstützt | Upgrade auf Next 15.5 / React 19 |
| `readFileSync` auf `src/messages` | gebündelte JSON-Importe (`src/messages/files.ts`) |
| `ads.txt` nach `public/` geschrieben | nur noch dynamische Route `src/app/ads.txt` |
| Self-Fetch auf die eigene Domain | Service-Binding `WORKER_SELF_REFERENCE` (`src/lib/self-fetch.ts`) |
| Arbeit nach der Antwort (`void …()`) | `runAfterResponse` → `after()` → `waitUntil` |
| geteilte Job-Queue | `after()` pro Request (`src/lib/background-jobs.ts`) |
| `os`-Kennzahlen im ACP | `src/lib/host-metrics.ts`, in Workers Nullwerte |
| `Prisma.dmmf` | `Prisma.ModelName` / `…ScalarFieldEnum` |
| externer Cron | Cron Triggers in `wrangler.jsonc` → `cloudflare/worker.ts` |
| nodemailer | nur noch bei SMTP geladen; Live nutzt Microsoft Graph (HTTP) |

## Bekannte Grenzen

- `sharp` gibt es in Workers nicht: Avatare und Banner werden ohne Umwandlung nach WebP/AVIF
  gespeichert (der Code hatte diesen Rückfall schon). Bilder liefert `next/image` über Cloudflare Images.
- SMTP-Versand (nodemailer) ist in Workers ungetestet; Microsoft Graph und Resend laufen über HTTP.
- `syncMissingUiKeysFromEnglish` (ACP) schreibt Quelldateien und geht nur lokal; Live-Texte über
  ACP → Lokalisierung.
- Cron Triggers laufen lokal nicht automatisch (`wrangler dev --test-scheduled`, dann
  `/__scheduled?cron=*/5+*+*+*+*` aufrufen).
