using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.UI.Xaml;
using XumariModz.Launcher.Core.Interfaces;
using XumariModz.Launcher.Helpers;
using XumariModz.Launcher.Installers;
using XumariModz.Launcher.Services;
using XumariModz.Launcher.Services.Auth;
using XumariModz.Launcher.ViewModels;
using XumariModz.Launcher.Views;

namespace XumariModz.Launcher;

public partial class App : Application
{
    private Window? _window;
    public static IHost Host { get; private set; } = null!;

    public App()
    {
        Host = Microsoft.Extensions.Hosting.Host.CreateDefaultBuilder()
            .ConfigureServices(services =>
            {
                services.AddLauncherServices();
                services.AddModInstallers();
                services.AddHttpClient();

                services.AddSingleton<MainViewModel>();
                services.AddTransient<HomeViewModel>();
                services.AddTransient<LibraryViewModel>();
                services.AddTransient<GamesViewModel>();
                services.AddTransient<DownloadsViewModel>();
                services.AddTransient<SettingsViewModel>();
                services.AddTransient<ProfileViewModel>();
                services.AddTransient<ModDetailViewModel>();
                services.AddTransient<SecurityViewModel>();
                services.AddTransient<UpdateViewModel>();
            })
            .Build();

        InitializeComponent();
    }

    protected override async void OnLaunched(LaunchActivatedEventArgs args)
    {
        await Host.StartAsync();

        var settings = Host.Services.GetRequiredService<ISettingsService>();
        await settings.LoadAsync();
        await Host.Services.InitializeLauncherServicesAsync();

        var theme = Host.Services.GetRequiredService<IThemeService>();
        theme.ThemeChanged += (_, _) => ThemeHelper.SwitchThemeResource(this, theme.CurrentTheme, theme.IsDarkMode);
        ThemeHelper.SwitchThemeResource(this, theme.CurrentTheme, theme.IsDarkMode);

        var oauth = Host.Services.GetRequiredService<IOAuthService>();
        await oauth.RegisterOAuthCallbackAsync();
        HandleOAuthActivation(args);

        var modManager = Host.Services.GetRequiredService<IModManagerService>();
        await modManager.LoadStateAsync();

        var sync = Host.Services.GetRequiredService<IRealtimeSyncService>();
        _ = sync.ConnectAsync();

        if (settings.Settings.AutoUpdateLauncher)
        {
            var updater = Host.Services.GetRequiredService<IAutoUpdateService>();
            _ = updater.CheckForUpdatesAsync();
        }

        _window = new MainWindow();
        ThemeHelper.TryApplyMica(_window);
        _window.Activate();
    }

    private void HandleOAuthActivation(LaunchActivatedEventArgs args)
    {
        var cmdArgs = Environment.GetCommandLineArgs();
        foreach (var arg in cmdArgs)
        {
            if (arg.StartsWith("xumarimodz://", StringComparison.OrdinalIgnoreCase))
            {
                var oauth = Host.Services.GetRequiredService<OAuthService>();
                oauth.HandleCallbackUri(new Uri(arg));
                break;
            }
        }
    }
}
