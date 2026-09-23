using Microsoft.Extensions.DependencyInjection;
using XumariModz.Launcher.Core.Dependencies;
using XumariModz.Launcher.Core.Interfaces;
using XumariModz.Launcher.Services.Auth;
using XumariModz.Launcher.Services.Backup;
using XumariModz.Launcher.Services.Detection;
using XumariModz.Launcher.Services.Downloads;
using XumariModz.Launcher.Services.Launch;
using XumariModz.Launcher.Services.Mods;
using XumariModz.Launcher.Services.Platform;
using XumariModz.Launcher.Services.Security;
using XumariModz.Launcher.Services.Settings;
using XumariModz.Launcher.Services.Sync;
using XumariModz.Launcher.Services.Dependencies;
using XumariModz.Launcher.Services.Theme;
using XumariModz.Launcher.Services.UI;
using XumariModz.Launcher.Services.Updates;

namespace XumariModz.Launcher.Services;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddLauncherServices(this IServiceCollection services)
    {
        services.AddHttpClient<IPlatformApiClient, PlatformApiClient>();
        services.AddSingleton<ISettingsService, SettingsService>();
        services.AddSingleton<IGameDetectionService, GameDetectionService>();
        services.AddSingleton<IDownloadService, DownloadService>();
        services.AddSingleton<ISecurityScanner, SecurityScanner>();
        services.AddSingleton<IBackupService, BackupService>();
        services.AddSingleton<IModManagerService, ModManagerService>();
        services.AddSingleton<IGameLaunchService, GameLaunchService>();
        services.AddSingleton<IRealtimeSyncService, RealtimeSyncService>();
        services.AddSingleton<IAutoUpdateService, AutoUpdateService>();
        services.AddSingleton<IOAuthService, OAuthService>();
        services.AddSingleton<IThemeService, ThemeService>();
        services.AddSingleton<IInstallOverlayService, InstallOverlayService>();
        services.AddSingleton<LocalizationService>();
        services.AddSingleton<ILocalizationService>(sp => sp.GetRequiredService<LocalizationService>());
        services.AddHttpClient();

        services.AddDependencySystem();

        return services;
    }

    public static async Task InitializeLauncherServicesAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await services.GetRequiredService<IDependencyRegistry>().LoadAsync(ct);
    }
}
