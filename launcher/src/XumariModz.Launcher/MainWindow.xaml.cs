using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using XumariModz.Launcher.Core.Interfaces;
using XumariModz.Launcher.ViewModels;
using XumariModz.Launcher.Views;

namespace XumariModz.Launcher;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        var overlay = App.Host.Services.GetRequiredService<IInstallOverlayService>();
        InstallOverlay.Bind(overlay);

        NavView.SelectedItem = NavView.MenuItems[0];
        ContentFrame.Navigate(typeof(HomePage));

        Closed += (_, _) => App.Host.StopAsync();
    }

    private void NavView_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.SelectedItem is not NavigationViewItem item) return;

        var pageType = item.Tag?.ToString() switch
        {
            "home" => typeof(HomePage),
            "library" => typeof(LibraryPage),
            "games" => typeof(GamesPage),
            "downloads" => typeof(DownloadsPage),
            "security" => typeof(SecurityPage),
            "profile" => typeof(ProfilePage),
            "settings" => typeof(SettingsPage),
            _ => typeof(HomePage)
        };

        ContentFrame.Navigate(pageType, null, new SuppressNavigationTransitionInfo());
    }
}
