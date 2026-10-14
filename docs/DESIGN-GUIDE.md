# Design-Vorgabe Xumari Modz

Gilt für jede Seite und Komponente. Referenzen im Code: ACP `src/app/[locale]/admin/users/page.tsx`,
öffentlich `src/app/[locale]/creators/[slug]/page.tsx` und `src/app/[locale]/mods/[slug]/page.tsx`.
Prüfung: `npm run check:tokens`, `npm run lint`, `npm test`, `npx tsc --noEmit`.

## 1. Farben und Flächen (nur Tokens)

Farben ausschließlich über die Tokens aus `src/styles/tokens.css` (Tailwind-Namen unten). Keine Hex-/rgb-
Werte, keine Tailwind-Standardfarben, keine Verläufe, Glows, Blur, Emojis (prüft `check:tokens`).

Die shadcn-Aliasse zeigen zwar auf Tokens, sind aber **nicht mehr zu verwenden**. Ersetzen:

| alt | neu |
| --- | --- |
| `text-muted-foreground` | `text-ink-muted` (Nebentext), `text-ink-faint` (Hinweise, Platzhalter) |
| `text-foreground`, `text-card-foreground` | `text-ink` |
| `bg-card`, `bg-background` | `bg-raised` (Karten), `bg-canvas` (Seite) |
| `bg-muted`, `bg-secondary` | `bg-elevated` |
| `bg-accent`, `hover:bg-accent` | `bg-hover`, `hover:bg-hover` |
| `border-border`, `border-input` | `border-line`, `border-line-control` (Eingaben) |
| `text-primary`, `bg-primary` | `text-violet-bright` (Links/aktiv), `bg-violet` (nur Primär-Button) |
| `text-destructive`, `bg-destructive` | `text-danger`, `bg-danger-soft` |
| `Badge variant="destructive"` für Status | `StatusBadge tone="danger"` |

Violett ist Interaktion (Links, aktiv, Primär-Button, Fokus) – nicht Deko. Status nie nur über Farbe:
immer Wort + Icon (`StatusBadge`).

## 2. Typografie

| Zweck | Klasse |
| --- | --- |
| Seitentitel H1 (28/36, 700) | `h1-acp` (Bereiche) bzw. `h1-display` (öffentliche Hero-Titel) |
| Abschnittstitel (15/600) | `section-title` |
| Feldlabel (12/500) | `label-text` |
| Metadaten (12) | `meta` |
| IDs, Schlüssel | `mono-id` |
| Link | `link` (im Fließtext unterstrichen) |
| Zahlen | `tabular-nums` |

Eine H1 pro Seite, Überschriften ohne Sprünge. In Studio-Layouts (Creator/Partner/Designer), die schon
eine H1 setzen, beginnt die Seite mit H2 (`PageHeader level="h2"`).

## 3. Seitenaufbau

- **ACP:** `AdminPageHeader` (Breadcrumb, H1, Unterzeile, Aktionen) – `src/components/admin/admin-page-header.tsx`.
- **Konto, Studio, öffentlich:** `PageHeader` und `SectionCard` aus `src/components/ui/page-header.tsx`.
- Öffentliche Seiten: Inhalt in `page-section` (bzw. `page-container`), nie eigene max-width/padding-Kombis.
- Karten: `SectionCard` oder `rounded-lg border border-line bg-raised p-5` (`card-surface`). Kein
  `CardHeader`/`CardTitle` mit eigenen Größen; vorhandene `Card` nur als Fläche.
- Abstände: zwischen Abschnitten `space-y-6`, Raster `gap-4` (Kacheln) bzw. `gap-6` (Karten).
- Höchstens **ein** Primär-Button (`Button` default) pro Bereich; weitere `variant="outline"`/`"ghost"`.

## 4. Bausteine statt Eigenbau (`src/components/ui/`)

