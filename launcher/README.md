# XUMARI MODZ Launcher

Enterprise Windows Desktop Launcher für automatische Mod-Installation — WinUI 3 · .NET 9 · MVVM

## Architektur

```
launcher/
├── src/
│   ├── XumariModz.Launcher/          WinUI 3 Desktop App (Windows 10/11)
│   ├── XumariModz.Launcher.Core/     Domain Models, Interfaces, Enums
│   ├── XumariModz.Launcher.Services/ Game Detection, Downloads, Mod Manager, Security
│   ├── XumariModz.Launcher.Installers/ Spielspezifische Installer (GTA V, ARK, Sims, ATS, ETS2, …)
│   └── XumariModz.Launcher.Api/      ASP.NET Core 9 Backend (SignalR, JWT, PostgreSQL, Redis)
```

Die Desktop-App verbindet sich mit der bestehenden **XUMARI MODZ Web-Plattform** (Next.js) über `/api/v1/*` und `/api/launcher/v1/*`.

## Voraussetzungen (Windows)

- Windows 10 (1809+) oder Windows 11
- Visual Studio 2022 17.12+ mit **Windows App SDK** und **.NET 9 SDK**
- Optional: PostgreSQL + Redis für das Launcher-Backend

## Build & Start

### Desktop Launcher (WinUI 3)

```powershell
cd launcher
dotnet restore
dotnet build src/XumariModz.Launcher/XumariModz.Launcher.csproj -c Release
dotnet run --project src/XumariModz.Launcher/XumariModz.Launcher.csproj
```

Oder in Visual Studio: `XumariModz.Launcher.sln` öffnen → F5.

### Launcher API (ASP.NET Core 9)

```powershell
cd launcher/src/XumariModz.Launcher.Api
dotnet ef migrations add Initial --output-dir Migrations   # optional
dotnet run
```

API läuft standardmäßig auf `https://localhost:5001` mit Swagger UI in Development.

### MSIX Paket (Production)

```powershell
cd launcher
.\build-msix.ps1 -Configuration Release
# Mit Code-Signing:
.\build-msix.ps1 -CertificatePath ".\certs\xumarimodz.pfx" -CertificatePassword "…"
```

Installieren: `Add-AppxPackage -Path .\artifacts\msix\*.msix`

### Setup.exe (Production Installer)

```powershell
cd launcher
.\build-setup.ps1 -Configuration Release
# Output: .\artifacts\setup\XUMARI_MODZ_Setup.exe
```

Der Setup-Installer bietet:

- Installationspfad-Auswahl
- Desktop-Verknüpfung & Startmenü-Eintrag
- Automatische Updates aktivieren/deaktivieren
- Launcher-Start nach Installation
- Optional: MSIX-Paket im Installationsordner

