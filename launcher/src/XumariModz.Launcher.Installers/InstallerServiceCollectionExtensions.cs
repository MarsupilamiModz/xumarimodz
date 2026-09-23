using Microsoft.Extensions.DependencyInjection;
using XumariModz.Launcher.Core.Interfaces;
using XumariModz.Launcher.Installers.Games;
using XumariModz.Launcher.Installers.Generic;

namespace XumariModz.Launcher.Installers;

public static class InstallerServiceCollectionExtensions
{
    public static IServiceCollection AddModInstallers(this IServiceCollection services)
    {
        services.AddSingleton<IModInstaller, GtaVReduxInstaller>();
        services.AddSingleton<IModInstaller, GtaVModsInstaller>();
        services.AddSingleton<IModInstaller, GtaVRpInstaller>();
        services.AddSingleton<IModInstaller, MinecraftInstaller>();
        services.AddSingleton<IModInstaller, FarmingSimulatorInstaller>();
        services.AddSingleton<IModInstaller, ArkInstaller>();
        services.AddSingleton<IModInstaller, SimsInstaller>();
        services.AddSingleton<IModInstaller, AtsInstaller>();
        services.AddSingleton<IModInstaller, Ets2Installer>();
        services.AddSingleton<IModInstaller, GenericModInstaller>();
        return services;
    }
}