| Fall | Baustein |
| --- | --- |
| Kennzahlen | `KpiTile` (+ `KpiTileSkeleton` beim Laden), Raster `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` |
| Listen/Tabellen | `DataTable` (Spalten, Leerzustand, Zeilenlink, Sortierung per URL) |
| Leer | `EmptyState` mit Lucide-Icon, Titel, Satz, höchstens eine Aktion |
| Fehler | `ErrorState` (Client, mit Neu-laden) bzw. `AdminLoadError` (ACP, Server) |
| Status | `StatusBadge` (`success`/`warning`/`danger`/`info`/`pending`/`neutral`) |
| Filter | `ChipTabs` (Links mit `hrefFor` oder Buttons mit `onChange`) |
| Suche | `SearchField` |
| Seiten | `Pagination` (echte Links) |
| Bestätigen | `ConfirmDialog` für Löschen/Sperren/Widerrufen |
| Kopieren | `CopyButton` |
| Avatare | `UserAvatar`; Bilder `SafeImage` |
| Laden | `PageSkeleton`, `ModGridSkeleton`, `Skeleton` in Endmaßen (kein Springen) |

## 5. Texte (next-intl)

- **Kein sichtbarer Text fest im Code** – auch nicht `aria-label`, `placeholder`, `title`, Tabellenköpfe,
  Leerzustände, Bestätigungsdialoge. Server: `getTranslations`, Client: `useTranslations`.
- Toasts über `useAppToast` mit Schlüsseln `toast.*` (Datei `toast.json`).
- Vorhandene Schlüssel wiederverwenden (`common`, `status`, `ui`, Bereichsdateien). Neue Schlüssel immer
  in **Deutsch und Englisch**; fr/es/pl/tr fallen auf Englisch zurück.
- Neue Schlüssel in die Datei des Bereichs (eigene Datei je Bereich, damit parallele Arbeit nicht kollidiert):

| Bereich | Datei (`src/messages/<de|en>/`) | Namespace |
| --- | --- | --- |
| öffentliche Seiten | `public-pages.json` | `publicPages.<seite>` |
| Konto (/dashboard) | `account-pages.json` | `accountPages.<seite>` |
| Creator-Studio | `creator-pages.json` | `creatorPages.<seite>` |
| Partner- und Designer-Studio | `partner-pages.json` | `partnerPages.<seite>` |
| ACP Teil A | `acp-a.json` | `admin.<seite>` |
| ACP Teil B | `acp-b.json` | `admin.<seite>` |
| geteilte Bausteine (Mods, Spiele, Suche, Audio, Banner) | `shared-ui.json` | `sharedUi.<baustein>` |
| Uploads und Chat | `shared-tools.json` | `sharedTools.<baustein>` |
| ACP-Panels (Runde 2) | `acp-c.json` | `admin.<panel>` |

  ACP-Texte stehen unter `admin.*`, weil nur /admin und /designer sie geladen bekommen (Test
  `admin-messages-scope`). Vor neuen `admin.<seite>`-Namen in `admin.json` nachsehen, ob es ihn gibt.
- Datum/Zahl/Geld über `src/lib/format-locale.ts` (`formatDate`, `formatDateTime`, `formatNumber`,
  `formatCompactNumber`, `formatEuro`) bzw. `formatMoneyFromCents` – nie `toLocale*` (Hydration-Test).

## 6. Barrierefreiheit

Icon-Buttons mit übersetztem `aria-label`; Icons `aria-hidden`; Formularfelder mit `<label>`;
Fokus sichtbar lassen; Status mit Wort; Tabellen mit `caption`; Links im Fließtext unterstrichen.

## 7. Performance

Server-Komponenten bevorzugen; `"use client"` nur, wo Interaktion nötig ist. Öffentliche Seiten lesen
keine Cookies/Sitzung (sonst nicht cachebar) – Nutzerbezogenes über `useNavUser`
(`src/lib/nav-user-client.ts`) im Browser. Große Client-Teile (Dialoge, Editoren, Diagramme) per
`next/dynamic` erst bei Bedarf laden.
