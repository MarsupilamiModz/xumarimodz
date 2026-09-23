using XumariModz.Launcher.Core.Enums;

namespace XumariModz.Launcher.Core;

public static class SupportedGames
{
    public static class Slugs
    {
        // GTA V — Singleplayer Mods
        public const string GtaV = "gta-v";
        public const string GtaVRedux = "gta-v-redux";
        public const string GtaVEnhanced = "gta-v-enhanced";

        // GTA V RP
        public const string FiveM = "fivem";
        public const string RageMP = "ragemp";

        public const string Minecraft = "minecraft";
        public const string MinecraftForge = "minecraft-forge";
        public const string MinecraftFabric = "minecraft-fabric";
        public const string MinecraftNeoForge = "minecraft-neoforge";
        public const string LS22 = "farming-simulator-22";
        public const string LS25 = "farming-simulator-25";
        public const string ArkEvolved = "ark-survival-evolved";
        public const string ArkAscended = "ark-survival-ascended";
        public const string Sims4 = "sims-4";
        public const string Sims5 = "sims-5";
        public const string ATS = "american-truck-simulator";
        public const string ETS2 = "euro-truck-simulator-2";
        public const string Rust = "rust";
        public const string Hytale = "hytale";
    }

    public static class Categories
    {
        public const string GtaVMods = "gta-v-mods";
        public const string GtaVRp = "gta-v-rp";
        public const string Minecraft = "minecraft";
        public const string FarmingSim = "farming-simulator";
        public const string Ark = "ark";
        public const string Sims = "sims";
        public const string Scs = "scs-software";
        public const string Other = "other";
    }

    public static readonly IReadOnlyDictionary<string, GameDefinition> Registry = new Dictionary<string, GameDefinition>
    {
        [Slugs.GtaV] = new("Grand Theft Auto V", "GTA5.exe", ["Steam", "EpicGames", "RockstarGames"], Category: Categories.GtaVMods),
        [Slugs.GtaVRedux] = new("GTA V Redux", "GTA5.exe", ["Steam", "EpicGames", "RockstarGames"], Category: Categories.GtaVMods, ParentSlug: Slugs.GtaV),
        [Slugs.GtaVEnhanced] = new("GTA V Enhanced", "GTA5.exe", ["Steam", "RockstarGames"], Category: Categories.GtaVMods, ParentSlug: Slugs.GtaV),
        [Slugs.FiveM] = new("FiveM", "FiveM.exe", ["Custom"], Category: Categories.GtaVRp),
        [Slugs.RageMP] = new("RageMP", "ragemp_v.exe", ["Custom"], Category: Categories.GtaVRp),
        [Slugs.Minecraft] = new("Minecraft", "minecraft.exe", ["MicrosoftStore", "Custom"], Category: Categories.Minecraft),
        [Slugs.MinecraftForge] = new("Minecraft Forge", "minecraft.exe", ["MicrosoftStore", "Custom"], Category: Categories.Minecraft, ParentSlug: Slugs.Minecraft),
        [Slugs.MinecraftFabric] = new("Minecraft Fabric", "minecraft.exe", ["MicrosoftStore", "Custom"], Category: Categories.Minecraft, ParentSlug: Slugs.Minecraft),
        [Slugs.MinecraftNeoForge] = new("Minecraft NeoForge", "minecraft.exe", ["MicrosoftStore", "Custom"], Category: Categories.Minecraft, ParentSlug: Slugs.Minecraft),
        [Slugs.LS22] = new("Farming Simulator 22", "FarmingSimulator2022.exe", ["Steam", "EpicGames"], Category: Categories.FarmingSim),
        [Slugs.LS25] = new("Farming Simulator 25", "FarmingSimulator2025.exe", ["Steam", "EpicGames"], Category: Categories.FarmingSim),
        [Slugs.ArkEvolved] = new("ARK: Survival Evolved", "ShooterGame.exe", ["Steam", "EpicGames"], Category: Categories.Ark),
        [Slugs.ArkAscended] = new("ARK: Survival Ascended", "ArkAscended.exe", ["Steam"], Category: Categories.Ark),
        [Slugs.Sims4] = new("The Sims 4", "TS4.exe", ["Steam", "EpicGames", "EA"], Category: Categories.Sims),
        [Slugs.Sims5] = new("The Sims 5", "TS5.exe", ["EA"], Category: Categories.Sims, IsFuture: true),
        [Slugs.ATS] = new("American Truck Simulator", "amtrucks.exe", ["Steam"], Category: Categories.Scs),
        [Slugs.ETS2] = new("Euro Truck Simulator 2", "eurotrucks2.exe", ["Steam"], Category: Categories.Scs),
        [Slugs.Rust] = new("Rust", "RustClient.exe", ["Steam"], Category: Categories.Other),
        [Slugs.Hytale] = new("Hytale", "Hytale.exe", ["Custom"], Category: Categories.Other, IsFuture: true),
    };

