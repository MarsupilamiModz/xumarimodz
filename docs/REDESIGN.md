# Redesign Xumari Modz – Analyse und Stand

## Stack
- Next.js 14 App Router (`src/app/[locale]/…`), TypeScript, React 18
- Styling: Tailwind 3 mit Design-Tokens (`src/styles/tokens.css` + `tokens.ts`), Radix-Primitives
- Daten: Prisma + PostgreSQL (Supabase), Server Actions (`src/actions`), API-Routen (`src/app/api`)
- Auth: Supabase Auth; Rollen `UserRole` + Rechte-Gruppen (`lib/permissions`, `lib/permission-store`); ACP-Seiten prüfen serverseitig (`requireStaff`, `requirePagePermission`, `requireOwner`)
- i18n: next-intl, 6 Sprachen (de, en, es, fr, pl, tr), Nachrichten in `src/messages/<locale>/*.json`, Englisch als Rückfall
- Zahlungen: Stripe; E-Mail: nodemailer/Microsoft Graph mit Warteschlange; Speicher: Cloudflare R2
- Tests: keine vorhanden. Lint: ESLint nicht konfiguriert. Prüfungen: `tsc --noEmit`, `npm run check:tokens`

## Routen (151 Seiten)

| Route | Datei | Screen | Status | Hinweis |
|---|---|---|---|---|
| /admin/achievements | src/app/[locale]/admin/achievements/page.tsx | ACP Erfolge | nach Spezifikation | Editor mit Badge-Vorschau, Bedingung + Schwelle, Seltenheit |
| /admin/ads | src/app/[locale]/admin/ads/page.tsx | ACP Werbung | nach Spezifikation | Schalter, Werbeflächen, Kampagnen |
| /admin/analytics | src/app/[locale]/admin/analytics/page.tsx | ACP Analytics | nach Spezifikation | Zeitraum-Chips, KPIs, Balkendiagramm, Top-Mods, Herkunft, nach Spiel |
| /admin/announcements | src/app/[locale]/admin/announcements/page.tsx | ACP Ankündigungen | nach Spezifikation | Liste, Editor, Live-Vorschau, Art, Zeitraum, Ziele; App/Discord-Anbindung offen |
| /admin/api-keys | src/app/[locale]/admin/api-keys/page.tsx | ACP API-Schlüssel | nach Spezifikation | einmalige Anzeige, Hash, Widerruf mit Bestätigung, Audit, Rate-Limit |
| /admin/applications | src/app/[locale]/admin/applications/page.tsx | ACP Bewerbungen | nach Spezifikation | Kanban mit Detaildialog |
| /admin/audit | src/app/[locale]/admin/audit/page.tsx | ACP Audit-Log | nach Spezifikation | Kategorien, Freitext, maskierte IP, CSV |
| /admin/banners | src/app/[locale]/admin/banners/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/branding | src/app/[locale]/admin/branding/page.tsx | ACP Inhalte | neues Design (Okt. 2026) | Live-Vorschau fehlt |
| /admin/chat | src/app/[locale]/admin/chat/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/collections | src/app/[locale]/admin/collections/page.tsx | ACP Sammlungen | nach Spezifikation | Karten, Editor, Drag & Drop, Mod-Suche |
| /admin/commissions | src/app/[locale]/admin/commissions/page.tsx | ACP Provisionen | nach Spezifikation | Auswahl freigeben, Regeln, Auszahlungen |
| /admin/coupons | src/app/[locale]/admin/coupons/page.tsx | ACP Gutscheine | nach Spezifikation |  |
| /admin/creators/[id] | src/app/[locale]/admin/creators/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/creators/new | src/app/[locale]/admin/creators/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/creators | src/app/[locale]/admin/creators/page.tsx | ACP Creator | nach Spezifikation | Tabelle; Detailseite noch alt |
| /admin/creators/visibility | src/app/[locale]/admin/creators/visibility/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/diagnostics/screenshots | src/app/[locale]/admin/diagnostics/screenshots/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/dmca | src/app/[locale]/admin/dmca/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/email | src/app/[locale]/admin/email/page.tsx | ACP E-Mail | nach Spezifikation | Newsletter mit Einwilligung, Live-Empfängerzahl, Test, Vorschau, Queue-Versand |
| /admin/email/templates | src/app/[locale]/admin/email/templates/page.tsx | ACP E-Mail-Vorlagen | nach Spezifikation | Platzhalter %…%, helle Vorschau |
| /admin/games/[id] | src/app/[locale]/admin/games/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/games/new | src/app/[locale]/admin/games/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/games | src/app/[locale]/admin/games/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/groups | src/app/[locale]/admin/groups/page.tsx | ACP Gruppen und Rechte | nach Spezifikation | Rollen-Karten, Rechte-Matrix, Owner gesperrt |
| /admin/leaderboards | src/app/[locale]/admin/leaderboards/page.tsx | ACP Bestenlisten | nach Spezifikation | Rangliste mit Anheften/Ausblenden, Gewichtung wirkt |
| /admin/licenses | src/app/[locale]/admin/licenses/page.tsx | ACP Lizenzen | nach Spezifikation | maskiert, Filter, Erzeugen mit CSV, Widerrufen |
| /admin/localization | src/app/[locale]/admin/localization/page.tsx | ACP Lokalisierung | nach Spezifikation | Fortschritt, „Nur fehlende“, JSON-Import/-Export |
| /admin/media | src/app/[locale]/admin/media/page.tsx | ACP Medien | neu gebaut | Verwendet-in/Alt-Text fehlen |
| /admin/memberships | src/app/[locale]/admin/memberships/page.tsx | ACP Mitgliedschaften | nach Spezifikation | manuelle Mitgliedschaften vergeben/entziehen; Plan-Editor noch englisch |
| /admin/moderation | src/app/[locale]/admin/moderation/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/mods/[id] | src/app/[locale]/admin/mods/[id]/page.tsx | ACP Mod bearbeiten | nach Spezifikation | Ungespeicherte Änderungen, Versionen, Bestätigungen |
| /admin/mods/new-sound | src/app/[locale]/admin/mods/new-sound/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/mods/new | src/app/[locale]/admin/mods/new/page.tsx | – | nach Spezifikation |  |
| /admin/mods | src/app/[locale]/admin/mods/page.tsx | ACP Mods | nach Spezifikation |  |
| /admin/orders/[id] | src/app/[locale]/admin/orders/[id]/page.tsx | – | neues Design (Okt. 2026) | Rechteprüfung ergänzt; Inhalt noch alt |
| /admin/orders | src/app/[locale]/admin/orders/page.tsx | ACP Bestellungen | nach Spezifikation | Status-Gruppen |
| /admin/owner/achievements | src/app/[locale]/admin/owner/achievements/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/owner/email | src/app/[locale]/admin/owner/email/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/owner/features | src/app/[locale]/admin/owner/features/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/owner/health | src/app/[locale]/admin/owner/health/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/owner/translations | src/app/[locale]/admin/owner/translations/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/owner/users/[id] | src/app/[locale]/admin/owner/users/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin | src/app/[locale]/admin/page.tsx | ACP Dashboard | nach Spezifikation | 6 KPIs, 4 Karten, gecacht |
| /admin/partner-ads | src/app/[locale]/admin/partner-ads/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/partners/[id] | src/app/[locale]/admin/partners/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/partners/new | src/app/[locale]/admin/partners/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/partners | src/app/[locale]/admin/partners/page.tsx | ACP Partner | nach Spezifikation | Tabelle; Detailseite noch alt |
| /admin/payments | src/app/[locale]/admin/payments/page.tsx | ACP Shop-Übersicht | neues Design (Okt. 2026) | Rechte korrigiert (settings.write); Inhalt noch nicht umgebaut |
| /admin/payout-settings | src/app/[locale]/admin/payout-settings/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/referrals | src/app/[locale]/admin/referrals/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/reports | src/app/[locale]/admin/reports/page.tsx | ACP Meldungen | neu gebaut |  |
| /admin/security | src/app/[locale]/admin/security/page.tsx | ACP Sicherheit | nach Spezifikation | 2FA-Status, Sitzungen, IP-Sperren (SiteSetting + Middleware), Passwort-Regeln, Captcha-Status |
| /admin/settings/media | src/app/[locale]/admin/settings/media/page.tsx | – | nach Spezifikation | Bibliothek mit Alt-Text |
| /admin/settings | src/app/[locale]/admin/settings/page.tsx | ACP Einstellungen | neu gebaut | Übersicht |
| /admin/shop | src/app/[locale]/admin/shop/page.tsx | ACP Produkte | neues Design (Okt. 2026) |  |
| /admin/subscriptions | src/app/[locale]/admin/subscriptions/page.tsx | ACP Käufe und Abos | nach Spezifikation | Tabs, Verlängern/Kündigen/Erstatten mit Audit |
| /admin/system | src/app/[locale]/admin/system/page.tsx | ACP Systemstatus | nach Spezifikation | echte Checks, 30-Tage-Verfügbarkeit (Cron empfohlen) |
| /admin/team | src/app/[locale]/admin/team/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/tickets/[id] | src/app/[locale]/admin/tickets/[id]/page.tsx | ACP Ticket-Detail | nach Spezifikation | Verlauf, Systemzeilen, Antwort/Notiz, Textbausteine, SLA, Seitenpanel |
| /admin/tickets | src/app/[locale]/admin/tickets/page.tsx | ACP Tickets | nach Spezifikation | Filter, Vorschau, Vollansicht |
| /admin/trust | src/app/[locale]/admin/trust/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/tutorials | src/app/[locale]/admin/tutorials/page.tsx | – | neues Design (Okt. 2026) |  |
| /admin/users/[id] | src/app/[locale]/admin/users/[id]/page.tsx | – | neues Design (Okt. 2026) | Kopf und Aktionen übersetzt; Detailkarten noch englisch |
| /admin/users | src/app/[locale]/admin/users/page.tsx | ACP Nutzer | nach Spezifikation | Suche, Rollen-/Status-Filter, Sperren mit Grund |
| /auth/sync-error | src/app/[locale]/auth/sync-error/page.tsx | – | neues Design (Okt. 2026) |  |
| /banned | src/app/[locale]/banned/page.tsx | – | neues Design (Okt. 2026) |  |
| /become-creator | src/app/[locale]/become-creator/page.tsx | W12 Creator-Bewerbung | neues Design (Okt. 2026) |  |
| /become-partner | src/app/[locale]/become-partner/page.tsx | W11 Partner-Bewerbung | neues Design (Okt. 2026) |  |
| /blog | src/app/[locale]/blog/page.tsx | – | neues Design (Okt. 2026) |  |
| /collections/[slug] | src/app/[locale]/collections/[slug]/page.tsx | – | neues Design (Okt. 2026) |  |
| /collections | src/app/[locale]/collections/page.tsx | – | neues Design (Okt. 2026) |  |
| /contact | src/app/[locale]/contact/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/analytics | src/app/[locale]/creator/analytics/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/codes | src/app/[locale]/creator/codes/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/collections/[id] | src/app/[locale]/creator/collections/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/collections/new | src/app/[locale]/creator/collections/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/collections | src/app/[locale]/creator/collections/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/exclusive/[id] | src/app/[locale]/creator/exclusive/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/exclusive/new | src/app/[locale]/creator/exclusive/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/exclusive | src/app/[locale]/creator/exclusive/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/hosting | src/app/[locale]/creator/hosting/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/licenses | src/app/[locale]/creator/licenses/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/mods/[id] | src/app/[locale]/creator/mods/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/mods/new | src/app/[locale]/creator/mods/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator | src/app/[locale]/creator/page.tsx | W14 Creator-Dashboard | neues Design (Okt. 2026) |  |
| /creator/payouts | src/app/[locale]/creator/payouts/page.tsx | – | neues Design (Okt. 2026) |  |
| /creator/settings | src/app/[locale]/creator/settings/page.tsx | – | neues Design (Okt. 2026) |  |
| /creators/[slug] | src/app/[locale]/creators/[slug]/page.tsx | W13 Creator-Profil | nach Spezifikation | Kopf mit Banner/Kennzahlen aus echten Mod-Daten, Creator-Code kopierbar, Mods mit Seiten |
| /creators | src/app/[locale]/creators/page.tsx | W12 Creator-Programm | nach Spezifikation | Übersicht ohne doppelte Abschnitte, Link zur Bewerbung |
| /custom-orders | src/app/[locale]/custom-orders/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/achievements | src/app/[locale]/dashboard/achievements/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/downloads | src/app/[locale]/dashboard/downloads/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/favorites | src/app/[locale]/dashboard/favorites/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/following | src/app/[locale]/dashboard/following/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/library | src/app/[locale]/dashboard/library/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/licenses | src/app/[locale]/dashboard/licenses/page.tsx | W9 Lizenzen | neues Design (Okt. 2026) |  |
| /dashboard/notifications | src/app/[locale]/dashboard/notifications/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/orders/[id] | src/app/[locale]/dashboard/orders/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/orders/[id]/requirements | src/app/[locale]/dashboard/orders/[id]/requirements/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/orders | src/app/[locale]/dashboard/orders/page.tsx | W9 Käufe | neues Design (Okt. 2026) |  |
| /dashboard | src/app/[locale]/dashboard/page.tsx | W9 Mein Konto | neues Design (Okt. 2026) | Übersicht; Unterseiten Design-Sweep |
| /dashboard/security | src/app/[locale]/dashboard/security/page.tsx | W9 Sicherheit | neu gebaut |  |
| /dashboard/settings | src/app/[locale]/dashboard/settings/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/subscription | src/app/[locale]/dashboard/subscription/page.tsx | W9 Abo | neues Design (Okt. 2026) |  |
| /dashboard/support/[id] | src/app/[locale]/dashboard/support/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/support/new | src/app/[locale]/dashboard/support/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /dashboard/support | src/app/[locale]/dashboard/support/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer/assets/[id] | src/app/[locale]/designer/assets/[id]/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer/new | src/app/[locale]/designer/new/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer/orders | src/app/[locale]/designer/orders/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer | src/app/[locale]/designer/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer/settings | src/app/[locale]/designer/settings/page.tsx | – | neues Design (Okt. 2026) |  |
| /designer/uploads | src/app/[locale]/designer/uploads/page.tsx | – | neues Design (Okt. 2026) |  |
| /developers | src/app/[locale]/developers/page.tsx | – | neues Design (Okt. 2026) |  |
| /download | src/app/[locale]/download/page.tsx | W10 Download | neu gebaut | Release-Daten fehlen (Backend) |
| /exclusive/[programId] | src/app/[locale]/exclusive/[programId]/page.tsx | – | neues Design (Okt. 2026) |  |
| /faq | src/app/[locale]/faq/page.tsx | – | neues Design (Okt. 2026) |  |
| /forbidden | src/app/[locale]/forbidden/page.tsx | – | neues Design (Okt. 2026) |  |
| /forgot-password | src/app/[locale]/forgot-password/page.tsx | W8 Passwort vergessen | umgesetzt |  |
| /games/[slug]/[modeSlug] | src/app/[locale]/games/[slug]/[modeSlug]/page.tsx | – | neues Design (Okt. 2026) |  |
| /games/[slug] | src/app/[locale]/games/[slug]/page.tsx | – | neues Design (Okt. 2026) |  |
| /games | src/app/[locale]/games/page.tsx | – | neues Design (Okt. 2026) |  |
| /leaderboards | src/app/[locale]/leaderboards/page.tsx | – | neues Design (Okt. 2026) |  |
| /legal/dmca | src/app/[locale]/legal/dmca/page.tsx | – | neues Design (Okt. 2026) |  |
| /legal/imprint | src/app/[locale]/legal/imprint/page.tsx | – | neues Design (Okt. 2026) |  |
| /legal/privacy | src/app/[locale]/legal/privacy/page.tsx | – | neues Design (Okt. 2026) |  |
| /legal/terms | src/app/[locale]/legal/terms/page.tsx | – | neues Design (Okt. 2026) |  |
| /legal/withdrawal | src/app/[locale]/legal/withdrawal/page.tsx | – | neues Design (Okt. 2026) |  |
| /login | src/app/[locale]/login/page.tsx | W8 Anmelden | nach Spezifikation | „Angemeldet bleiben“ |
| /maintenance | src/app/[locale]/maintenance/page.tsx | – | neues Design (Okt. 2026) |  |
| /mods/[slug] | src/app/[locale]/mods/[slug]/page.tsx | W3 Mod-Seite | umgesetzt | Kompatibilität nur als Spielversion |
| /mods | src/app/[locale]/mods/page.tsx | W2 Mods | nach Spezifikation | Raster/Liste umschaltbar |
| /owner | src/app/[locale]/owner/page.tsx | – | neues Design (Okt. 2026) |  |
| / | src/app/[locale]/page.tsx | W1 Startseite | umgesetzt | Hero, Spiele, Funktionen, beliebte Mods, Premium, FAQ |
| /partner/analytics | src/app/[locale]/partner/analytics/page.tsx | – | neues Design (Okt. 2026) |  |
| /partner/codes | src/app/[locale]/partner/codes/page.tsx | – | neues Design (Okt. 2026) |  |
| /partner | src/app/[locale]/partner/page.tsx | – | neues Design (Okt. 2026) |  |
| /partner/payouts | src/app/[locale]/partner/payouts/page.tsx | – | neues Design (Okt. 2026) |  |
| /partner/settings | src/app/[locale]/partner/settings/page.tsx | – | neues Design (Okt. 2026) |  |
| /partners/[slug] | src/app/[locale]/partners/[slug]/page.tsx | – | nach Spezifikation | nur öffentliche Profile, Partnercode/Empfehlungslink kopierbar |
| /partners | src/app/[locale]/partners/page.tsx | W11 Partner | nach Spezifikation | jeder Partner einmal, nur öffentliche |
| /premium | src/app/[locale]/premium/page.tsx | W4 Premium | umgesetzt | Preise aus DB |
| /register | src/app/[locale]/register/page.tsx | W8 Registrieren | umgesetzt |  |
| /reset-password | src/app/[locale]/reset-password/page.tsx | W8 Passwort setzen | umgesetzt |  |
| /search | src/app/[locale]/search/page.tsx | – | neues Design (Okt. 2026) |  |
| /shop/[slug] | src/app/[locale]/shop/[slug]/page.tsx | W5/W6 Produkt + Direktkauf | nach Spezifikation | Direktkauf und Warenkorb |
| /shop | src/app/[locale]/shop/page.tsx | W5 Shop | neues Design (Okt. 2026) | kein Warenkorb (Backend) |
| /team-chat | src/app/[locale]/team-chat/page.tsx | – | neues Design (Okt. 2026) |  |
| /team | src/app/[locale]/team/page.tsx | – | neues Design (Okt. 2026) |  |
| /cart | src/app/[locale]/cart/page.tsx | W6 Warenkorb | neu | Serverpreise, AGB/Widerruf, eine Stripe-Session |
| /checkout/success | src/app/[locale]/checkout/success/page.tsx | W7 Bestätigung | neu | nur angemeldet |
| /tutorials | src/app/[locale]/tutorials/page.tsx | – | neu | Übersicht mit Suche |
| /tutorials/[slug] | src/app/[locale]/tutorials/[slug]/page.tsx | – | neues Design (Okt. 2026) |  |

