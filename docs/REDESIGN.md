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
| /admin/achievements | src/app/[locale]/admin/achievements/page.tsx | ACP Erfolge | teilweise |  |
| /admin/ads | src/app/[locale]/admin/ads/page.tsx | ACP Werbung | teilweise |  |
| /admin/analytics | src/app/[locale]/admin/analytics/page.tsx | ACP Analytics | teilweise | Zeitraum-Chips fehlen |
| /admin/announcements | src/app/[locale]/admin/announcements/page.tsx | ACP Ankündigungen | teilweise | Art/Vorschau fehlen |
| /admin/api-keys | src/app/[locale]/admin/api-keys/page.tsx | ACP API-Schlüssel | teilweise |  |
| /admin/applications | src/app/[locale]/admin/applications/page.tsx | ACP Bewerbungen | teilweise | Kanban fehlt |
| /admin/audit | src/app/[locale]/admin/audit/page.tsx | ACP Audit-Log | teilweise | Filter/CSV fehlen |
| /admin/banners | src/app/[locale]/admin/banners/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/branding | src/app/[locale]/admin/branding/page.tsx | ACP Inhalte | teilweise | Live-Vorschau fehlt |
| /admin/chat | src/app/[locale]/admin/chat/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/collections | src/app/[locale]/admin/collections/page.tsx | ACP Sammlungen | teilweise | Drag & Drop fehlt |
| /admin/commissions | src/app/[locale]/admin/commissions/page.tsx | ACP Provisionen | teilweise | Auswahl-Freigabe/Regeln fehlen |
| /admin/coupons | src/app/[locale]/admin/coupons/page.tsx | ACP Gutscheine | teilweise |  |
| /admin/creators/[id] | src/app/[locale]/admin/creators/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/creators/new | src/app/[locale]/admin/creators/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/creators | src/app/[locale]/admin/creators/page.tsx | ACP Creator | teilweise |  |
| /admin/creators/visibility | src/app/[locale]/admin/creators/visibility/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/diagnostics/screenshots | src/app/[locale]/admin/diagnostics/screenshots/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/dmca | src/app/[locale]/admin/dmca/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/email | src/app/[locale]/admin/email/page.tsx | ACP E-Mail | teilweise | Newsletter-Zustimmung fehlt im Schema |
| /admin/email/templates | src/app/[locale]/admin/email/templates/page.tsx | ACP E-Mail-Vorlagen | teilweise | Vorschau fehlt |
| /admin/games/[id] | src/app/[locale]/admin/games/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/games/new | src/app/[locale]/admin/games/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/games | src/app/[locale]/admin/games/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/groups | src/app/[locale]/admin/groups/page.tsx | ACP Gruppen und Rechte | teilweise |  |
| /admin/leaderboards | src/app/[locale]/admin/leaderboards/page.tsx | ACP Bestenlisten | teilweise |  |
| /admin/licenses | src/app/[locale]/admin/licenses/page.tsx | ACP Lizenzen | teilweise | CSV/Maskierung prüfen |
| /admin/localization | src/app/[locale]/admin/localization/page.tsx | ACP Lokalisierung | teilweise |  |
| /admin/media | src/app/[locale]/admin/media/page.tsx | ACP Medien | neu gebaut | Verwendet-in/Alt-Text fehlen |
| /admin/memberships | src/app/[locale]/admin/memberships/page.tsx | ACP Mitgliedschaften | teilweise | Entziehen fehlt |
| /admin/moderation | src/app/[locale]/admin/moderation/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/mods/[id] | src/app/[locale]/admin/mods/[id]/page.tsx | ACP Mod bearbeiten | teilweise | „Ungespeicherte Änderungen“ fehlt |
| /admin/mods/new-sound | src/app/[locale]/admin/mods/new-sound/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/mods/new | src/app/[locale]/admin/mods/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/mods | src/app/[locale]/admin/mods/page.tsx | ACP Mods | teilweise | Spiel-Chips/Status-Filter prüfen |
| /admin/orders/[id] | src/app/[locale]/admin/orders/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/orders | src/app/[locale]/admin/orders/page.tsx | ACP Bestellungen | teilweise |  |
| /admin/owner/achievements | src/app/[locale]/admin/owner/achievements/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/owner/email | src/app/[locale]/admin/owner/email/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/owner/features | src/app/[locale]/admin/owner/features/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/owner/health | src/app/[locale]/admin/owner/health/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/owner/translations | src/app/[locale]/admin/owner/translations/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/owner/users/[id] | src/app/[locale]/admin/owner/users/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin | src/app/[locale]/admin/page.tsx | ACP Dashboard | teilweise | Texte EN, € fehlt, kein Cache |
| /admin/partner-ads | src/app/[locale]/admin/partner-ads/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/partners/[id] | src/app/[locale]/admin/partners/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/partners/new | src/app/[locale]/admin/partners/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/partners | src/app/[locale]/admin/partners/page.tsx | ACP Partner | teilweise |  |
| /admin/payments | src/app/[locale]/admin/payments/page.tsx | ACP Shop-Übersicht | teilweise |  |
| /admin/payout-settings | src/app/[locale]/admin/payout-settings/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/referrals | src/app/[locale]/admin/referrals/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/reports | src/app/[locale]/admin/reports/page.tsx | ACP Meldungen | neu gebaut |  |
| /admin/security | src/app/[locale]/admin/security/page.tsx | ACP Sicherheit | teilweise | Sitzungen/IP-Sperren fehlen im Schema |
| /admin/settings/media | src/app/[locale]/admin/settings/media/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/settings | src/app/[locale]/admin/settings/page.tsx | ACP Einstellungen | neu gebaut | Übersicht |
| /admin/shop | src/app/[locale]/admin/shop/page.tsx | ACP Produkte | teilweise |  |
| /admin/subscriptions | src/app/[locale]/admin/subscriptions/page.tsx | ACP Käufe und Abos | teilweise | Tabs/Erstatten/Verlängern fehlen |
| /admin/system | src/app/[locale]/admin/system/page.tsx | ACP Systemstatus | teilweise | Monitoring-Quelle offen |
| /admin/team | src/app/[locale]/admin/team/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/tickets/[id] | src/app/[locale]/admin/tickets/[id]/page.tsx | ACP Ticket-Detail | teilweise | Textbausteine fehlen |
| /admin/tickets | src/app/[locale]/admin/tickets/page.tsx | ACP Tickets | teilweise |  |
| /admin/trust | src/app/[locale]/admin/trust/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/tutorials | src/app/[locale]/admin/tutorials/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/users/[id] | src/app/[locale]/admin/users/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /admin/users | src/app/[locale]/admin/users/page.tsx | ACP Nutzer | teilweise |  |
| /auth/sync-error | src/app/[locale]/auth/sync-error/page.tsx | – | vorhanden (Design-Sweep) |  |
| /banned | src/app/[locale]/banned/page.tsx | – | vorhanden (Design-Sweep) |  |
| /become-creator | src/app/[locale]/become-creator/page.tsx | W12 Creator-Bewerbung | teilweise |  |
| /become-partner | src/app/[locale]/become-partner/page.tsx | W11 Partner-Bewerbung | teilweise |  |
| /blog | src/app/[locale]/blog/page.tsx | – | vorhanden (Design-Sweep) |  |
| /collections/[slug] | src/app/[locale]/collections/[slug]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /collections | src/app/[locale]/collections/page.tsx | – | vorhanden (Design-Sweep) |  |
| /contact | src/app/[locale]/contact/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/analytics | src/app/[locale]/creator/analytics/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/codes | src/app/[locale]/creator/codes/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/collections/[id] | src/app/[locale]/creator/collections/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/collections/new | src/app/[locale]/creator/collections/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/collections | src/app/[locale]/creator/collections/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/exclusive/[id] | src/app/[locale]/creator/exclusive/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/exclusive/new | src/app/[locale]/creator/exclusive/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/exclusive | src/app/[locale]/creator/exclusive/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/hosting | src/app/[locale]/creator/hosting/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/licenses | src/app/[locale]/creator/licenses/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/mods/[id] | src/app/[locale]/creator/mods/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/mods/new | src/app/[locale]/creator/mods/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator | src/app/[locale]/creator/page.tsx | W14 Creator-Dashboard | teilweise |  |
| /creator/payouts | src/app/[locale]/creator/payouts/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creator/settings | src/app/[locale]/creator/settings/page.tsx | – | vorhanden (Design-Sweep) |  |
| /creators/[slug] | src/app/[locale]/creators/[slug]/page.tsx | W13 Creator-Profil | teilweise |  |
| /creators | src/app/[locale]/creators/page.tsx | W12 Creator-Programm | teilweise |  |
| /custom-orders | src/app/[locale]/custom-orders/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/achievements | src/app/[locale]/dashboard/achievements/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/downloads | src/app/[locale]/dashboard/downloads/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/favorites | src/app/[locale]/dashboard/favorites/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/following | src/app/[locale]/dashboard/following/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/library | src/app/[locale]/dashboard/library/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/licenses | src/app/[locale]/dashboard/licenses/page.tsx | W9 Lizenzen | teilweise |  |
| /dashboard/notifications | src/app/[locale]/dashboard/notifications/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/orders/[id] | src/app/[locale]/dashboard/orders/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/orders/[id]/requirements | src/app/[locale]/dashboard/orders/[id]/requirements/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/orders | src/app/[locale]/dashboard/orders/page.tsx | W9 Käufe | teilweise |  |
| /dashboard | src/app/[locale]/dashboard/page.tsx | W9 Mein Konto | teilweise | Übersicht; Unterseiten Design-Sweep |
| /dashboard/security | src/app/[locale]/dashboard/security/page.tsx | W9 Sicherheit | neu gebaut |  |
| /dashboard/settings | src/app/[locale]/dashboard/settings/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/subscription | src/app/[locale]/dashboard/subscription/page.tsx | W9 Abo | teilweise |  |
| /dashboard/support/[id] | src/app/[locale]/dashboard/support/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/support/new | src/app/[locale]/dashboard/support/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /dashboard/support | src/app/[locale]/dashboard/support/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer/assets/[id] | src/app/[locale]/designer/assets/[id]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer/new | src/app/[locale]/designer/new/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer/orders | src/app/[locale]/designer/orders/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer | src/app/[locale]/designer/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer/settings | src/app/[locale]/designer/settings/page.tsx | – | vorhanden (Design-Sweep) |  |
| /designer/uploads | src/app/[locale]/designer/uploads/page.tsx | – | vorhanden (Design-Sweep) |  |
| /developers | src/app/[locale]/developers/page.tsx | – | vorhanden (Design-Sweep) |  |
| /download | src/app/[locale]/download/page.tsx | W10 Download | neu gebaut | Release-Daten fehlen (Backend) |
| /exclusive/[programId] | src/app/[locale]/exclusive/[programId]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /faq | src/app/[locale]/faq/page.tsx | – | vorhanden (Design-Sweep) |  |
| /forbidden | src/app/[locale]/forbidden/page.tsx | – | vorhanden (Design-Sweep) |  |
| /forgot-password | src/app/[locale]/forgot-password/page.tsx | W8 Passwort vergessen | umgesetzt |  |
| /games/[slug]/[modeSlug] | src/app/[locale]/games/[slug]/[modeSlug]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /games/[slug] | src/app/[locale]/games/[slug]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /games | src/app/[locale]/games/page.tsx | – | vorhanden (Design-Sweep) |  |
| /leaderboards | src/app/[locale]/leaderboards/page.tsx | – | vorhanden (Design-Sweep) |  |
| /legal/dmca | src/app/[locale]/legal/dmca/page.tsx | – | vorhanden (Design-Sweep) |  |
| /legal/imprint | src/app/[locale]/legal/imprint/page.tsx | – | vorhanden (Design-Sweep) |  |
| /legal/privacy | src/app/[locale]/legal/privacy/page.tsx | – | vorhanden (Design-Sweep) |  |
| /legal/terms | src/app/[locale]/legal/terms/page.tsx | – | vorhanden (Design-Sweep) |  |
| /legal/withdrawal | src/app/[locale]/legal/withdrawal/page.tsx | – | vorhanden (Design-Sweep) |  |
| /login | src/app/[locale]/login/page.tsx | W8 Anmelden | teilweise | „Angemeldet bleiben“ fehlt |
| /maintenance | src/app/[locale]/maintenance/page.tsx | – | vorhanden (Design-Sweep) |  |
| /mods/[slug] | src/app/[locale]/mods/[slug]/page.tsx | W3 Mod-Seite | umgesetzt | Kompatibilität nur als Spielversion |
| /mods | src/app/[locale]/mods/page.tsx | W2 Mods | teilweise | Filter/Suche/Sortierung/Pagination da; Grid/Liste-Umschalter fehlt |
| /owner | src/app/[locale]/owner/page.tsx | – | vorhanden (Design-Sweep) |  |
| / | src/app/[locale]/page.tsx | W1 Startseite | umgesetzt | Hero, Spiele, Funktionen, beliebte Mods, Premium, FAQ |
| /partner/analytics | src/app/[locale]/partner/analytics/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partner/codes | src/app/[locale]/partner/codes/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partner | src/app/[locale]/partner/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partner/payouts | src/app/[locale]/partner/payouts/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partner/settings | src/app/[locale]/partner/settings/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partners/[slug] | src/app/[locale]/partners/[slug]/page.tsx | – | vorhanden (Design-Sweep) |  |
| /partners | src/app/[locale]/partners/page.tsx | W11 Partner | teilweise |  |
| /premium | src/app/[locale]/premium/page.tsx | W4 Premium | umgesetzt | Preise aus DB |
| /register | src/app/[locale]/register/page.tsx | W8 Registrieren | umgesetzt |  |
| /reset-password | src/app/[locale]/reset-password/page.tsx | W8 Passwort setzen | umgesetzt |  |
| /search | src/app/[locale]/search/page.tsx | – | vorhanden (Design-Sweep) |  |
| /shop/[slug] | src/app/[locale]/shop/[slug]/page.tsx | W5/W6 Produkt + Direktkauf | teilweise | Kasse mit Warenkorb fehlt (Backend) |
| /shop | src/app/[locale]/shop/page.tsx | W5 Shop | teilweise | kein Warenkorb (Backend) |
| /team-chat | src/app/[locale]/team-chat/page.tsx | – | vorhanden (Design-Sweep) |  |
| /team | src/app/[locale]/team/page.tsx | – | vorhanden (Design-Sweep) |  |
| /tutorials/[slug] | src/app/[locale]/tutorials/[slug]/page.tsx | – | vorhanden (Design-Sweep) |  |