    /// <summary>GTA V Mod-Kategorien — inkl. Redux unter „GTA V Mods“, nicht als separater Launcher-Bereich.</summary>
    public static readonly IReadOnlyList<GtaCategoryDefinition> GtaVModCategories =
    [
        new(GtaModCategory.Redux, "Redux & Visual Overhauls", "gta-v-redux"),
        new(GtaModCategory.Graphics, "Grafikmods", "graphics"),
        new(GtaModCategory.Vehicles, "Fahrzeugmods", "vehicles"),
        new(GtaModCategory.Sounds, "Soundmods", "sounds"),
        new(GtaModCategory.Scripts, "Scriptmods", "scripts"),
        new(GtaModCategory.Weapons, "Waffenmods", "weapons"),
        new(GtaModCategory.Characters, "Charaktermods", "characters"),
        new(GtaModCategory.Realism, "Realismusmods", "realism"),
    ];

    public static readonly IReadOnlyList<GtaRpCategoryDefinition> GtaVRpCategories =
    [
        new(GtaRpPlatform.FiveM, GtaRpModType.ServerPack, "FiveM Server Packs", "fivem-server-packs"),
        new(GtaRpPlatform.FiveM, GtaRpModType.Graphics, "FiveM Grafikmods", "fivem-graphics"),
        new(GtaRpPlatform.FiveM, GtaRpModType.RpExtension, "FiveM RP Erweiterungen", "fivem-rp"),
        new(GtaRpPlatform.RageMP, GtaRpModType.ServerPack, "RageMP Server Packs", "ragemp-server-packs"),
        new(GtaRpPlatform.RageMP, GtaRpModType.RpExtension, "RageMP RP Erweiterungen", "ragemp-rp"),
        new(GtaRpPlatform.RageMP, GtaRpModType.ClientExtension, "RageMP Client Erweiterungen", "ragemp-client"),
    ];
}

public sealed record GameDefinition(
    string DisplayName,
    string ExecutableName,
    IReadOnlyList<string> SupportedSources,
    string Category,
    string? ParentSlug = null,
    bool IsFuture = false
);

public sealed record GtaCategoryDefinition(GtaModCategory Category, string DisplayName, string PlatformSlug);
public sealed record GtaRpCategoryDefinition(GtaRpPlatform Platform, GtaRpModType ModType, string DisplayName, string PlatformSlug);

public static class PremiumLimits
{
    public static long GetDownloadSpeedBytesPerSecond(PremiumTier tier) => tier switch
    {
        PremiumTier.PremiumLite => 3 * 1024 * 1024,
        PremiumTier.Premium => long.MaxValue,
        PremiumTier.PremiumMax => long.MaxValue,
        _ => 1 * 1024 * 1024
    };

    public static bool HasEarlyAccess(PremiumTier tier) =>
        tier is PremiumTier.Premium or PremiumTier.PremiumMax;

    public static bool IsAdFree(PremiumTier tier) =>
        tier is not PremiumTier.Free;
}