## Bericht Phase 3 (Detail-Spezifikation)

### Neue Endpunkte und Seiten
| Pfad | Zweck | Schutz |
| --- | --- | --- |
| GET /api/admin/audit/export | Audit-Log als CSV (gleiche Filter wie ACP) | Anmeldung + audit.read, eigener Audit-Eintrag |
| GET /api/admin/localization/export?locale= | Texte einer Sprache als JSON | Anmeldung + settings.write |
| GET /api/security/ip-bans | Sperrliste (nur Hashes) für die Middleware | abgeleiteter interner Token |
| GET /api/cron/health | Dienst-Prüfung für externen Cron (Verfügbarkeit) | Bearer CRON_SECRET |
| GET /api/cron/email | Arbeitet die Newsletter-Warteschlange (EmailLog) ab | Bearer CRON_SECRET |
| GET /api/newsletter/unsubscribe?u=&t= | Abmelde-Link aus Rundmails (HMAC-signiert) | Signatur, 400 bei ungültigem Token |
| /[locale]/cart | Warenkorb (Slugs im Browser, Preise immer vom Server) | öffentlich, Bezahlen nur angemeldet |
| /[locale]/checkout/success | Bestätigung nach Stripe-Kasse | Anmeldung (Middleware), Session muss zum Nutzer gehören |
| /[locale]/tutorials | Tutorial-Übersicht mit Suche (Footer-Link war 404) | öffentlich |

