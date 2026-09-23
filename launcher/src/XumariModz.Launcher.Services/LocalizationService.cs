using XumariModz.Launcher.Core.Enums;
using XumariModz.Launcher.Core.Interfaces;

namespace XumariModz.Launcher.Services;

public sealed class LocalizationService : ILocalizationService
{
    private static readonly Dictionary<SupportedLanguage, Dictionary<string, string>> Strings = new()
    {
        [SupportedLanguage.De] = new()
        {
            ["nav.home"] = "Startseite",
            ["nav.library"] = "Bibliothek",
            ["nav.games"] = "Spiele",
            ["nav.downloads"] = "Downloads",
            ["nav.settings"] = "Einstellungen",
            ["nav.profile"] = "Profil",
            ["nav.security"] = "Security Center",
            ["action.install"] = "INSTALLIEREN",
            ["action.uninstall"] = "DEINSTALLIEREN",
            ["action.update"] = "AKTUALISIEREN",
            ["action.repair"] = "REPARIEREN",
            ["action.launch"] = "SPIEL STARTEN",
            ["action.pause"] = "PAUSE",
            ["action.resume"] = "FORTSETZEN",
            ["status.installed"] = "Installiert",
            ["status.not_installed"] = "Nicht installiert",
            ["status.update_available"] = "Update verfügbar",
            ["status.error"] = "Fehler",
            ["status.blocked"] = "Blockiert",
            ["premium.lite"] = "Premium Lite",
            ["premium.standard"] = "Premium",
            ["premium.max"] = "Premium Max",
            ["welcome.title"] = "Willkommen bei XUMARI MODZ",
            ["welcome.subtitle"] = "Mods mit einem Klick installieren",
        },
        [SupportedLanguage.En] = new()
        {
            ["nav.home"] = "Home",
            ["nav.library"] = "Library",
            ["nav.games"] = "Games",
            ["nav.downloads"] = "Downloads",
            ["nav.settings"] = "Settings",
            ["nav.profile"] = "Profile",
            ["nav.security"] = "Security Center",
            ["action.install"] = "INSTALL",
            ["action.uninstall"] = "UNINSTALL",
            ["action.update"] = "UPDATE",
            ["action.repair"] = "REPAIR",
            ["action.launch"] = "PLAY",
            ["action.pause"] = "PAUSE",
            ["action.resume"] = "RESUME",
            ["status.installed"] = "Installed",
            ["status.not_installed"] = "Not installed",
            ["status.update_available"] = "Update available",
            ["status.error"] = "Error",
            ["status.blocked"] = "Blocked",
            ["premium.lite"] = "Premium Lite",
            ["premium.standard"] = "Premium",
            ["premium.max"] = "Premium Max",
            ["welcome.title"] = "Welcome to XUMARI MODZ",
            ["welcome.subtitle"] = "Install mods with one click",
        },
        [SupportedLanguage.Fr] = new()
        {
            ["nav.home"] = "Accueil",
            ["action.install"] = "INSTALLER",
            ["action.launch"] = "LANCER LE JEU",
            ["welcome.title"] = "Bienvenue sur XUMARI MODZ",
        },
        [SupportedLanguage.Es] = new()
        {
            ["nav.home"] = "Inicio",
            ["action.install"] = "INSTALAR",
            ["action.launch"] = "INICIAR JUEGO",
            ["welcome.title"] = "Bienvenido a XUMARI MODZ",
        },
        [SupportedLanguage.It] = new()
        {
            ["nav.home"] = "Home",
            ["action.install"] = "INSTALLA",
            ["action.launch"] = "AVVIA GIOCO",
            ["welcome.title"] = "Benvenuto in XUMARI MODZ",
        },
        [SupportedLanguage.Pl] = new()
        {
            ["nav.home"] = "Strona główna",
            ["action.install"] = "ZAINSTALUJ",
            ["action.launch"] = "URUCHOM GRĘ",
            ["welcome.title"] = "Witaj w XUMARI MODZ",
        },
        [SupportedLanguage.Tr] = new()
        {
            ["nav.home"] = "Ana Sayfa",
            ["action.install"] = "YÜKLE",
            ["action.launch"] = "OYUNU BAŞLAT",
            ["welcome.title"] = "XUMARI MODZ'a Hoş Geldiniz",
        },
        [SupportedLanguage.Nl] = new()
        {
            ["nav.home"] = "Home",
            ["action.install"] = "INSTALLEREN",
            ["action.launch"] = "SPEL STARTEN",
            ["welcome.title"] = "Welkom bij XUMARI MODZ",
        },
    };

    private readonly ISettingsService _settings;
    public SupportedLanguage CurrentLanguage => _settings.Settings.Language;

    public LocalizationService(ISettingsService settings) => _settings = settings;

    public string GetString(string key)
    {
        if (Strings.TryGetValue(CurrentLanguage, out var lang) && lang.TryGetValue(key, out var value))
            return value;
        if (Strings[SupportedLanguage.En].TryGetValue(key, out var fallback))
            return fallback;
        return key;
    }

    public async Task SetLanguageAsync(SupportedLanguage language, CancellationToken ct = default)
    {
        await _settings.UpdateAsync(s => s with { Language = language }, ct);
    }
}
