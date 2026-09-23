import { getAppUrl } from "@/lib/app-url";

export const SITE = {
  name: "XumariModz",
  shortName: "Xumari Modz",
  tagline: "Premium mods marketplace for serious gamers",
  description:
    "Discover, download, and support premium mods for GTA V, FiveM, Minecraft, ETS2, BeamNG, Assetto Corsa and more on Xumari Modz.",
  url: getAppUrl(),
  discord: "https://discord.gg/xumarimodz",
  twitter: "https://twitter.com/xumarimodz",
  // Muss bg-base aus src/styles/tokens.css entsprechen (Meta-Tag braucht einen festen Wert).
  themeColor: "#121212",
} as const;