Server-Actions: `getCartQuote`, `startCartCheckout` (AGB- und Widerrufs-Checkbox Pflicht, Rate-Limit), `getCheckoutResult`,
`setNewsletterConsent`, ACP-Newsletter (`countNewsletterRecipientsAdmin`, `sendNewsletterTest`, `createNewsletterCampaign`,
`processNewsletterQueueAdmin`, `listNewsletterCampaigns`), `saveMediaAltText`.

### Datenbank (Live, 26.09.2026)
Additive Migration `prisma/proposed/2026-09-redesign.sql` direkt auf der Live-Datenbank ausgeführt (idempotent, `lock_timeout`,
Indizes mit `CREATE INDEX CONCURRENTLY IF NOT EXISTS`). Nichts gelöscht oder umbenannt.
- Neue Spalten: `User.newsletterConsent`, `User.newsletterConsentAt`, `ModPurchase.refundedAt`, `MembershipPurchase.refundedAt`,
  `MediaFile.altText`, `EmailLog.campaignId`.
- Neue Tabelle `EmailCampaign`; neue Sequenz `invoice_number_seq` (Start 10000) für lückenlose Rechnungsnummern `MM-<Jahr>-<Nr>`.
- Neue Indizes laut Schema. Nur live vorhandene Indizes und der Download-Fremdschlüssel sind jetzt im Schema dokumentiert,
  damit ein späteres `prisma db push` nichts entfernt. `prisma migrate diff` Live → Schema ist leer.