Benötigt [Inno Setup 6](https://jrsoftware.org/isinfo.php) auf dem Build-Rechner.

MSIX Features: Auto-Update, Rollback, Delta-Patches, Hintergrundupdates, Protokoll-Handler (`xumarimodz://`).

## Features

| Feature | Status |
|---------|--------|
| Premium Dashboard (Spiele, Mods, News, Updates) | ✅ |
| Fluent Design 3 · Mica · Glassmorphism | ✅ |
| Dark / Light / System Theme Toggle | ✅ |
| MSIX Packaging + Build-Skript | ✅ |
| Enterprise Auto-Updater (Stable/Beta/Alpha/Dev) | ✅ |
| OAuth PKCE via Systembrowser (Discord/Google/Microsoft) | ✅ |
| Installations-Overlay mit Fortschrittsanimation | ✅ |
| Premium Mod-Detailseiten | ✅ |
| Spielebibliothek (Grid/Liste, Suche, Filter) | ✅ |
| GTA V Mod-Kategorien (Redux unter „GTA V Mods“) | ✅ |
| GTA V RP (FiveM / RageMP) | ✅ |
| ARK (Evolved + Ascended) Installer | ✅ |
| Sims 4 CC/Script Mods + Konfliktprüfung | ✅ |
| ATS / ETS2 Mod Installer + Profile Backup | ✅ |
| Automatische Spielerkennung | ✅ |
| Multi-Thread Downloads | ✅ |
| Security Center (SHA256, VirusTotal) | ✅ |
| 8 Sprachen | ✅ |
| SignalR Echtzeit-Sync | ✅ |
| Dependency Marketplace (OpenIV, SHV, Forge, Java, …) | ✅ |
| One-Click Dependency-Installation vor Mod-Install | ✅ |
| REPARIEREN / WIEDERHERSTELLEN / DEINSTALLIEREN | ✅ |
| Setup.exe (Inno Setup) + MSIX | ✅ |

## Dependency-System

Der Launcher erkennt und installiert Abhängigkeiten **automatisch vor jeder Mod-Installation**:

| Spiel | Automatische Komponenten |
|-------|-------------------------|
| GTA V / Redux | OpenIV, ScriptHookV, ScriptHookVDotNet, ASI Loader, Heap Adjuster, Packfile Limit, GameConfig |
| Minecraft | Java Runtime, Forge, Fabric, NeoForge, Quilt |
| LS22 / LS25 | Mod-Verzeichnisse, Savegame-Backups |
| ATS / ETS2 | Mod-Prioritäten, Profile-Backup |
| ARK | Steam Workshop, Mod Collections |
| Sims 4 | CC Manager, Script Mods, Konfliktprüfung |
| Rust | Modpacks, uMod/Oxide |
| Hytale | Mod Loader (sobald verfügbar) |

Mods definieren Abhängigkeiten über:

- Plattform-Feld `dependencies` (Slug: `scripthookv`, `forge`, `java`, …)
- Tags: `requires:scripthookv`

Manifest-API: `GET /api/launcher/v1/dependencies/manifest?game=gta-v`

Persistenz: `%LOCALAPPDATA%\XumariModz\Launcher\dependencies.json`

## Nutzer-Flow (One-Click)

1. `XUMARI_MODZ_Setup.exe` herunterladen & installieren
2. Spiel auswählen
3. Mod auswählen → **INSTALLIEREN**
4. Launcher übernimmt: Abhängigkeiten → Backup → Download → Sicherheit → Installation

Buttons auf der Mod-Detailseite:

- **REPARIEREN** — fehlende/beschädigte Dateien & Abhängigkeiten
- **WIEDERHERSTELLEN** — Vanilla-Zustand (Mods, Loader, Config)
- **DEINSTALLIEREN** — Mod + ungenutzte Abhängigkeiten

## Konfiguration

Launcher-Einstellungen werden gespeichert unter:
`%LOCALAPPDATA%\XumariModz\Launcher\settings.json`

```json
{
  "platformApiUrl": "https://xumarimodz.com",
  "apiKey": "xm_…",
  "theme": "Dark",
  "language": "De",
  "downloadDirectory": "C:\\Users\\…\\Downloads\\XumariModz"
}
```

API-Key im Admin Panel unter **Developer → API Keys** erstellen (Preset: `download`).

## GTA V Mod-Struktur

**GTA V Mods** (Singleplayer): Redux, Grafik, Fahrzeuge, Sounds, Scripts, Waffen, Charaktere, Realismus — Slug `gta-v-redux` bleibt für Redux-Mods erhalten, erscheint in der UI unter „GTA V Mods“.

**GTA V RP**: FiveM (Server Packs, Grafik, RP) · RageMP (Server Packs, RP, Client).

## OAuth (Systembrowser)

Login erfolgt ausschließlich über den Standard-Systembrowser mit **PKCE**:

1. Launcher öffnet `{platform}/api/launcher/v1/oauth/authorize?...`
2. Provider authentifiziert
3. Redirect zu `xumarimodz://oauth/callback?code=…&state=…`
4. Token-Austausch via `/api/launcher/v1/oauth/token`

Env-Variablen: `DISCORD_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID` (+ Secrets).

## Update-Kanäle

| Kanal | Beschreibung |
|-------|-------------|
| Stable | Produktions-Builds |
| Beta | Early Access Features |
| Alpha | Experimentelle Features |
| Developer | Interne Entwickler-Builds |

Manifest: `GET /api/launcher/v1/updates/manifest?channel=stable&current=1.0.0`

## Unterstützte Spiele

Rockstar (GTA V, Redux, Enhanced, FiveM, RageMP) · Minecraft (Vanilla/Forge/Fabric/NeoForge) · LS22/LS25 · ARK · Sims 4 · ATS/ETS2 · Rust · Hytale (zukünftig)

Neue Spiele werden automatisch über das Admin Panel synchronisiert.

## Plattform-Integration

| Endpoint | Beschreibung |
|----------|-------------|
| `GET /api/v1/games` | Spiele-Katalog |
| `GET /api/v1/mods` | Mod-Liste |
| `GET /api/v1/mods/{slug}` | Mod-Details |
| `GET /api/v1/download-meta` | Download-Metadaten + SHA256 |
| `POST /api/launcher/v1/auth/login` | Login |
| `GET /api/launcher/v1/profile` | Benutzerprofil |
| `GET /api/launcher/v1/security/virustotal/{sha256}` | VirusTotal Lookup |
| `GET /api/launcher/v1/updates/manifest` | Launcher Auto-Update Manifest |
| `GET /api/launcher/v1/dependencies/manifest` | Dependency-Pakete (CDN URLs) |
| `WS /hubs/launcher` | SignalR Echtzeit-Updates |

## Monitoring

- Prometheus Metriken: `/metrics`
- Health Check: `/health`
- Grafana Dashboard (deploy/prometheus/)

## Lizenz

Proprietary — XUMARI MODZ. All rights reserved.
