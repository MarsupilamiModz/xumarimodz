# XumariModz

Premium multi-game mods marketplace — GTA V / FiveM, Minecraft, ETS2, BeamNG, Assetto Corsa and more.

## Stack

- **Next.js 15** App Router · React 19 · TypeScript · Tailwind (Design-Tokens, siehe `docs/DESIGN-GUIDE.md`)
- **Supabase** Auth (email + Discord OAuth)
- **Prisma** (ohne Rust-Engine, `pg`-Adapter) + PostgreSQL
- **Stripe** subscriptions & purchases
- **Cloudflare R2** file storage
- **next-intl** (DE, EN, FR, ES, PL, TR – Englisch als Rückfall)
- **Cloudflare Workers** über OpenNext – Anleitung: `docs/CLOUDFLARE.md`

## Quick start

```bash
npm install
cp env.example .env
# Configure Supabase, DATABASE_URL, Stripe, R2, Discord

npm run db:generate   # prisma generate + Workers-Anpassung
npx prisma db push
npm run db:seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy auf Cloudflare

```bash
npm run cf:preview   # lokal in der Workers-Laufzeit testen
npm run cf:deploy    # bauen (ohne Geheimnisse im Bundle) und deployen
```

Einmalige Einrichtung (Login, R2-Bucket, Hyperdrive, Secrets): `docs/CLOUDFLARE.md`.

## First admin

```sql
UPDATE "User" SET role = 'OWNER' WHERE email = 'you@example.com';
```

## Game management

Admins → **Games** → create/edit games, upload icons & banners, set SEO fields and featured status. Homepage and `/games` load from the database only (no hardcoded fallbacks).

## Stripe webhook

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## License

Proprietary — XumariModz. All rights reserved.