- Kontrolle: Zeilenzahlen vor/nach identisch (Nutzer 13, Medien 189, E-Mail-Logs 47, Audit 477, Käufe 0); keine ungültigen Indizes.
- Wichtig: kein `prisma db push` ohne vorheriges `prisma migrate diff`.

### Behobene Fehler (Auswahl)
- Shop-Direktkäufe wurden vom Stripe-Webhook nie als bezahlt markiert (Typ `shop_product_order` fehlte im Webhook).
- Erstattete Mod-Käufe gaben weiter Zugriff; jetzt `refundedAt`, Zugang endet, erneuter Kauf möglich.
- Rollen-Sync nach Mitgliedschaft setzte Creator/Partner/Support auf USER/PREMIUM zurück.
- Kündigen im ACP beendete bezahlte Stripe-Laufzeit sofort; jetzt zum Laufzeitende, Webhook beendet die Mitgliedschaft.
- Premium-Creator sahen Werbung (Rollen-Stufe wurde vor der Mitgliedschaft geprüft).
- Bestenlisten-Gewichtung wurde gespeichert, aber nie verwendet.
- API-Schlüssel-Hash wurde an den Browser geschickt; Owner-Rolle war serverseitig editierbar.
- 16 ACP-Seiten prüften Rechte nur im Layout; Zahlungseinstellungen waren für jedes Team-Mitglied offen.
- `getModSecurityInfo` ohne Rechteprüfung; DMCA-Formular ohne Begrenzung.
- Live-Test: `/tutorials` war 404, `/checkout/success` ohne Anmeldung erreichbar, Bild-Ersatz zeigte auf die absolute Produktions-URL.
- Partnerprofile ohne `isPublic` waren öffentlich erreichbar; ACP-Nutzerliste stürzte ohne Sortierung ab; Datumsausgaben verursachten Hydration-Fehler.
- Suchseite zeigte rohe Schlüssel (`search.json` war doppelt verschachtelt); drei ACP-Texte fehlten auf Deutsch.
- Favoriten-Button ohne zugänglichen Namen, Sprachlinks im Footer ohne Namen, feste englische Toast-Texte (31 Dateien).

### Performance
Start-JS gzip inkl. Layouts:

| Seite | vorher | nachher |
| --- | --- | --- |
| Startseite | 258,6 KB | 161,0 KB |
| Mods | 265,2 KB | 167,7 KB |
| Mod-Seite | 272,2 KB | 175,4 KB |
| Premium | 259,0 KB | 161,6 KB |
| ACP-Dashboard | 254,2 KB | 153,4 KB |

Lighthouse 12 gegen `next start` mit Live-Daten (lokal, 26.09.2026, Endstand; Mobil = Median aus 3 Läufen):

| Seite | Mobil Perf. | Mobil LCP | Desktop Perf. | Desktop LCP | CLS | A11y | Best Pr. | SEO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Startseite | 83 | 4,5 s | 97 | 1,2 s | 0 | 100 | 100 | 100 |
| Mods | 81 | 4,8 s | 99 | 0,9 s | 0 | 100 | 100 | 100 |
| Mod-Seite | 83 | 4,3 s | 98 | 1,1 s | 0,018 | 100 | 100 | 100 |
| Premium | 90 | 3,5 s | 100 | 0,8 s | 0 | 100 | 100 | 100 |

HTML der Startseite: 282 KB → 189 KB (gzip 63 → 35 KB), weil die ACP-Texte (~100 KB) nicht mehr an öffentliche Seiten gehen
(`AdminIntlProvider` nur unter /admin und /designer, per Test abgesichert).

Mobiles LCP: Tatsächlich malt die Startseite nach 1,4 s (FCP = LCP). Lighthouse simuliert mehr, weil jedes Bild zuerst an
`pub-….r2.dev` geht und 401 bekommt (öffentlicher R2-Zugriff am Bucket aus); diese hoch priorisierten Anfragen zählen als
Abhängigkeiten, der Ersatz über `/api/assets` lädt erst nach der Hydration. Mit funktionierender Bild-Domain entfällt das
(Desktop zeigt das Potenzial). Lokale Messungen schwanken bei wenig freiem Arbeitsspeicher stark (gleicher Build 73–89).
Maßnahmen dieser Runde: Cookie-Banner serverseitig, erste Modkarten mit Bild-Priorität, ACP-Texte aus der Seiten-Nutzlast.

### Tests
`npm run lint` (next/core-web-vitals, fehlerfrei, läuft auch im Build) und `npm test` (Node-Testrunner, keine neuen Pakete, 15 Tests): Rechteprüfung jeder ACP-Seite, Menü-Recht = Seiten-Recht, jede
ACP-Action und /api/admin-Route prüft Rechte, Hilfsfunktionen, jeder benutzte Toast-Schlüssel und jeder `t("…")`-Schlüssel mit festem Namespace existiert in de und en, ACP-Texte werden nur in /admin und /designer gebraucht.
Smoke-Test gegen den Produktions-Build mit Live-Daten: 82/82 (alle öffentlichen Seiten 200, Konto- und ACP-Seiten leiten
ohne Anmeldung auf /login, geschützte APIs 403/400). Checkout nur bis Stripe getestet, keine echte Zahlung.

### Offen
- Bilder: öffentlichen Zugriff für den R2-Bucket aktivieren oder eine eigene Bild-Domain setzen und `NEXT_PUBLIC_CDN_URL`/`R2_PUBLIC_URL` anpassen.
- Cron beim Hoster einrichten: `/api/cron/email` (z. B. alle 5 Min) und `/api/cron/health`, jeweils mit `Authorization: Bearer $CRON_SECRET`.
- Eingeloggte ACP-Durchläufe brauchen Test-Zugangsdaten; ohne sie nur Weiterleitung und Rechte-Tests geprüft.
- Nicht verwendete Komponenten (kein Import): admin-diagnostics-panel, auth-branding-panel, enterprise-shop-admin,
  owner-control-center, owner-user-management, partner-form-builder, role-analytics-panel, team-profiles-admin,
  translations-admin-panel, applications/partner-application-status – nicht übersetzt (letztere schon), Löschen nach Rückfrage.
- i18n: 30 ACP-, Creator- und Konto-Komponenten mit ~915 neuen Schlüsseln (de/en; fr/es/pl/tr fallen auf Englisch zurück).
- App/Discord-Anbindung für Ankündigungen.
- `CreatorProfile.totalDownloads` wird nirgends fortgeschrieben (überall 0); Creator-Seiten rechnen jetzt aus den Mods, Bestenliste/Startseite nutzen das Feld noch.
- ~~Header liest Cookies → Seiten rendern dynamisch~~ erledigt (Okt. 2026): Nutzer kommt im Browser (`useNavUser`), öffentliche Seiten per ISR; siehe docs/CLOUDFLARE.md.
- 27 Komponenten werden nirgends eingebunden (alter Stil, ~4 900 Zeilen) – Löschen nach Rückfrage.
